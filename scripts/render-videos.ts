import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { EnrichedLegoSet, LegoShowcaseProps, WordTimestamp } from '../shared/types.js';
import { buildNarration } from './generate-tts.js';
import { getCalendarBuildSpan } from '../shared/build-span.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const VIDEO_ENTRY_POINT = path.resolve(process.cwd(), 'video/src/index.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  let targetId: string | undefined;
  let force = false;
  let concurrency = 4;
  let isPreview = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--set=')) {
      targetId = arg.split('=')[1];
    } else if (arg === '--set' && i + 1 < args.length) {
      targetId = args[++i];
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--preview' || arg === '--dry-run') {
      isPreview = true;
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = parseInt(arg.split('=')[1], 10) || 4;
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      concurrency = parseInt(args[++i], 10) || 4;
    }
  }

  return { targetId, force, concurrency, isPreview };
}

function getAudioDuration(audioPath: string): number {
  if (!fs.existsSync(audioPath)) return 20;

  // Read MP3 duration from file size / bitrate or fallback to subtitles
  const subtitlesPath = audioPath.replace(/\.mp3$/, '.subtitles.json');
  if (fs.existsSync(subtitlesPath)) {
    try {
      const subs = JSON.parse(fs.readFileSync(subtitlesPath, 'utf-8'));
      if (Array.isArray(subs) && subs.length > 0) {
        const last = subs[subs.length - 1];
        if (last && typeof last.end === 'number') {
          // Add 2.5 seconds buffer after narration ends
          return Math.max(8, (last.end + 2500) / 1000);
        }
      }
    } catch {
      // ignore
    }
  }

  return 20;
}

