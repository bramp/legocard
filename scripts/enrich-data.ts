import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import type {
  CsvLegoRecord,
  EnrichedLegoSet,
  LegoDimensions,
  LegoInstructionPdf,
  RebrickableSetResponse,
} from '../shared/types.js';
import { formatBuildTime } from '../shared/format.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'sets.csv');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const CACHE_DIR = path.join(DATA_DIR, 'cache', 'rebrickable');
const LEGO_CACHE_DIR = path.join(DATA_DIR, 'cache', 'lego');

function resolveLegoDataDir(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--lego-data-dir=')) {
      return path.resolve(arg.split('=')[1]);
    }
    if (arg === '--lego-data-dir' && i + 1 < args.length) {
      return path.resolve(args[i + 1]);
    }
  }

  const envDir = process.env.LEGO_DATA_DIR || process.env.LEGO_INSTRUCTIONS_DIR;
  if (envDir && envDir.trim()) {
    return path.resolve(envDir.trim());
  }

  return undefined;
}

const resolvedLegoDataDir = resolveLegoDataDir();

const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY;

// Ensure cache directories exist
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(LEGO_CACHE_DIR, { recursive: true });

interface LegoMetadata {
  set?: string;
  locale?: string;
  name?: string;
  theme?: string;
  age?: string;
  pieces?: number;
  year?: number;
  set_image_url?: string;
  set_image_alt?: string;
  description?: string;
  features_text?: string;
  meta_description?: string;
  meta_title?: string;
  slug?: string;
  hires_image_url?: string;
  thumbnail_image_url?: string;
  images?: Array<{
    id: string;
    url: string;
  }>;
  videos?: Array<{
    id: string;
    title?: string;
    description?: string;
    url: string;
  }>;
  categories?: string[];
  brand?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
  };
  pdfs?: Array<{
    url: string;
    filename?: string;
    filesize?: number;
    preview_url?: string;
    is_additional_info_booklet?: boolean;
    sequence_number?: number;
    sequence_total?: number;
  }>;
}

function getLegoMetadata(cleanId: string): LegoMetadata | null {
  // If no source directory is provided via --lego-data-dir or env variable, do not fetch this supplemental metadata
  if (!resolvedLegoDataDir) {
    return null;
  }

  const cacheFile = path.join(LEGO_CACHE_DIR, `${cleanId}.json`);
  const sourceFile = path.join(resolvedLegoDataDir, cleanId, 'metadata.json');

  if (fs.existsSync(sourceFile)) {
    try {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      const parsed = JSON.parse(content) as LegoMetadata;
      fs.writeFileSync(cacheFile, JSON.stringify(parsed, null, 2), 'utf-8');
      return parsed;
    } catch {
      // ignore
    }
  }

  // Fallback to cache if source directory is configured but file not found on disk
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as LegoMetadata;
    } catch {
      // ignore
    }
  }

  return null;
}

function getInstructionBooksCount(pdfs?: LegoMetadata['pdfs']): number | undefined {
  if (!pdfs || pdfs.length === 0) return undefined;
  const nonInfo = pdfs.filter((p) => !p.is_additional_info_booklet);
  const seqTotals = pdfs.map((p) => p.sequence_total).filter(Boolean) as number[];
  const maxSeq = seqTotals.length ? Math.max(...seqTotals) : 0;
  return maxSeq || nonInfo.length || pdfs.length || undefined;
}

