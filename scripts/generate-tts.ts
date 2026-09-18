import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { EnrichedLegoSet, WordTimestamp } from '../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');

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

export function buildNarration(set: EnrichedLegoSet): string {
  const parts: string[] = [];

  parts.push(`Lego set ${set.id}: ${set.name}.`);

  if (set.theme && set.year) {
    parts.push(`A ${set.year} release from the ${set.theme} line.`);
  }

  if (set.pieces) {
    parts.push(`Features ${set.pieces.toLocaleString()} pieces.`);
  }

  if (set.buildTimeHours) {
    const hoursText = set.buildTimeHours === 1 ? '1 hour' : `${set.buildTimeHours} hours`;
    parts.push(`Took ${hoursText} to build.`);
  }

  if (set.funFacts) {
    parts.push(set.funFacts);
  }

  return parts.join(' ');
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

async function generateSetAudio(set: EnrichedLegoSet): Promise<{ audioPath: string; subtitles: WordTimestamp[]; narrationText: string }> {
  const narration = buildNarration(set);
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
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`Missing sets.json. Run 'npm run enrich' first.`);
    process.exit(1);
  }

  const isPreview = process.argv.includes('--preview') || process.argv.includes('--dry-run');
  const filterArg = process.argv.find((arg) => arg.startsWith('--set=') || arg === '--set');
  let targetId: string | undefined;
  if (filterArg) {
    if (filterArg.startsWith('--set=')) {
      targetId = filterArg.split('=')[1];
    } else {
      const idx = process.argv.indexOf('--set');
      targetId = process.argv[idx + 1];
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
      const narration = set.narrationText || buildNarration(set);
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
    const previewText = buildNarration(set);
    console.log(`🎙️  Narrating #${set.id}: ${set.name}...`);
    console.log(`   "${previewText}"`);
    try {
      const result = await generateSetAudio(set);
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
