import path from 'node:path';
import type {
  BricksetApiResponse,
  BricksetLegoComRegion,
  BricksetSet,
  LegoDimensions,
} from '../../shared/types.js';
import type {
  EnrichmentBackend,
  EnrichmentResult,
  SetContext,
} from './types.js';
import { getCachedJson, setCachedJson, ensureCacheDir } from './cache.js';
import { SITE_CONFIG } from '../../shared/config.js';
import { createHttpClient, type KyInstance, HTTPError } from './http-client.js';

export function parseBricksetDate(isoString: string | undefined): { year: number; dateStr: string } | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = d.getUTCDate();
  return {
    year,
    dateStr: `${month} ${day}, ${year}`,
  };
}

export interface BricksetBackendOptions {
  apiKey?: string;
  cacheDir?: string;
  httpClient?: KyInstance;
}

export class BricksetBackend implements EnrichmentBackend {
  readonly name = 'brickset';
  private readonly apiKey?: string;
  private readonly cacheDir: string;
  private readonly httpClient: KyInstance;

  constructor(options: BricksetBackendOptions = {}) {
    this.apiKey = options.apiKey;
    this.cacheDir = options.cacheDir || path.resolve(process.cwd(), 'data/cache/brickset');
    ensureCacheDir(this.cacheDir);
    this.httpClient =
      options.httpClient ||
      createHttpClient({
        headers: {
          'User-Agent': `${SITE_CONFIG.userAgent} (${SITE_CONFIG.siteUrl})`,
        },
      });
  }

  init(): void {
    if (this.apiKey) {
      console.log(`ℹ️  [Brickset] API key detected. Set retirement date and availability enrichment enabled.`);
    } else {
      console.log(
        `ℹ️  [Brickset] No BRICKSET_API_KEY detected in .env. Checking local cache only.`
      );
      console.log(
        `   Get a free API key at https://brickset.com/tools/webservices/v3 to enable retired dates & Brickset metadata enrichment.`
      );
    }
  }

  async enrich(context: SetContext): Promise<EnrichmentResult | null> {
    const { cleanId, setNum } = context;
    const setData = await this.getSet(setNum, cleanId);
    if (!setData) {
      return null;
    }

    // Determine regional LEGOCom availability data (prefer US, then UK, CA, DE, or any region with dates)
    const legoCom = setData.LEGOCom;
    const preferredRegion: BricksetLegoComRegion | undefined =
      legoCom?.US ||
      legoCom?.UK ||
      legoCom?.CA ||
      legoCom?.DE ||
      (legoCom ? Object.values(legoCom).find((r) => r && (r.dateLastAvailable || r.dateFirstAvailable)) : undefined);

    let dateRetired: string | undefined;
    let releaseYear: number | undefined = setData.year || undefined;
    let dateReleased: string | undefined;

    if (preferredRegion?.dateLastAvailable) {
      const parsedRetired = parseBricksetDate(preferredRegion.dateLastAvailable);
      if (parsedRetired) {
        dateRetired = parsedRetired.dateStr;
      }
    }

    if (preferredRegion?.dateFirstAvailable) {
      const parsedReleased = parseBricksetDate(preferredRegion.dateFirstAvailable);
      if (parsedReleased) {
        releaseYear = parsedReleased.year;
        dateReleased = parsedReleased.dateStr;
      }
    }

    // Dimensions in cm
    let dimensions: LegoDimensions | undefined;
    if (setData.dimensions) {
      const { height, width, depth } = setData.dimensions;
      if ((height && height > 0) || (width && width > 0) || (depth && depth > 0)) {
        dimensions = {};
        if (typeof height === 'number' && height > 0) dimensions.height = height;
        if (typeof width === 'number' && width > 0) dimensions.width = width;
        if (typeof depth === 'number' && depth > 0) dimensions.depth = depth;
      }
    }

    // Age formatted as "18+" or "9+"
    let age: string | undefined;
    if (setData.ageRange?.min) {
      age = `${setData.ageRange.min}+`;
    }

    // Theme with optional subtheme
    let theme: string | undefined = setData.theme;
    if (theme && setData.subtheme && !theme.includes(setData.subtheme)) {
      theme = `${theme} / ${setData.subtheme}`;
    }

    const instructionBooks =
      typeof setData.instructionsCount === 'number' && setData.instructionsCount > 0
        ? setData.instructionsCount
        : undefined;

    const rating = typeof setData.rating === 'number' && setData.rating > 0 ? setData.rating : undefined;
    const imageUrl = setData.image?.imageURL || setData.image?.thumbnailURL || undefined;

    // GWP (Gift with Purchase) detection & notes
    const tags = Array.isArray(setData.extendedData?.tags) ? (setData.extendedData.tags as string[]) : [];
    const isGwp =
      setData.availability === 'LEGO Gift with Purchase' ||
      tags.some((t) => typeof t === 'string' && /gift with purchase/i.test(t));

    let gwpDescription: string | undefined;
    let gwpWithSetNumber: string | undefined;

    if (isGwp && typeof setData.extendedData?.notes === 'string') {
      const notesStr = setData.extendedData.notes.trim();
      const firstLine = notesStr.split('\n')[0].trim();
      if (firstLine) {
        gwpDescription = firstLine;
      }
      const match = notesStr.match(/Free with qualifying purchases of (\d{4,6})(?:\s+([^,]+?))?\s+at LEGO\.com/i);
      if (match) {
        gwpWithSetNumber = match[1];
      }
    }

    return {
      name: setData.name,
      year: releaseYear || setData.year,
      dateReleased,
      dateRetired,
      isGwp: isGwp || undefined,
      gwpDescription,
      gwpWithSetNumber,
      theme,
      pieces: setData.pieces,
      age,
      dimensions,
      instructionBooks,
      rating,
      imageUrl,
    };
  }

