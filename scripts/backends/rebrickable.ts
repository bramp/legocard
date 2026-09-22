import path from 'node:path';
import type { RebrickableSetResponse } from '../../shared/types.js';
import type {
  EnrichmentBackend,
  EnrichmentResult,
  SetContext,
} from './types.js';
import { getCachedJson, setCachedJson, ensureCacheDir } from './cache.js';
import { createHttpClient, type KyInstance, HTTPError } from './http-client.js';

export interface RebrickableBackendOptions {
  apiKey?: string;
  cacheDir?: string;
  httpClient?: KyInstance;
}

export class RebrickableBackend implements EnrichmentBackend {
  readonly name = 'rebrickable';
  private readonly apiKey?: string;
  private readonly cacheDir: string;
  private readonly httpClient: KyInstance;
  private readonly themeCache = new Map<number, string>();

  constructor(options: RebrickableBackendOptions = {}) {
    this.apiKey = options.apiKey;
    this.cacheDir = options.cacheDir || path.resolve(process.cwd(), 'data/cache/rebrickable');
    ensureCacheDir(this.cacheDir);
    const baseClient = options.httpClient || createHttpClient();
    this.httpClient = this.apiKey
      ? baseClient.extend({ headers: { Authorization: `key ${this.apiKey}` } })
      : baseClient;
  }

  init(): void {
    if (this.apiKey) {
      console.log(`ℹ️  [Rebrickable] API key detected. Live metadata enrichment enabled.`);
    } else {
      console.log(`ℹ️  [Rebrickable] No REBRICKABLE_API_KEY detected in .env. Checking local cache only.`);
      console.log(`   Get a free API key at https://rebrickable.com/api/ to enable full live metadata enrichment.`);
    }
  }

  async enrich(context: SetContext): Promise<EnrichmentResult | null> {
    const { cleanId: _cleanId, setNum } = context;

    let setData: RebrickableSetResponse | null = null;
    let themeName: string | undefined;

    if (this.apiKey) {
      const res = await this.fetchSet(setNum);
      setData = res.data || null;
      themeName = res.theme;
    } else {
      // Check local cache even if no API key is configured
      const cached = getCachedJson<RebrickableSetResponse>(this.cacheDir, `set_${setNum}.json`);
      if (cached && cached.name) {
        setData = cached;
        if (cached.theme_id) {
          const cachedTheme = getCachedJson<{ name: string }>(this.cacheDir, `theme_${cached.theme_id}.json`);
          themeName = cachedTheme?.name;
        }
      }
    }

    if (setData) {
      return {
        name: setData.name,
        year: setData.year,
        pieces: setData.num_parts,
        imageUrl: setData.set_img_url || undefined,
        theme: themeName,
      };
    }

    return null;
  }

  private async fetchTheme(themeId: number): Promise<string | undefined> {
    if (this.themeCache.has(themeId)) {
      return this.themeCache.get(themeId);
    }

    const cacheKey = `theme_${themeId}.json`;
    const cached = getCachedJson<{ name: string }>(this.cacheDir, cacheKey);
    if (cached && cached.name) {
      this.themeCache.set(themeId, cached.name);
      return cached.name;
    }

    if (!this.apiKey) return undefined;

    try {
      const data = await this.httpClient
        .get(`https://rebrickable.com/api/v3/lego/themes/${themeId}/`)
        .json<{ name: string }>();
      setCachedJson(this.cacheDir, cacheKey, data);
      this.themeCache.set(themeId, data.name);
      return data.name;
    } catch (err) {
      if (err instanceof HTTPError) {
        console.warn(`[Warning] [Rebrickable] Could not fetch theme ${themeId}: HTTP ${err.response.status}`);
      } else {
        console.warn(`[Warning] [Rebrickable] Could not fetch theme ${themeId}:`, err);
      }
      return undefined;
    }
  }

  private async fetchSet(
    setNum: string
  ): Promise<{ data?: RebrickableSetResponse; theme?: string }> {
    const cacheKey = `set_${setNum}.json`;
    const cached = getCachedJson<RebrickableSetResponse>(this.cacheDir, cacheKey);
    if (cached && cached.name) {
      let theme: string | undefined;
      if (cached.theme_id) {
        theme = await this.fetchTheme(cached.theme_id);
      }
      return { data: cached, theme };
    }

    if (!this.apiKey) return {};

    try {
      const data = await this.httpClient
        .get(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`)
        .json<RebrickableSetResponse>();

      setCachedJson(this.cacheDir, cacheKey, data);
      let theme: string | undefined;
      if (data.theme_id) {
        theme = await this.fetchTheme(data.theme_id);
      }
      return { data, theme };
    } catch (err) {
      if (err instanceof HTTPError) {
        console.warn(`[Warning] [Rebrickable] API returned ${err.response.status} for set ${setNum}`);
      } else {
        console.warn(`[Error] [Rebrickable] API error for set ${setNum}:`, err);
      }
      return {};
    }
  }
}
