import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import type {
  EnrichedLegoSet,
  LegoDimensions,
} from '../shared/types.js';
import { formatBuildTime } from '../shared/format.js';
import { getCachedJson } from './backends/cache.js';
import {
  createDefaultBackends,
  type EnrichmentResult,
} from './backends/index.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'sets.csv');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const GEMINI_CACHE_DIR = path.join(DATA_DIR, 'cache', 'gemini');

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

  const envDir = process.env.LEGO_DATA_DIR;
  if (envDir && envDir.trim()) {
    return path.resolve(envDir.trim());
  }

  return undefined;
}

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

export function parseRating(val: string | number | null | undefined): number | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  if (!str || str.startsWith('#')) return undefined;

  const fractionMatch = str.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den > 0) {
      if (den === 5) return num;
      if (den === 10) return Math.round((num / 2) * 10) / 10;
      return Math.round((num / den) * 5 * 10) / 10;
    }
  }

  const clean = str.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) || num < 0 ? undefined : num;
}

export function getRecordField(record: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (record[key] !== undefined && record[key].trim() !== '') {
      return record[key].trim();
    }
  }
  // Case-insensitive fallback
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [k, v] of Object.entries(record)) {
    if (lowerKeys.includes(k.trim().toLowerCase()) && v.trim() !== '') {
      return v.trim();
    }
  }
  return undefined;
}

function parseDimensionsFromRecord(
  record: Record<string, string>,
  text?: string
): LegoDimensions | undefined {
  let h = parseFloat(record['Height'] || '');
  let w = parseFloat(record['Width'] || '');
  let d = parseFloat(record['Depth'] || '');

  if ((isNaN(h) || !h) || (isNaN(w) || !w) || (isNaN(d) || !d)) {
    if (text) {
      const hMatch =
        text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:high|tall|in height)/i) ||
        text.match(/(?:high|tall|height)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
      const wMatch =
        text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:wide|in width|width)/i) ||
        text.match(/(?:wide|width)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
      const dMatch =
        text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:deep|long|in depth|in length|depth|length)/i) ||
        text.match(/(?:deep|long|depth|length)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);

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

