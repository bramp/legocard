import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Liquid } from 'liquidjs';
import type { EnrichedLegoSet, WordTimestamp } from '../shared/types.js';
import { formatBuildTime, cleanSetName } from '../shared/format.js';
import {
  cleanThemeName,
  simplifyTheme,
  THEME_OVERRIDES,
  formatThemeLine,
  themeEndsWithCollectiveNoun,
} from '../shared/themes.js';
import { isSetRetired, getRetiredYear } from '../shared/retirement.js';

export {
  cleanThemeName,
  simplifyTheme,
  THEME_OVERRIDES,
  isSetRetired,
  getRetiredYear,
  formatThemeLine,
  themeEndsWithCollectiveNoun,
  cleanSetName,
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const TEMPLATES_DIR = path.resolve(process.cwd(), 'templates');
const NARRATION_TEMPLATE_FILE = path.join(TEMPLATES_DIR, 'narration.liquid');

const engine = new Liquid({
  root: TEMPLATES_DIR,
  extname: '.liquid',
});

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Custom filter to format piece counts with commas
engine.registerFilter('format_number', (v: number | string) => {
  if (typeof v === 'number') return v.toLocaleString();
  const num = Number(v);
  return isNaN(num) ? v : num.toLocaleString();
});

// Custom filter to convert a number to an ordinal string (1 -> 1st, 2 -> 2nd)
engine.registerFilter('ordinal', (v: number | string) => {
  const num = Number(v);
  return isNaN(num) ? v : ordinal(num);
});

// Custom filter to shorten verbose themes for spoken audio
engine.registerFilter('short_theme', (v: string) => {
  return simplifyTheme(v);
});

// Custom filter to format theme line without repeating collective nouns
engine.registerFilter('theme_line', (v: string) => {
  return formatThemeLine(v);
});

// Custom filter to clean set title/name
engine.registerFilter('clean_name', (v: string) => {
  return cleanSetName(v);
});

// Select a crisp, natural neural voice
const VOICE_NAME = process.env.EDGE_TTS_VOICE || 'en-US-ChristopherNeural';

interface EdgeMetadataItem {
  Type: string;
  Data: {
    Offset: number; // 100ns units
    Duration: number; // 100ns units
    text?: {
      Text: string;
      Length: number;
      BoundaryType: string;
    };
  };
}

function formatBuildDuration(set: EnrichedLegoSet): string | null {
  return formatBuildTime(set, { useAnd: true });
}

export interface CollectionFactsInfo {
  facts: string[];
  collectionFact: string;
  primaryCollectionFact: string;
  piecesRank: number;
  piecesRankOrdinal: string;
  piecesTotal: number;
  isLargest: boolean;
  isSmallest: boolean;
  buildTimeRank: number | null;
  buildTimeRankOrdinal: string | null;
  buildTimeTotal: number;
  isLongestBuild: boolean;
  isFastestBuild: boolean;
  themePiecesRank: number | null;
  themePiecesRankOrdinal: string | null;
  themeTotal: number;
  themeName: string;
  isOldest: boolean;
  isNewest: boolean;
}

let cachedSetsJson: EnrichedLegoSet[] | null = null;
function getCollectionSets(): EnrichedLegoSet[] {
  if (!cachedSetsJson && fs.existsSync(JSON_FILE)) {
    try {
      cachedSetsJson = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];
    } catch {
      cachedSetsJson = [];
    }
  }
  return cachedSetsJson || [];
}