function parseDimensions(
  metaDimensions?: LegoMetadata['dimensions'],
  record?: Record<string, string>,
  text?: string
): LegoDimensions | undefined {
  // 1. Prefer structured dimensions object directly from LEGO metadata if available
  if (metaDimensions && (metaDimensions.height || metaDimensions.width || metaDimensions.depth)) {
    const result: LegoDimensions = {};
    if (typeof metaDimensions.height === 'number' && metaDimensions.height > 0) result.height = metaDimensions.height;
    if (typeof metaDimensions.width === 'number' && metaDimensions.width > 0) result.width = metaDimensions.width;
    if (typeof metaDimensions.depth === 'number' && metaDimensions.depth > 0) result.depth = metaDimensions.depth;
    if (Object.keys(result).length > 0) return result;
  }

  // 2. Next check spreadsheet columns (Height, Width, Depth)
  let h = record ? parseFloat(record['Height'] || '') : NaN;
  let w = record ? parseFloat(record['Width'] || '') : NaN;
  let d = record ? parseFloat(record['Depth'] || '') : NaN;

  // 3. Fallback: parse dimensions from description / featuresText only if needed
  if ((isNaN(h) || !h) || (isNaN(w) || !w) || (isNaN(d) || !d)) {
    if (text) {
      const hMatch = text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:high|tall|in height)/i) || text.match(/(?:high|tall|height)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
      const wMatch = text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:wide|in width|width)/i) || text.match(/(?:wide|width)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
      const dMatch = text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:deep|long|in depth|in length|depth|length)/i) || text.match(/(?:deep|long|depth|length)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);

      if ((isNaN(h) || !h) && hMatch) h = parseFloat(hMatch[1]);
      if ((isNaN(w) || !w) && wMatch) w = parseFloat(wMatch[1]);
      if ((isNaN(d) || !d) && dMatch) d = parseFloat(dMatch[1]);
    }
  }

  const result: LegoDimensions = {};
  if (!isNaN(h) && h > 0) result.height = h;
  if (!isNaN(w) && w > 0) result.width = w;
  if (!isNaN(d) && d > 0) result.depth = d;

  return Object.keys(result).length > 0 ? result : undefined;
}