async function main() {
  const { targetId, force, concurrency, isPreview } = parseArgs();

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`Missing sets.json at ${JSON_FILE}. Run 'npm run enrich' first.`);
    process.exit(1);
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];

  if (isPreview) {
    console.log(`📋 Video Showcase Narration & Subtitle Preview:\n`);
    let count = 0;
    for (const set of sets) {
      if (targetId && set.id !== targetId) continue;
      const localAudioPath = path.join(AUDIO_DIR, `${set.id}.mp3`);
      const localSubtitlesPath = path.join(AUDIO_DIR, `${set.id}.subtitles.json`);

      let text = set.narrationText;
      let subsList: WordTimestamp[] = [];
      if (fs.existsSync(localSubtitlesPath)) {
        try {
          subsList = JSON.parse(fs.readFileSync(localSubtitlesPath, 'utf-8')) as WordTimestamp[];
          if (!text && subsList.length > 0) {
            text = subsList.map((s) => s.word).join(' ');
          }
        } catch {
          // ignore
        }
      }
      const latestTemplateText = buildNarration(set, sets);
      if (!text) {
        text = latestTemplateText;
      }

      const hasAudio = fs.existsSync(localAudioPath);
      const audioDuration = hasAudio ? getAudioDuration(localAudioPath) : undefined;

      console.log(`================================================================================`);
      console.log(`[#${set.id}] ${set.name}`);
      console.log(`   Theme: ${set.theme || '—'} | Year: ${set.year ?? '—'} | Pieces: ${set.pieces ? set.pieces.toLocaleString() : '—'}`);
      console.log(`   Audio status: ${hasAudio ? `✓ generated (${audioDuration?.toFixed(1)}s, ${subsList.length} timed words)` : '✗ not generated yet'}`);
      console.log(`\n   Narration Script:\n   "${text}"`);

      if (hasAudio && text !== latestTemplateText) {
        console.log(`\n   ⚠ Notice: Generated audio differs from latest Liquid template:\n   "${latestTemplateText}"\n   (Run 'npm run tts -- --set=${set.id}' to update audio)`);
      }

      if (subsList.length > 0) {
        console.log(`\n   Word Subtitle Timestamps:`);
        const formattedWords = subsList
          .map((w) => `${w.word} [${(w.start / 1000).toFixed(2)}s - ${(w.end / 1000).toFixed(2)}s]`)
          .join(', ');
        console.log(`   ${formattedWords}`);
      }
      console.log(`\n`);
      count++;
    }
    console.log(`================================================================================`);
    console.log(`Total sets previewed: ${count}`);
    return;
  }

  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  console.log(`Loaded ${sets.length} sets from ${JSON_FILE}`);

  const setsToRender = sets.filter((set) => {
    if (targetId && set.id !== targetId) return false;
    const videoOutPath = path.join(VIDEOS_DIR, `${set.id}.mp4`);
    if (fs.existsSync(videoOutPath) && !force) {
      return false;
    }
    return true;
  });

  if (setsToRender.length === 0) {
    console.log(`No sets need video rendering. Use --force to re-render existing videos.`);
    return;
  }

  console.log(`🎬 Bundling Remotion video code from ${VIDEO_ENTRY_POINT}...`);
  const bundleLocation = await bundle({
    entryPoint: VIDEO_ENTRY_POINT,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          '.js': ['.ts', '.js'],
          '.mjs': ['.mts', '.mjs'],
        },
      },
    }),
  });

  console.log(`✓ Remotion bundle ready: ${bundleLocation}`);
  console.log(`Rendering ${setsToRender.length} video(s) (concurrency: ${concurrency})...\n`);

  let renderedCount = 0;
  for (const set of setsToRender) {
    const videoOutPath = path.join(VIDEOS_DIR, `${set.id}.mp4`);
    console.log(`🎥 [${renderedCount + 1}/${setsToRender.length}] Rendering set #${set.id}: ${set.name}...`);

    // Prepare media files
    const localImagePath = path.join(IMAGES_DIR, `${set.id}.jpg`);
    const localAudioPath = path.join(AUDIO_DIR, `${set.id}.mp3`);
    const localSubtitlesPath = path.join(AUDIO_DIR, `${set.id}.subtitles.json`);

    let imageSrc = set.hiresImageUrl || set.imageUrl || (set.images && set.images[0]) || '';
    if (fs.existsSync(localImagePath)) {
      const imgBuffer = fs.readFileSync(localImagePath);
      imageSrc = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
    }

    let audioSrc: string | undefined;
    let audioDurationSeconds = 20;
    if (fs.existsSync(localAudioPath)) {
      const audioBuffer = fs.readFileSync(localAudioPath);
      audioSrc = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
      audioDurationSeconds = getAudioDuration(localAudioPath);
    }

    let subtitles = set.subtitles || [];
    if (fs.existsSync(localSubtitlesPath)) {
      try {
        subtitles = JSON.parse(fs.readFileSync(localSubtitlesPath, 'utf-8'));
      } catch {
        // ignore
      }
    }

    const narrationText = set.narrationText || (subtitles.length > 0 ? subtitles.map((s) => s.word).join(' ') : buildNarration(set));
    console.log(`   Voiceover: "${narrationText}"`);

    const buildSpan = getCalendarBuildSpan(set);
    const allImages: string[] = [];
    if (imageSrc) allImages.push(imageSrc);
    if (Array.isArray(set.images)) {
      for (const img of set.images) {
        if (img && !allImages.includes(img)) {
          allImages.push(img);
        }
      }
    }

    const inputProps: LegoShowcaseProps = {
      id: set.id,
      name: set.name,
      theme: set.theme,
      collection: set.collection,
      year: set.year,
      pieces: set.pieces,
      buildTimeHours: set.buildTimeHours,
      timeToBuildFormatted: set.timeToBuildFormatted,
      buildSpanText: buildSpan?.spanText,
      dateStarted: set.dateStarted,
      dateFinished: set.dateFinished,
      rating: set.rating,
      ratingBuild: set.ratingBuild,
      ratingLooks: set.ratingLooks,
      dimensions: set.dimensions,
      age: set.age,
      instructionBooks: set.instructionBooks,
      dateRetired: set.dateRetired,
      isGwp: set.isGwp,
      gwpDescription: set.gwpDescription,
      gwpWithSetNumber: set.gwpWithSetNumber,
      funFacts: set.funFacts,
      imageSrc: imageSrc || '',
      images: allImages,
      audioSrc,
      subtitles,
      audioDurationInSeconds: audioDurationSeconds,
    };

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'LegoShowcase',
        inputProps: inputProps as unknown as Record<string, unknown>,
      });

      await renderMedia({
        composition: {
          ...composition,
          durationInFrames: Math.ceil(audioDurationSeconds * composition.fps),
        },
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: videoOutPath,
        inputProps: inputProps as unknown as Record<string, unknown>,
        concurrency,
        onProgress: ({ progress }) => {
          process.stdout.write(`   Rendering: ${(progress * 100).toFixed(0)}%\r`);
        },
      });

      console.log(`\n   ✓ Video rendered successfully: ${videoOutPath}`);

      // Update set metadata in memory
      set.videoPath = `data/videos/${set.id}.mp4`;
      if (!set.media) set.media = {};
      set.media.video = `videos/${set.id}.mp4`;
      renderedCount++;
    } catch (err) {
      console.error(`\n   ✗ Error rendering video for #${set.id}:`, err);
    }
  }

  // Update sets.json with video paths
  fs.writeFileSync(JSON_FILE, JSON.stringify(sets, null, 2), 'utf-8');
  console.log(`\n🎉 Successfully rendered ${renderedCount} video(s)! Updated ${JSON_FILE}`);
}

main().catch((err) => {
  console.error('Fatal error during video render:', err);
  process.exit(1);
});