async function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`CSV file not found at ${CSV_FILE}`);
    process.exit(1);
  }

  const resolvedLegoDataDir = resolveLegoDataDir();
  const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY;
  const BRICKSET_API_KEY = process.env.BRICKSET_API_KEY;

  // Initialize modular backends (LEGO.com metadata, Rebrickable, Brickset)
  const backends = createDefaultBackends({
    legoDataDir: resolvedLegoDataDir,
    rebrickableApiKey: REBRICKABLE_API_KEY,
    bricksetApiKey: BRICKSET_API_KEY,
  });

  for (const backend of backends) {
    await backend.init?.();
  }

  const csvRaw = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = csvRaw.split(/\r?\n/);

  // Locate the header row containing 'Set Number' or 'set_number'
  let headerIdx = lines.findIndex(
    (l) => l.toLowerCase().includes('set number') || l.toLowerCase().includes('set_number')
  );
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
    const ratingBuild = (getRecordField(r, 'Rating (Build)', 'rating_build', 'ratingBuild', 'Build Rating') || '').trim();
    const ratingLooks = (getRecordField(r, 'Rating (Looks)', 'rating_looks', 'ratingLooks', 'Looks Rating') || '').trim();

    // Exclude planned / future sets explicitly marked "Future"
    if (
      datePurchased.includes('future') ||
      yearPurchased.includes('future') ||
      dateFinished.toLowerCase().includes('future')
    ) {
      return false;
    }

    // Must have evidence of being built (Time to Build, Date Finished, Year Finished, or personal Rating)
    const hasBuildEvidence =
      (timeToBuild && !timeToBuild.includes('#REF!')) ||
      (dateFinished && !dateFinished.includes('#REF!')) ||
      (yearFinished && !yearFinished.includes('#REF!')) ||
      (ratingBuild && !ratingBuild.includes('#REF!')) ||
      (ratingLooks && !ratingLooks.includes('#REF!'));

    return hasBuildEvidence;
  });

  console.log(`\nFound ${records.length} built Lego sets in spreadsheet (filtered out unbuilt/future rows).`);

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

    // Execute backends in order
    const backendResults: Record<string, EnrichmentResult> = {};
    for (const backend of backends) {
      try {
        const res = await backend.enrich({ cleanId, setNum, csvRecord: record, previous });
        if (res) {
          backendResults[backend.name] = res;
        }
      } catch (err) {
        console.warn(`  ⚠️ Error running backend [${backend.name}] for set ${cleanId}:`, err);
      }
    }

    const lego = backendResults.lego;
    const rebrickable = backendResults.rebrickable;
    const brickset = backendResults.brickset;

    if (lego) {
      console.log(
        `  ✓ Supplemented with LEGO.com metadata (age: ${lego.age || '—'}, pieces: ${lego.pieces || '—'}, PDFs: ${lego.instructions?.length || 0})`
      );
    }
    if (brickset?.dateRetired) {
      console.log(`  ✓ Supplemented with Brickset retired date: ${brickset.dateRetired}`);
    }

    // Resolve name
    const csvName = record['Name'] || record['name'];
    const name = csvName || lego?.name || rebrickable?.name || brickset?.name || previous.name || `Lego Set #${cleanId}`;

    // Resolve theme
    const csvTheme = record['Category'] || record['category'];
    const theme = csvTheme || lego?.theme || rebrickable?.theme || brickset?.theme || previous.theme;

    // Resolve pieces
    const csvPieces = parsePieces(record['Number of Pieces'] || record['pieces']);
    const pieces = csvPieces || lego?.pieces || rebrickable?.pieces || brickset?.pieces || previous.pieces;

    // Dates and years
    const csvDateReleased = record['Date Set Released'] || record['date_released'] || previous.dateReleased;
    const csvDateRetired = record['Date Set Retired'] || record['date_retired'] || previous.dateRetired;

    const dateReleased = csvDateReleased || brickset?.dateReleased || previous.dateReleased;
    const releaseYear =
      parseYear(csvDateReleased) || lego?.year || rebrickable?.year || brickset?.year || previous.year;

    // Prefer specific date from brickset if CSV just says "Retired"
    const rawDateRetired = csvDateRetired || brickset?.dateRetired || previous.dateRetired;
    const dateRetired =
      (csvDateRetired?.trim().toLowerCase() === 'retired' && brickset?.dateRetired)
        ? brickset.dateRetired
        : rawDateRetired;

    // Primary display year
    const displayYear = releaseYear || previous.year;

    // Age
    const age = lego?.age || brickset?.age || previous.age;

    // Instructions
    const instructions = lego?.instructions || previous.instructions;
    const instructionBooks = lego?.instructionBooks || brickset?.instructionBooks || previous.instructionBooks;

    // Dimensions
    const combinedText = `${lego?.featuresText || ''} ${lego?.description || ''}`;
    const dimensions =
      lego?.dimensions ||
      brickset?.dimensions ||
      parseDimensionsFromRecord(record, combinedText) ||
      previous.dimensions;

    // Images
    const imageUrl =
      previous.imageUrl ||
      lego?.imageUrl ||
      rebrickable?.imageUrl ||
      brickset?.imageUrl ||
      `https://cdn.rebrickable.com/media/sets/${setNum}.jpg`;
    const hiresImageUrl = lego?.hiresImageUrl || previous.hiresImageUrl;
    const thumbnailImageUrl = lego?.thumbnailImageUrl || previous.thumbnailImageUrl;
    const images = lego?.images || (previous.images?.map((img: any) => (typeof img === 'string' ? img : img.url)));

    // Description & textual metadata
    const description = lego?.description || previous.description;
    const featuresText = lego?.featuresText || previous.featuresText;
    const metaDescription = lego?.metaDescription || previous.metaDescription;
    const metaTitle = lego?.metaTitle || previous.metaTitle;
    const slug = lego?.slug || previous.slug;
    const brand = lego?.brand || previous.brand;
    const categories = lego?.categories || previous.categories;
    const productVideos = lego?.productVideos || previous.productVideos;

    // Build time formatting
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

    // Resolve fun facts: manual spreadsheet entry > cached Gemini generation > previous sets.json
    const cachedGemini = getCachedJson<{ fact?: string }>(GEMINI_CACHE_DIR, `set_${cleanId}.json`);
    const funFacts = record['fun_facts'] || cachedGemini?.fact || previous.funFacts || '';

    // GWP info
    const isGwp =
      brickset?.isGwp ||
      previous.isGwp ||
      /gift with purchase/i.test(record['Notes'] || '') ||
      /gift with purchase/i.test(lego?.description || '') ||
      undefined;
    const gwpDescription = brickset?.gwpDescription || previous.gwpDescription;
    const gwpWithSetNumber = brickset?.gwpWithSetNumber || previous.gwpWithSetNumber;

    // Collection
    const rawCollection = getRecordField(record, 'Collection', 'collection');
    const collection = rawCollection || previous.collection || undefined;

    // Build and Looks ratings from CSV
    const ratingBuild =
      parseRating(getRecordField(record, 'Rating (Build)', 'rating_build', 'ratingBuild', 'Build Rating')) ??
      previous.ratingBuild;

    const ratingLooks =
      parseRating(getRecordField(record, 'Rating (Looks)', 'rating_looks', 'ratingLooks', 'Looks Rating')) ??
      previous.ratingLooks;

    // Overall ratings: CSV rating from user takes precedence, fallback to previous or brickset
    const rawRating = parseRating(getRecordField(record, 'Rating', 'rating'));
    const rating = rawRating ?? (previous.rating || brickset?.rating);

    const enriched: EnrichedLegoSet = {
      id: cleanId,
      setNum,
      name,
      year: displayYear,
      dateReleased: dateReleased || undefined,
      dateRetired: dateRetired || undefined,
      isGwp,
      gwpDescription,
      gwpWithSetNumber,
      theme,
      collection,
      age,
      pieces,
      instructionBooks,
      rating,
      ratingBuild,
      ratingLooks,
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
      funFacts,
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
      const existing = uniqueMap.get(set.id)!;
      const merged: EnrichedLegoSet = {
        ...existing,
        ...set,
        timeToBuildFormatted: existing.timeToBuildFormatted || set.timeToBuildFormatted,
        buildTimeHours: existing.buildTimeHours || set.buildTimeHours,
        buildDate: existing.buildDate || set.buildDate,
        funFacts: existing.funFacts || set.funFacts || '',
        notes: existing.notes || set.notes,
        collection: set.collection || existing.collection,
        ratingBuild: set.ratingBuild ?? existing.ratingBuild,
        ratingLooks: set.ratingLooks ?? existing.ratingLooks,
        rating: set.rating ?? existing.rating,
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
        isGwp: existing.isGwp || set.isGwp,
        gwpDescription: existing.gwpDescription || set.gwpDescription,
        gwpWithSetNumber: existing.gwpWithSetNumber || set.gwpWithSetNumber,
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

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((err) => {
    console.error('Fatal enrichment error:', err);
    process.exit(1);
  });
}