export function computeCollectionFacts(set: EnrichedLegoSet, allSets?: EnrichedLegoSet[]): CollectionFactsInfo {
  const collection = allSets && allSets.length > 0 ? allSets : getCollectionSets();

  const byPieces = [...collection].filter((s) => typeof s.pieces === 'number').sort((a, b) => (b.pieces || 0) - (a.pieces || 0));
  const byBuildTime = [...collection].filter((s) => typeof s.buildTimeHours === 'number').sort((a, b) => (b.buildTimeHours || 0) - (a.buildTimeHours || 0));
  const byYearAsc = [...collection].filter((s) => typeof s.year === 'number').sort((a, b) => a.year! - b.year!);

  const minYear = byYearAsc[0]?.year ?? null;
  const maxYear = byYearAsc[byYearAsc.length - 1]?.year ?? null;

  const themeGroups: Record<string, EnrichedLegoSet[]> = {};
  collection.forEach((s) => {
    const p = cleanThemeName(s.theme);
    if (!p) return;
    if (!themeGroups[p]) themeGroups[p] = [];
    themeGroups[p].push(s);
  });
  Object.values(themeGroups).forEach((group) => {
    group.sort((a, b) => (b.pieces || 0) - (a.pieces || 0));
  });

  const facts: string[] = [];

  const pIdx = byPieces.findIndex((s) => s.id === set.id);
  const pRank = pIdx !== -1 ? pIdx + 1 : 0;
  const isLargest = pRank === 1;
  const isSmallest = pRank === byPieces.length && byPieces.length > 1;

  if (isLargest) {
    facts.push('It has the most pieces in the collection.');
  } else if (pRank >= 2 && pRank <= 3) {
    facts.push(`It is the ${ordinal(pRank)} largest set in the collection.`);
  } else if (isSmallest) {
    facts.push('It is the smallest set in the collection.');
  }

  const bIdx = byBuildTime.findIndex((s) => s.id === set.id);
  let bRank: number | null = null;
  let isLongest = false;
  let isFastest = false;
  if (bIdx !== -1) {
    bRank = bIdx + 1;
    isLongest = bRank === 1;
    isFastest = bRank === byBuildTime.length && byBuildTime.length > 1;
    if (isLongest) {
      facts.push('It is the longest build in the collection.');
    } else if (bRank >= 2 && bRank <= 3) {
      facts.push(`It is the ${ordinal(bRank)} longest build in the collection.`);
    } else if (isFastest) {
      facts.push('It is the fastest build in the collection.');
    }
  }

  const cleanTheme = cleanThemeName(set.theme);
  const group = themeGroups[cleanTheme];
  let tRank: number | null = null;
  if (group && group.length >= 3) {
    const tIdx = group.findIndex((s) => s.id === set.id);
    if (tIdx !== -1) {
      tRank = tIdx + 1;
      if (tRank === 1 && pRank > 3) {
        facts.push(`It is the largest ${cleanTheme} set in the collection.`);
      } else if (tRank === 2 && pRank > 5 && group.length >= 5) {
        facts.push(`It is the 2nd largest ${cleanTheme} set in the collection.`);
      }
    }
  }

  if (facts.length < 2 && bRank !== null && bRank > 3 && bRank <= 5) {
    facts.push(`It is the ${ordinal(bRank)} longest build in the collection.`);
  }
  if (facts.length < 2 && pRank > 3 && pRank <= 5) {
    facts.push(`It is the ${ordinal(pRank)} largest set in the collection.`);
  }

  const setYear = set.year;
  const isOldest = !!(setYear && setYear === minYear);
  const isNewest = !!(setYear && setYear === maxYear);

  if (facts.length === 0 && isOldest) {
    facts.push('It is tied for the oldest set in the collection.');
  } else if (facts.length === 0 && isNewest) {
    facts.push('It is one of the newest additions to the collection.');
  }

  return {
    facts,
    collectionFact: facts.join(' '),
    primaryCollectionFact: facts[0] || '',
    piecesRank: pRank,
    piecesRankOrdinal: pRank ? ordinal(pRank) : '',
    piecesTotal: byPieces.length,
    isLargest,
    isSmallest,
    buildTimeRank: bRank,
    buildTimeRankOrdinal: bRank ? ordinal(bRank) : null,
    buildTimeTotal: byBuildTime.length,
    isLongestBuild: isLongest,
    isFastestBuild: isFastest,
    themePiecesRank: tRank,
    themePiecesRankOrdinal: tRank ? ordinal(tRank) : null,
    themeTotal: group ? group.length : 1,
    themeName: cleanTheme,
    isOldest,
    isNewest,
  };
}

export function buildNarration(set: EnrichedLegoSet, allSets?: EnrichedLegoSet[]): string {
  const factsInfo = computeCollectionFacts(set, allSets);
  const shortTheme = simplifyTheme(set.theme);
  const themeLine = formatThemeLine(shortTheme);
  const context = {
    ...set,
    name: cleanSetName(set.name),
    year: set.year,
    shortTheme,
    themeLine,
    buildDuration: formatBuildDuration(set),
    collectionFacts: factsInfo.facts,
    collectionFact: factsInfo.collectionFact,
    primaryCollectionFact: factsInfo.primaryCollectionFact,
    piecesRank: factsInfo.piecesRank,
    piecesRankOrdinal: factsInfo.piecesRankOrdinal,
    piecesTotal: factsInfo.piecesTotal,
    isLargest: factsInfo.isLargest,
    isSmallest: factsInfo.isSmallest,
    buildTimeRank: factsInfo.buildTimeRank,
    buildTimeRankOrdinal: factsInfo.buildTimeRankOrdinal,
    buildTimeTotal: factsInfo.buildTimeTotal,
    isLongestBuild: factsInfo.isLongestBuild,
    isFastestBuild: factsInfo.isFastestBuild,
    themePiecesRank: factsInfo.themePiecesRank,
    themePiecesRankOrdinal: factsInfo.themePiecesRankOrdinal,
    themeTotal: factsInfo.themeTotal,
    themeName: factsInfo.themeName,
    isOldest: factsInfo.isOldest,
    isNewest: factsInfo.isNewest,
    isRetired: isSetRetired(set),
    retiredYear: getRetiredYear(set),
  };

  if (!fs.existsSync(NARRATION_TEMPLATE_FILE)) {
    throw new Error(`Narration template not found at ${NARRATION_TEMPLATE_FILE}`);
  }
  const templateContent = fs.readFileSync(NARRATION_TEMPLATE_FILE, 'utf-8');
  const rendered = engine.parseAndRenderSync(templateContent, context);

  // Normalize multi-spaces and whitespace into clean sentence spacing
  return rendered.replace(/\s+/g, ' ').trim();
}