function getCachedJson<T>(filename: string): T | null {
  const filePath = path.join(CACHE_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function setCachedJson(filename: string, data: unknown): void {
  const filePath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Cache theme ID -> Theme Name to avoid duplicate network requests
const themeCache = new Map<number, string>();

function parseYear(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const match = String(val).match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

function parsePieces(val: string | number | undefined): number | undefined {
  if (val === undefined || val === null) return undefined;
  const clean = String(val).replace(/,/g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) || num <= 0 ? undefined : num;
}

// Fallback metadata for starter/sample sets when no API key is provided
const FALLBACK_METADATA: Record<string, { name: string; year: number; theme: string; pieces: number }> = {
  '10497': { name: 'Galaxy Explorer', year: 2022, theme: 'Classic Space / Icons', pieces: 1254 },
  '75192': { name: 'Millennium Falcon', year: 2017, theme: 'Star Wars / UCS', pieces: 7541 },
  '92176': { name: 'NASA Apollo Saturn V', year: 2020, theme: 'NASA / Ideas', pieces: 1969 },
  '10316': { name: 'The Lord of the Rings: Rivendell', year: 2023, theme: 'Icons / LOTR', pieces: 6167 },
  '21309': { name: 'NASA Apollo Saturn V', year: 2017, theme: 'NASA / Ideas', pieces: 1969 },
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRebrickableTheme(themeId: number, apiKey: string): Promise<string | undefined> {
  if (themeCache.has(themeId)) {
    return themeCache.get(themeId)!;
  }
  const cacheKey = `theme_${themeId}.json`;
  const cached = getCachedJson<{ name: string }>(cacheKey);
  if (cached && cached.name) {
    themeCache.set(themeId, cached.name);
    return cached.name;
  }

  try {
    const res = await fetch(`https://rebrickable.com/api/v3/lego/themes/${themeId}/`, {
      headers: { Authorization: `key ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json() as { name: string };
      setCachedJson(cacheKey, data);
      themeCache.set(themeId, data.name);
      return data.name;
    }
  } catch (err) {
    console.warn(`[Warning] Could not fetch theme ${themeId}:`, err);
  }
  return undefined;
}

async function fetchRebrickableSet(
  setNum: string,
  apiKey: string
): Promise<{ data?: RebrickableSetResponse; theme?: string }> {
  const cacheKey = `set_${setNum}.json`;
  const cached = getCachedJson<RebrickableSetResponse>(cacheKey);
  if (cached && cached.name) {
    let theme: string | undefined;
    if (cached.theme_id) {
      theme = await fetchRebrickableTheme(cached.theme_id, apiKey);
    }
    return { data: cached, theme };
  }

  // Network fetch with retry on 429 rate limit
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
        headers: { Authorization: `key ${apiKey}` }
      });

      if (res.status === 429) {
        console.warn(`[Rate Limit] Rebrickable 429 for set ${setNum}, backing off ${attempt * 1500}ms...`);
        await sleep(attempt * 1500);
        continue;
      }

      if (!res.ok) {
        console.warn(`[Warning] Rebrickable API returned ${res.status} for set ${setNum}`);
        return {};
      }

      const data = await res.json() as RebrickableSetResponse;
      setCachedJson(cacheKey, data);
      let theme: string | undefined;
      if (data.theme_id) {
        theme = await fetchRebrickableTheme(data.theme_id, apiKey);
      }
      return { data, theme };
    } catch (err) {
      console.warn(`[Error] Rebrickable API error for set ${setNum} (attempt ${attempt}):`, err);
      if (attempt < 3) await sleep(1000);
    }
  }
  return {};
}

async function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`CSV file not found at ${CSV_FILE}`);
    process.exit(1);
  }

  const csvRaw = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = csvRaw.split(/\r?\n/);

  // Locate the header row containing 'Set Number' or 'set_number'
  let headerIdx = lines.findIndex((l) => l.toLowerCase().includes('set number') || l.toLowerCase().includes('set_number'));
  if (headerIdx === -1) {
    headerIdx = 0;
  }

  const validCsv = lines.slice(headerIdx).join('\n');
  const rawRecords = parse(validCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  // Filter records to only those that represent built sets (ignore future / unbuilt sets)
  const records = rawRecords.filter((r) => {
    const rawNum = r['Set Number'] || r['set_number'] || r['SetNumber'] || '';
    const trimmed = rawNum.trim();
    if (!trimmed || !/^\d+(-\d+)?$/.test(trimmed)) return false;

    const datePurchased = (r['Date Purchased'] || '').trim().toLowerCase();
    const yearPurchased = (r['Year Purchased'] || '').trim().toLowerCase();
    const dateFinished = (r['Date Finished'] || '').trim();
    const yearFinished = (r['Year Finished'] || '').trim();
    const timeToBuild = (r['Time to Build'] || r['time_to_build'] || '').trim();

    // Exclude planned / future sets explicitly marked "Future"
    if (datePurchased.includes('future') || yearPurchased.includes('future') || dateFinished.toLowerCase().includes('future')) {
      return false;
    }

    // Must have evidence of being built (Time to Build, Date Finished, or Year Finished)
    const hasBuildEvidence =
      (timeToBuild && !timeToBuild.includes('#REF!')) ||
      (dateFinished && !dateFinished.includes('#REF!')) ||
      (yearFinished && !yearFinished.includes('#REF!'));

    return hasBuildEvidence;
  });

  console.log(`Found ${records.length} built Lego sets in spreadsheet (filtered out unbuilt/future rows).`);

  if (resolvedLegoDataDir) {
    console.log(`ℹ️  Supplemental LEGO metadata directory enabled: ${resolvedLegoDataDir}`);
  } else {
    console.log(`ℹ️  No supplemental LEGO metadata directory specified (set LEGO_DATA_DIR in .env or pass --lego-data-dir=<path>). Skipping supplemental LEGO metadata enrichment.`);
  }

  if (!REBRICKABLE_API_KEY) {
    console.log(`ℹ️  No REBRICKABLE_API_KEY detected in .env. Using CDN images and fallback metadata.`);
    console.log(`   Get a free API key at https://rebrickable.com/api/ to enable full live metadata enrichment.`);
  }

  // Load existing sets.json to preserve any cached data
  const existingSets: Record<string, EnrichedLegoSet> = {};
  if (fs.existsSync(JSON_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];
      for (const s of prev) {
        existingSets[s.id] = s;
      }
    } catch {
      // ignore
    }
  }

  const enrichedSets: EnrichedLegoSet[] = [];

  for (const record of records) {
    const rawSetNum = (record['Set Number'] || record['set_number'] || record['SetNumber'] || '').trim();
    const cleanId = rawSetNum.replace(/-1$/, '');
    const setNum = cleanId.includes('-') ? cleanId : `${cleanId}-1`;
    console.log(`Processing set #${cleanId}...`);

    const previous = existingSets[cleanId] || {};

    // Check local cache / ~/personal/lego-instructions/data for LEGO.com metadata
    const legoMeta = getLegoMetadata(cleanId);
    if (legoMeta) {
      console.log(`  ✓ Supplemented with LEGO.com metadata (age: ${legoMeta.age || '—'}, pieces: ${legoMeta.pieces || '—'}, PDFs: ${legoMeta.pdfs?.length || 0})`);
    }

    let name = record['Name'] || record['name'] || previous.name;
    if (!name && legoMeta?.name) {
      name = legoMeta.name.replace(/[™®]/g, '').trim();
    }

    let theme = record['Category'] || record['category'] || previous.theme;
    if (!theme && legoMeta?.theme) {
      theme = legoMeta.theme.replace(/LEGO®\s*/g, '').trim();
    }

    let pieces = parsePieces(record['Number of Pieces'] || record['pieces']) || legoMeta?.pieces || previous.pieces;

    // Year released / retired from spreadsheet or LEGO metadata
    const csvDateReleased = record['Date Set Released'] || record['date_released'] || previous.dateReleased;
    const csvDateRetired = record['Date Set Retired'] || record['date_retired'] || previous.dateRetired;
    let yearReleased = parseYear(csvDateReleased) || legoMeta?.year || previous.yearReleased;
    let yearRetired = parseYear(csvDateRetired) || previous.yearRetired;

    const age = legoMeta?.age || previous.age;
    const instructions: LegoInstructionPdf[] | undefined = legoMeta?.pdfs?.map((p) => ({
      url: p.url,
      filename: p.filename,
      filesize: p.filesize,
      previewUrl: p.preview_url,
      isAdditionalInfoBooklet: p.is_additional_info_booklet,
      sequenceNumber: p.sequence_number,
      sequenceTotal: p.sequence_total,
    })) || previous.instructions;

    let imageUrl = previous.imageUrl || (legoMeta?.set_image_url ? legoMeta.set_image_url : `https://cdn.rebrickable.com/media/sets/${setNum}.jpg`);

    // 1. Try Rebrickable API (uses local cache in data/cache/rebrickable first)
    if (REBRICKABLE_API_KEY) {
      const apiResult = await fetchRebrickableSet(setNum, REBRICKABLE_API_KEY);
      if (apiResult.data) {
        if (!name) name = apiResult.data.name;
        if (!yearReleased && apiResult.data.year) {
          yearReleased = apiResult.data.year;
        }
        if (!pieces && apiResult.data.num_parts) {
          pieces = apiResult.data.num_parts;
        }
        if (apiResult.data.set_img_url) {
          imageUrl = apiResult.data.set_img_url;
        }
      }
      if (apiResult.theme && !theme) {
        theme = apiResult.theme;
      }
    } else if (FALLBACK_METADATA[cleanId]) {
      const fb = FALLBACK_METADATA[cleanId];
      if (!name) name = fb.name;
      if (!yearReleased) yearReleased = fb.year;
      if (!theme) theme = fb.theme;
      if (!pieces) pieces = fb.pieces;
    }

    if (!name) {
      name = `Lego Set #${cleanId}`;
    }

    // Primary display year: release year, or fallback to previous display year (never hardcode arbitrary defaults)
    const displayYear = yearReleased || previous.year;

    const rawBuildTime = record['Time to Build'] || record['time_to_build'] || record['build_time_hours'];
    let buildTimeHours = previous.buildTimeHours;
    let timeToBuildFormatted = previous.timeToBuildFormatted;
    if (rawBuildTime && !String(rawBuildTime).includes('#REF!')) {
      const trimmedTime = String(rawBuildTime).trim();
      const hmMatch = trimmedTime.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
      if (hmMatch && (hmMatch[1] || hmMatch[2])) {
        const h = parseInt(hmMatch[1] || '0', 10);
        const m = parseInt(hmMatch[2] || '0', 10);
        buildTimeHours = Math.round((h + m / 60) * 100) / 100;
        timeToBuildFormatted = formatBuildTime({ buildTimeHours, timeToBuildFormatted: trimmedTime }) || undefined;
      } else {
        const parsed = parseFloat(trimmedTime);
        if (!isNaN(parsed)) {
          buildTimeHours = parsed;
          timeToBuildFormatted = formatBuildTime(parsed) || undefined;
        }
      }
    } else if (buildTimeHours || timeToBuildFormatted) {
      timeToBuildFormatted = formatBuildTime({ buildTimeHours, timeToBuildFormatted }) || undefined;
    }

    const dateFinished = record['Date Finished'] && !record['Date Finished'].includes('#REF!') ? record['Date Finished'] : undefined;
    const datePurchased = record['Date Purchased'] || undefined;

    // Ratings: only keep if explicitly specified in CSV row (never default to 5)
    const rawRating = record['rating'] ? parseFloat(String(record['rating'])) : undefined;
    const rating = (rawRating && !isNaN(rawRating)) ? rawRating : undefined;

    const featuresText = legoMeta?.features_text || previous.featuresText;
    const description = legoMeta?.description || previous.description;
    const metaDescription = legoMeta?.meta_description || previous.metaDescription;
    const metaTitle = legoMeta?.meta_title || previous.metaTitle;
    const slug = legoMeta?.slug || previous.slug;
    const brand = legoMeta?.brand || previous.brand;
    const categories = legoMeta?.categories || previous.categories;
    const hiresImageUrl = legoMeta?.hires_image_url || previous.hiresImageUrl;
    const thumbnailImageUrl = legoMeta?.thumbnail_image_url || previous.thumbnailImageUrl;
    const images = legoMeta?.images?.map((img) => img.url) || (previous.images?.map((img: any) => typeof img === 'string' ? img : img.url));
    const instructionBooks = getInstructionBooksCount(legoMeta?.pdfs) || previous.instructionBooks;
    const productVideos = legoMeta?.videos?.map((v) => ({
      id: v.id,
      title: v.title || undefined,
      description: v.description || undefined,
      url: v.url,
    })) || previous.productVideos;

    const combinedText = `${featuresText || ''} ${description || ''}`;
    const dimensions = parseDimensions(legoMeta?.dimensions, record, combinedText) || previous.dimensions;

    const enriched: EnrichedLegoSet = {
      id: cleanId,
      setNum,
      name,
      year: displayYear,
      yearReleased,
      yearRetired,
      dateReleased: csvDateReleased || undefined,
      dateRetired: csvDateRetired || undefined,
      theme,
      age,
      pieces,
      instructionBooks,
      rating,
      imageUrl,
      hiresImageUrl,
      thumbnailImageUrl,
      images,
      description,
      featuresText,
      metaDescription,
      metaTitle,
      slug,
      brand,
      categories,
      productVideos,
      dimensions,
      media: {
        audio: previous.media?.audio || (previous.audioPath ? `audio/${cleanId}.mp3` : undefined),
        subtitles: previous.media?.subtitles || (previous.subtitles ? `audio/${cleanId}.json` : undefined),
        video: previous.media?.video || (previous.videoPath ? `videos/${cleanId}.mp4` : undefined),
      },
      audioPath: previous.audioPath,
      subtitles: previous.subtitles,
      narrationText: previous.narrationText,
      videoPath: previous.videoPath,
      buildDate: dateFinished || datePurchased || record['build_date'] || previous.buildDate,
      buildTimeHours,
      timeToBuildFormatted,
      funFacts: record['fun_facts'] || previous.funFacts || '',
      notes: record['Notes'] || record['notes'] || previous.notes,
    };

    enrichedSets.push(enriched);
  }

  // De-duplicate if the same set was logged multiple times (keep the most recent / complete entry)
  const uniqueMap = new Map<string, EnrichedLegoSet>();
  for (const set of enrichedSets) {
    if (!uniqueMap.has(set.id)) {
      uniqueMap.set(set.id, set);
    } else {
      // Merge: prefer whichever has build info or more complete metadata
      const existing = uniqueMap.get(set.id)!;
      const merged: EnrichedLegoSet = {
        ...existing,
        ...set,
        timeToBuildFormatted: existing.timeToBuildFormatted || set.timeToBuildFormatted,
        buildTimeHours: existing.buildTimeHours || set.buildTimeHours,
        buildDate: existing.buildDate || set.buildDate,
        funFacts: existing.funFacts || set.funFacts || '',
        notes: existing.notes || set.notes,
        age: existing.age || set.age,
        instructionBooks: existing.instructionBooks || set.instructionBooks,
        dimensions: existing.dimensions || set.dimensions,
        images: existing.images || set.images,
        hiresImageUrl: existing.hiresImageUrl || set.hiresImageUrl,
        thumbnailImageUrl: existing.thumbnailImageUrl || set.thumbnailImageUrl,
        description: existing.description || set.description,
        featuresText: existing.featuresText || set.featuresText,
        metaDescription: existing.metaDescription || set.metaDescription,
        metaTitle: existing.metaTitle || set.metaTitle,
        slug: existing.slug || set.slug,
        brand: existing.brand || set.brand,
        categories: existing.categories || set.categories,
        productVideos: existing.productVideos || set.productVideos,
      };
      uniqueMap.set(set.id, merged);
    }
  }

  const finalSets = Array.from(uniqueMap.values());

  // Sort sets numerically by set number
  finalSets.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  fs.writeFileSync(JSON_FILE, JSON.stringify(finalSets, null, 2), 'utf-8');
  console.log(`\n🎉 Enriched data successfully written to ${JSON_FILE} (${finalSets.length} sets).`);
}

main().catch((err) => {
  console.error('Fatal enrichment error:', err);
  process.exit(1);
});