  private async queryBrickset(params: Record<string, string>): Promise<BricksetApiResponse | null> {
    if (!this.apiKey) return null;

    const bodyParams = new URLSearchParams({
      apiKey: this.apiKey,
      userHash: '',
      params: JSON.stringify(params),
    });

    try {
      const data = await this.httpClient
        .post('https://brickset.com/api/v3.asmx/getSets', {
          body: bodyParams,
        })
        .json<BricksetApiResponse>();

      if (data.status === 'error') {
        console.warn(`[Warning] [Brickset] API error: ${data.message || 'Unknown error'}`);
        return null;
      }

      return data;
    } catch (err) {
      if (err instanceof HTTPError) {
        console.warn(`[Warning] [Brickset] API returned HTTP ${err.response.status}`);
      } else {
        console.warn(`[Error] [Brickset] Request failed:`, err);
      }
      return null;
    }
  }

  private async getSet(setNum: string, cleanId: string): Promise<BricksetSet | null> {
    const cacheKey = `set_${setNum}.json`;
    const cached = getCachedJson<BricksetSet>(this.cacheDir, cacheKey);
    if (cached && cached.name) {
      return cached;
    }

    if (!this.apiKey) {
      return null;
    }

    // 1. Fetch by set number (e.g. "10234-1")
    const data = await this.queryBrickset({ setNumber: setNum });
    if (data?.sets && data.sets.length > 0) {
      const matchedSet = data.sets[0];
      setCachedJson(this.cacheDir, cacheKey, matchedSet);
      return matchedSet;
    }

    // 2. If no match and cleanId !== setNum, fallback query by cleanId
    if (data && data.matches === 0 && cleanId !== setNum) {
      const fallbackData = await this.queryBrickset({ query: cleanId });
      if (fallbackData?.status === 'success' && fallbackData.sets && fallbackData.sets.length > 0) {
        const matched = fallbackData.sets.find((s) => s.number === cleanId) || fallbackData.sets[0];
        setCachedJson(this.cacheDir, cacheKey, matched);
        return matched;
      }
    }

    return null;
  }
}
