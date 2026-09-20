import path from 'node:path';
import type { RebrickableSetResponse } from '../../shared/types.js';
import type {
  EnrichmentBackend,
  EnrichmentResult,
  SetContext,
} from './types.js';
import { getCachedJson, setCachedJson, ensureCacheDir } from './cache.js';

// Fallback metadata for starter/sample sets when no API key is provided
const FALLBACK_METADATA: Record<string, { name: string; year: number; theme: string; pieces: number }> = {
  '10497': { name: 'Galaxy Explorer', year: 2022, theme: 'Classic Space / Icons', pieces: 1254 },
  '75192': { name: 'Millennium Falcon', year: 2017, theme: 'Star Wars / UCS', pieces: 7541 },
  '92176': { name: 'NASA Apollo Saturn V', year: 2020, theme: 'NASA / Ideas', pieces: 1969 },
  '10316': { name: 'The Lord of the Rings: Rivendell', year: 2023, theme: 'Icons / LOTR', pieces: 6167 },
  '21309': { name: 'NASA Apollo Saturn V', year: 2017, theme: 'NASA / Ideas', pieces: 1969 },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RebrickableBackendOptions {
  apiKey?: string;
  cacheDir?: string;
}

export class RebrickableBackend implements EnrichmentBackend {
  readonly name = 'rebrickable';
  private readonly apiKey?: string;
  private readonly cacheDir: string;
  private readonly themeCache = new Map<number, string>();

  constructor(options: RebrickableBackendOptions = {}) {
    this.apiKey = options.apiKey;
    this.cacheDir = options.cacheDir || path.resolve(process.cwd(), 'data/cache/rebrickable');
    ensureCacheDir(this.cacheDir);
  }

  init(): void {
    if (this.apiKey) {
      console.log(`ℹ️  [Rebrickable] API key detected. Live metadata enrichment enabled.`);
    } else {
      console.log(`ℹ️  [Rebrickable] No REBRICKABLE_API_KEY detected in .env. Using cached and fallback metadata.`);
      console.log(`   Get a free API key at https://rebrickable.com/api/ to enable full live metadata enrichment.`);
    }
  }

  async enrich(context: SetContext): Promise<EnrichmentResult | null> {
    const { cleanId, setNum } = context;

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

    // Fallback dictionary for known sample sets
    if (FALLBACK_METADATA[cleanId]) {
      const fb = FALLBACK_METADATA[cleanId];
      return {
        name: fb.name,
        year: fb.year,
        theme: fb.theme,
        pieces: fb.pieces,
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
      const res = await fetch(`https://rebrickable.com/api/v3/lego/themes/${themeId}/`, {
        headers: { Authorization: `key ${this.apiKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { name: string };
        setCachedJson(this.cacheDir, cacheKey, data);
        this.themeCache.set(themeId, data.name);
        return data.name;
      }
    } catch (err) {
      console.warn(`[Warning] [Rebrickable] Could not fetch theme ${themeId}:`, err);
    }
    return undefined;
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

    // Network fetch with retry on 429 rate limit
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
          headers: { Authorization: `key ${this.apiKey}` },
        });

        if (res.status === 429) {
          console.warn(`[Rate Limit] [Rebrickable] 429 for set ${setNum}, backing off ${attempt * 1500}ms...`);
          await sleep(attempt * 1500);
          continue;
        }

        if (!res.ok) {
          console.warn(`[Warning] [Rebrickable] API returned ${res.status} for set ${setNum}`);
          return {};
        }

        const data = (await res.json()) as RebrickableSetResponse;
        setCachedJson(this.cacheDir, cacheKey, data);
        let theme: string | undefined;
        if (data.theme_id) {
          theme = await this.fetchTheme(data.theme_id);
        }
        return { data, theme };
      } catch (err) {
        console.warn(`[Error] [Rebrickable] API error for set ${setNum} (attempt ${attempt}):`, err);
        if (attempt < 3) await sleep(1000);
      }
    }
    return {};
  }
}
