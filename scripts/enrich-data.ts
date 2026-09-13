import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import type { CsvLegoRecord, EnrichedLegoSet, RebrickableSetResponse } from '../shared/types.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'sets.csv');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY;

// Cache theme ID -> Theme Name to avoid duplicate network requests
const themeCache = new Map<number, string>();

// Fallback metadata for starter/sample sets when no API key is provided
const FALLBACK_METADATA: Record<string, { name: string; year: number; theme: string; pieces: number }> = {
  '10497': { name: 'Galaxy Explorer', year: 2022, theme: 'Classic Space / Icons', pieces: 1254 },
  '75192': { name: 'Millennium Falcon', year: 2017, theme: 'Star Wars / UCS', pieces: 7541 },
  '92176': { name: 'NASA Apollo Saturn V', year: 2020, theme: 'NASA / Ideas', pieces: 1969 },
  '10316': { name: 'The Lord of the Rings: Rivendell', year: 2023, theme: 'Icons / LOTR', pieces: 6167 },
  '21309': { name: 'NASA Apollo Saturn V', year: 2017, theme: 'NASA / Ideas', pieces: 1969 },
};

async function fetchRebrickableTheme(themeId: number, apiKey: string): Promise<string> {
  if (themeCache.has(themeId)) {
    return themeCache.get(themeId)!;
  }
  try {
    const res = await fetch(`https://rebrickable.com/api/v3/lego/themes/${themeId}/`, {
      headers: { Authorization: `key ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json() as { name: string };
      themeCache.set(themeId, data.name);
      return data.name;
    }
  } catch (err) {
    console.warn(`[Warning] Could not fetch theme ${themeId}:`, err);
  }
  return 'Lego';
}

async function fetchRebrickableSet(setNum: string, apiKey: string): Promise<{ data?: RebrickableSetResponse; theme?: string }> {
  try {
    const res = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
      headers: { Authorization: `key ${apiKey}` }
    });
    if (!res.ok) {
      console.warn(`[Warning] Rebrickable API returned ${res.status} for set ${setNum}`);
      return {};
    }
    const data = await res.json() as RebrickableSetResponse;
    const theme = await fetchRebrickableTheme(data.theme_id, apiKey);
    return { data, theme };
  } catch (err) {
    console.warn(`[Error] Rebrickable API error for set ${setNum}:`, err);
    return {};
  }
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  if (fs.existsSync(destPath)) {
    return true; // Already downloaded
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    console.warn(`[Warning] Failed to download image from ${url}:`, err);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`CSV file not found at ${CSV_FILE}`);
    process.exit(1);
  }

  const csvRaw = fs.readFileSync(CSV_FILE, 'utf-8');
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvLegoRecord[];

  console.log(`Found ${records.length} sets in CSV.`);
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
    const cleanId = record.set_number.trim().replace(/-1$/, '');
    const setNum = cleanId.includes('-') ? cleanId : `${cleanId}-1`;
    console.log(`Processing set #${cleanId}...`);

    let name = record.name || '';
    let year = 2022;
    let theme = 'Lego';
    let pieces = 0;
    let imageUrl = `https://cdn.rebrickable.com/media/sets/${setNum}.jpg`;

    // 1. Try Rebrickable API if key exists
    if (REBRICKABLE_API_KEY) {
      const apiResult = await fetchRebrickableSet(setNum, REBRICKABLE_API_KEY);
      if (apiResult.data) {
        name = apiResult.data.name;
        year = apiResult.data.year;
        pieces = apiResult.data.num_parts;
        if (apiResult.data.set_img_url) {
          imageUrl = apiResult.data.set_img_url;
        }
      }
      if (apiResult.theme) {
        theme = apiResult.theme;
      }
    } else if (FALLBACK_METADATA[cleanId]) {
      const fb = FALLBACK_METADATA[cleanId];
      if (!name) name = fb.name;
      year = fb.year;
      theme = fb.theme;
      pieces = fb.pieces;
    }

    if (!name) {
      name = `Lego Set #${cleanId}`;
    }

    // 2. Download high-res stock photo
    const imageFilename = `${cleanId}.jpg`;
    const localImagePath = path.join(IMAGES_DIR, imageFilename);
    const downloaded = await downloadImage(imageUrl, localImagePath);
    if (downloaded) {
      console.log(`  ✓ Image saved: data/images/${imageFilename}`);
    } else {
      console.log(`  ⚠ Could not download image for #${cleanId}`);
    }

    const previous = existingSets[cleanId] || {};

    const enriched: EnrichedLegoSet = {
      id: cleanId,
      setNum,
      name,
      year,
      theme,
      pieces,
      imageUrl,
      localImagePath: downloaded ? `data/images/${imageFilename}` : undefined,
      audioPath: previous.audioPath,
      subtitles: previous.subtitles,
      narrationText: previous.narrationText,
      videoPath: previous.videoPath,
      buildDate: record.build_date || previous.buildDate,
      buildTimeHours: record.build_time_hours ? parseFloat(String(record.build_time_hours)) : previous.buildTimeHours,
      builtBy: record.built_by || previous.builtBy,
      rating: record.rating ? parseFloat(String(record.rating)) : previous.rating,
      funFacts: record.fun_facts || previous.funFacts || '',
      notes: record.notes || previous.notes,
    };

    enrichedSets.push(enriched);
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(enrichedSets, null, 2), 'utf-8');
  console.log(`\n🎉 Enriched data successfully written to ${JSON_FILE} (${enrichedSets.length} sets).`);
}

main().catch((err) => {
  console.error('Fatal enrichment error:', err);
  process.exit(1);
});