// TODO It seems odd we need to do this - shouldn't the API do this, or shouldn't we use a proper html encoder
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSetAudio(set: EnrichedLegoSet, allSets?: EnrichedLegoSet[]): Promise<{ audioPath: string; subtitles: WordTimestamp[]; narrationText: string }> {
  const narration = buildNarration(set, allSets);
  const audioFilePath = path.join(AUDIO_DIR, `${set.id}.mp3`);
  const subtitlesFilePath = path.join(AUDIO_DIR, `${set.id}.subtitles.json`);

  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });

  const { audioStream, metadataStream } = tts.toStream(escapeXml(narration));

  const wordTimestamps: WordTimestamp[] = [];
  if (metadataStream) {
    metadataStream.on('data', (chunk: Buffer) => {
      try {
        const parsed = JSON.parse(chunk.toString()) as { Metadata?: EdgeMetadataItem[] };
        if (parsed.Metadata) {
          for (const item of parsed.Metadata) {
            if (item.Type === 'WordBoundary' && item.Data.text?.Text) {
              const startMs = Math.round(item.Data.Offset / 10000);
              const durationMs = Math.round(item.Data.Duration / 10000);
              wordTimestamps.push({
                word: item.Data.text.Text,
                start: startMs,
                end: startMs + durationMs,
              });
            }
          }
        }
      } catch {
        // partial chunk or non-json message, ignore
      }
    });
  }

  const writeStream = fs.createWriteStream(audioFilePath);
  audioStream.pipe(writeStream);

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
    audioStream.on('error', reject);
  });

  fs.writeFileSync(subtitlesFilePath, JSON.stringify(wordTimestamps, null, 2), 'utf-8');

  return {
    audioPath: `data/audio/${set.id}.mp3`,
    subtitles: wordTimestamps,
    narrationText: narration,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`Usage: npm run tts -- [options]

Generates speech audio (.mp3) and word-level subtitle timing (.subtitles.json)
for Lego sets using Edge TTS.

Options:
  --set <id>, --set=<id>  Generate TTS only for the specified set ID (e.g. --set=10237)
  --preview, --dry-run    Preview narration text in console without calling TTS
  -h, --help              Show this help message

Environment Variables:
  EDGE_TTS_VOICE          Voice model to use (default: en-US-ChristopherNeural)
`);
    return;
  }

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`Missing sets.json. Run 'npm run enrich' first.`);
    process.exit(1);
  }

  const isPreview = args.includes('--preview') || args.includes('--dry-run');
  const filterArg = args.find((arg) => arg.startsWith('--set=') || arg === '--set');
  let targetId: string | undefined;
  if (filterArg) {
    if (filterArg.startsWith('--set=')) {
      targetId = filterArg.split('=')[1];
    } else {
      const idx = args.indexOf('--set');
      targetId = args[idx + 1];
    }
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];

  if (isPreview) {
    console.log(`📋 Previewing voiceover narration text for sets:\n`);
    let count = 0;
    for (const set of sets) {
      if (targetId && set.id !== targetId) {
        continue;
      }
      const narration = buildNarration(set, sets);
      console.log(`[#${set.id}] ${set.name}`);
      console.log(`   "${narration}"\n`);
      count++;
    }
    console.log(`Total sets previewed: ${count}`);
    return;
  }

  console.log(`Generating TTS audio and subtitles for ${sets.length} sets...`);

  let count = 0;
  for (const set of sets) {
    if (targetId && set.id !== targetId) {
      continue;
    }
    const previewText = buildNarration(set, sets);
    console.log(`🎙️  Narrating #${set.id}: ${set.name}...`);
    console.log(`   "${previewText}"`);
    try {
      const result = await generateSetAudio(set, sets);
      set.audioPath = result.audioPath;
      set.subtitles = result.subtitles;
      set.narrationText = result.narrationText;
      console.log(`   ✓ Audio: ${result.audioPath} (${result.subtitles.length} words timed)\n`);
      count++;
    } catch (err) {
      console.error(`   ✗ Failed to generate TTS for #${set.id}:`, err);
    }
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(sets, null, 2), 'utf-8');
  console.log(`\n🎉 TTS generation complete for ${count} set(s). Updated ${JSON_FILE}`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal TTS generation error:', err);
    process.exit(1);
  });
}
