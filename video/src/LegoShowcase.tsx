import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { LegoShowcaseProps } from './types';
import { CARD_SNAP_SFX, WHOOSH_SFX } from './sfx';
import { getThemePalette } from './theme';
import { ProgressBar } from './components/ProgressBar';
import { Header } from './components/Header';
import { Background } from './components/Background';
import { HeroSlideshow } from './components/HeroSlideshow';
import { TelemetryGrid, type TelemetryCardData } from './components/TelemetryGrid';
import { SubtitleBar } from './components/SubtitleBar';
import { Footer } from './components/Footer';

function formatCompactTime(raw?: string, hours?: number): string {
  if (raw) {
    const compact = raw
      .replace(/(\d+)\s*hours?/, '$1h')
      .replace(/(\d+)\s*minutes?/, '$1m')
      .replace(/\s*and\s*/, ' ')
      .trim();
    if (compact) return compact;
  }
  if (typeof hours === 'number') {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
  }
  return '—';
}

function parseTotalMinutes(raw?: string, hours?: number): number {
  if (typeof hours === 'number' && hours > 0) {
    return Math.round(hours * 60);
  }
  if (raw) {
    let total = 0;
    const hMatch = raw.match(/(\d+)\s*(?:hours?|h)/i);
    const mMatch = raw.match(/(\d+)\s*(?:minutes?|m)/i);
    if (hMatch) total += parseInt(hMatch[1], 10) * 60;
    if (mMatch) total += parseInt(mMatch[1], 10);
    if (total > 0) return total;
  }
  return 0;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export const LegoShowcase: React.FC<LegoShowcaseProps> = ({
  id,
  name,
  theme,
  collection,
  year,
  pieces,
  buildTimeHours,
  timeToBuildFormatted,
  buildSpanText,
  rating,
  ratingBuild,
  ratingLooks,
  dimensions,
  age,
  instructionBooks,
  dateRetired,
  isGwp,
  gwpWithSetNumber,
  imageSrc,
  images = [],
  audioSrc,
  subtitles = [],
  backgroundStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Dynamic theme colors
  const themePalette = React.useMemo(() => getThemePalette(theme, name), [theme, name]);

  // Intro header animation
  const headerEntrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Floating studs background rotation
  const bgRotation = (frame * 0.12) % 360;

  // Subtitles / Voiceover sync: find active word with gap-holding to prevent rapid oscillation
  const currentTimeMs = (frame / fps) * 1000;
  let activeWordIndex = -1;
  for (let i = 0; i < subtitles.length; i++) {
    const w = subtitles[i];
    if (currentTimeMs >= w.start && currentTimeMs <= w.end) {
      activeWordIndex = i;
      break;
    }
    if (
      i > 0 &&
      currentTimeMs > subtitles[i - 1].end &&
      currentTimeMs < w.start &&
      currentTimeMs - subtitles[i - 1].end < 280
    ) {
      activeWordIndex = i - 1;
      break;
    }
  }

  // 1. Build Time Statement Cue (Top-Right Box)
  const buildEntranceWordIndex = React.useMemo(() => {
    return subtitles.findIndex((w) => {
      const clean = w.word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return ['built', 'build', 'took', 'assemble', 'hour', 'hours', 'minute', 'minutes'].some((term) =>
        clean.includes(term)
      );
    });
  }, [subtitles]);

  const buildEntranceFrame = React.useMemo(() => {
    if (buildEntranceWordIndex >= 0 && subtitles[buildEntranceWordIndex]) {
      return Math.max(1, Math.floor((subtitles[buildEntranceWordIndex].start / 1000) * fps));
    }
    return 15;
  }, [buildEntranceWordIndex, subtitles, fps]);

  // 2. Piece Cue (Top-Left Pieces Box)
  const pieceWordIndex = React.useMemo(() => {
    return subtitles.findIndex((w) => {
      const clean = w.word.toLowerCase().replace(/[^a-z0-9]/g, '');
      const piecesStr = pieces ? String(pieces) : '';
      return clean.includes('piece') || (piecesStr && clean.includes(piecesStr));
    });
  }, [subtitles, pieces]);

  const pieceStartFrame = React.useMemo(() => {
    if (pieceWordIndex >= 0 && subtitles[pieceWordIndex]) {
      return Math.max(1, Math.floor((subtitles[pieceWordIndex].start / 1000) * fps));
    }
    return buildEntranceFrame + 30;
  }, [pieceWordIndex, subtitles, fps, buildEntranceFrame]);

  const pieceCountDurationFrames = 36;
  const pieceEndFrame = pieceStartFrame + pieceCountDurationFrames;
  const isCountingPieces = frame >= pieceStartFrame && frame <= pieceEndFrame;

  // 3. Build Duration Roll-up Cue (when hours/minutes are spoken)
  const buildDurationWordIndex = React.useMemo(() => {
    return subtitles.findIndex((w) => {
      const clean = w.word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.includes('hour') || clean.includes('minute');
    });
  }, [subtitles]);

  const buildDurationStartFrame = React.useMemo(() => {
    if (buildDurationWordIndex >= 0 && subtitles[buildDurationWordIndex]) {
      return Math.max(buildEntranceFrame, Math.floor((subtitles[buildDurationWordIndex].start / 1000) * fps));
    }
    return Math.max(buildEntranceFrame + 35, pieceEndFrame + 10);
  }, [buildDurationWordIndex, subtitles, fps, buildEntranceFrame, pieceEndFrame]);

  const buildDurationEndWordIndex = React.useMemo(() => {
    const startIdx = buildDurationWordIndex >= 0 ? buildDurationWordIndex : 0;
    for (let i = startIdx; i < subtitles.length; i++) {
      const clean = subtitles[i].word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes('minute') || clean.includes('assemble')) {
        return i;
      }
    }
    return -1;
  }, [subtitles, buildDurationWordIndex]);

  const buildDurationEndFrame = React.useMemo(() => {
    if (buildDurationEndWordIndex >= 0 && subtitles[buildDurationEndWordIndex]) {
      return Math.max(buildDurationStartFrame + 20, Math.floor((subtitles[buildDurationEndWordIndex].end / 1000) * fps));
    }
    return buildDurationStartFrame + 36;
  }, [buildDurationEndWordIndex, subtitles, fps, buildDurationStartFrame]);

  const isCountingBuildTime = frame >= buildDurationStartFrame && frame <= buildDurationEndFrame;

  // Slide Top-Right (Build Time) in just before the count-up to the duration begins
  const buildTimeEntranceFrame = React.useMemo(() => {
    return Math.max(pieceStartFrame + 10, buildDurationStartFrame - 8);
  }, [pieceStartFrame, buildDurationStartFrame]);

  const totalBuildMinutes = React.useMemo(
    () => parseTotalMinutes(timeToBuildFormatted, buildTimeHours),
    [timeToBuildFormatted, buildTimeHours]
  );

  // 4. Bottom Row Cues (Model Size & Status/Rating)
  const rankStatusWordIndex = React.useMemo(() => {
    const searchFrom = buildDurationEndWordIndex >= 0 ? buildDurationEndWordIndex : 0;
    for (let i = searchFrom; i < subtitles.length; i++) {
      const clean = subtitles[i].word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['largest', 'smallest', 'longest', 'fastest', 'rated', 'rating', 'score', 'collection', 'line', 'retired', 'gwp', 'first', 'second', '2nd', '3rd', '4th', '5th'].some((t) => clean.includes(t))) {
        return i;
      }
    }
    return -1;
  }, [subtitles, buildDurationEndWordIndex]);

  const bottomRowEntranceFrame = React.useMemo(() => {
    if (rankStatusWordIndex >= 0 && subtitles[rankStatusWordIndex]) {
      return Math.max(buildDurationEndFrame, Math.floor((subtitles[rankStatusWordIndex].start / 1000) * fps));
    }
    return buildDurationEndFrame + 12;
  }, [rankStatusWordIndex, subtitles, fps, buildDurationEndFrame]);

  const card1EntranceFrame = pieceStartFrame;
  const card2EntranceFrame = buildTimeEntranceFrame;
  const card3EntranceFrame = bottomRowEntranceFrame;
  const card4EntranceFrame = bottomRowEntranceFrame + 6;

  // Individual card spring entrances
  const card1Spring = spring({ frame: frame - card1EntranceFrame, fps, config: { damping: 12, mass: 0.75 } });
  const card2Spring = spring({ frame: frame - card2EntranceFrame, fps, config: { damping: 12, mass: 0.75 } });
  const card3Spring = spring({ frame: frame - card3EntranceFrame, fps, config: { damping: 12, mass: 0.75 } });
  const card4Spring = spring({ frame: frame - card4EntranceFrame, fps, config: { damping: 12, mass: 0.75 } });

  // Compute Pieces display value
  let pieceDisplayValue = '—';
  if (pieces) {
    if (frame < pieceStartFrame) {
      pieceDisplayValue = '—';
    } else if (frame <= pieceEndFrame) {
      const animated = Math.round(
        interpolate(frame, [pieceStartFrame, pieceEndFrame], [0, pieces], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      );
      pieceDisplayValue = animated.toLocaleString();
    } else {
      pieceDisplayValue = pieces.toLocaleString();
    }
  }

  // Compute Build Time display value
  let buildTimeDisplayValue = '—';
  const canonicalBuildTime = formatCompactTime(timeToBuildFormatted, buildTimeHours);
  if (totalBuildMinutes > 0) {
    if (frame < buildDurationStartFrame) {
      buildTimeDisplayValue = '—';
    } else if (frame <= buildDurationEndFrame) {
      const animMinutes = Math.round(
        interpolate(frame, [buildDurationStartFrame, buildDurationEndFrame], [0, totalBuildMinutes], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      );
      buildTimeDisplayValue = formatMinutes(animMinutes);
    } else {
      buildTimeDisplayValue = canonicalBuildTime;
    }
  } else if (canonicalBuildTime !== '—') {
    buildTimeDisplayValue = canonicalBuildTime;
  }

  // Hero image fly-in spring entrance
  const heroImageEntrance = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.9 },
  });

  // Slideshow photo list
  const photoList = React.useMemo(() => {
    const list: string[] = [];
    if (imageSrc) list.push(imageSrc);
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img && !list.includes(img)) {
          list.push(img);
        }
      }
    }
    return list.slice(0, 6);
  }, [imageSrc, images]);

  const totalPhotos = photoList.length;
  const framesPerPhoto = totalPhotos > 0 ? Math.floor(durationInFrames / totalPhotos) : durationInFrames;
  const crossfadeFrames = Math.min(20, Math.max(12, Math.floor(framesPerPhoto * 0.15)));
  const activePhotoIdx = totalPhotos > 0 ? Math.min(totalPhotos - 1, Math.floor(frame / framesPerPhoto)) : 0;

  // Sliding caption window
  let visibleSubtitles: { word: string; active: boolean }[] = [];
  if (subtitles.length > 0) {
    const currentOrNextIdx =
      activeWordIndex >= 0
        ? activeWordIndex
        : subtitles.findIndex((w) => w.start > currentTimeMs);

    const anchorIdx = currentOrNextIdx >= 0 ? currentOrNextIdx : subtitles.length - 1;
    const windowStart = Math.max(0, anchorIdx - 2);
    const windowEnd = Math.min(subtitles.length, anchorIdx + 3);

    visibleSubtitles = subtitles.slice(windowStart, windowEnd).map((item, idx) => ({
      word: item.word,
      active: windowStart + idx === activeWordIndex,
    }));
  }

  // Card 1: Pieces (Top-Left)
  const card1: TelemetryCardData = {
    icon: '🧱',
    label: 'PIECES',
    value: pieceDisplayValue,
    sub: pieces && pieces > 4000 ? 'Massive set' : pieces && pieces > 1800 ? 'Large build' : 'Piece count',
    entranceFrame: card1EntranceFrame,
    spring: card1Spring,
  };

  // Card 2: Build Time & Span (Top-Right)
  const card2: TelemetryCardData = {
    icon: '⏱️',
    label: 'BUILD TIME',
    value: buildTimeDisplayValue,
    sub: buildSpanText
      ? (buildSpanText.toLowerCase().startsWith('over') ? buildSpanText : `Over ${buildSpanText}`)
      : (buildTimeHours ? 'Active build time' : 'Personal build'),
    entranceFrame: card2EntranceFrame,
    spring: card2Spring,
  };

  // Card 3: Dimensions / Model Size
  let card3Value = '—';
  let card3Sub = 'Official size';
  if (dimensions && (dimensions.width || dimensions.height || dimensions.depth)) {
    const primaryW = dimensions.width || dimensions.depth;
    const primaryH = dimensions.height;
    if (primaryW && primaryH) {
      card3Value = `${primaryW} × ${primaryH} cm`;
    } else if (primaryW) {
      card3Value = `${primaryW} cm wide`;
    } else if (primaryH) {
      card3Value = `${primaryH} cm high`;
    }
    if (dimensions.depth && dimensions.width) {
      card3Sub = `${dimensions.depth} cm depth`;
    } else if (dimensions.height) {
      card3Sub = `${dimensions.height} cm height`;
    }
  } else if (instructionBooks) {
    card3Value = `${instructionBooks} ${instructionBooks === 1 ? 'Book' : 'Books'}`;
    card3Sub = 'Instruction manuals';
  } else if (age) {
    card3Value = `Ages ${age}`;
    card3Sub = 'Recommended age';
  }

  const card3: TelemetryCardData = {
    icon: '📐',
    label: 'MODEL SIZE',
    value: card3Value,
    sub: card3Sub,
    entranceFrame: card3EntranceFrame,
    spring: card3Spring,
  };

  // Card 4: Edition / Rating / Status
  let card4Icon = '⭐';
  let card4Label = 'RATING';
  let card4Value = 'Official';
  let card4Sub = 'Lego collection';

  if (isGwp) {
    card4Icon = '🎁';
    card4Label = 'EDITION';
    card4Value = 'GWP';
    card4Sub = gwpWithSetNumber ? `With #${gwpWithSetNumber}` : 'Gift with purchase';
  } else if (ratingBuild !== undefined || ratingLooks !== undefined) {
    card4Icon = '⭐';
    card4Label = 'USER SCORE';
    card4Value = `${ratingBuild ?? ratingLooks}/5 ★`;
    card4Sub = ratingLooks !== undefined ? `Looks: ${ratingLooks}/5 ★` : 'Personal rating';
  } else if (dateRetired) {
    card4Icon = '🏛️';
    card4Label = 'STATUS';
    card4Value = 'Retired';
    card4Sub = dateRetired.length > 16 ? dateRetired.slice(0, 16) : dateRetired;
  } else if (rating) {
    card4Icon = '⭐';
    card4Label = 'RATING';
    card4Value = `${rating.toFixed(1)} / 5 ★`;
    card4Sub = 'Community score';
  } else if (age) {
    card4Icon = '🎯';
    card4Label = 'TARGET AGE';
    card4Value = `Ages ${age}`;
    card4Sub = 'Official rating';
  } else if (collection) {
    card4Icon = '🏷️';
    card4Label = 'SERIES';
    card4Value = collection;
    card4Sub = 'Display collection';
  }

  const card4: TelemetryCardData = {
    icon: card4Icon,
    label: card4Label,
    value: card4Value,
    sub: card4Sub,
    entranceFrame: card4EntranceFrame,
    spring: card4Spring,
  };

  const cards = [card1, card2, card3, card4];

  // Resolve background style: explicit prop > plasma for Star Wars / Space sets > blur default
  const resolvedBgStyle = React.useMemo(() => {
    if (backgroundStyle) return backgroundStyle;
    if (themePalette.isSpaceTheme || (theme || '').toLowerCase().includes('star wars')) {
      return 'plasma';
    }
    return 'blur';
  }, [backgroundStyle, themePalette.isSpaceTheme, theme]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050811',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Video Progress Scrubber */}
      <ProgressBar
        frame={frame}
        durationInFrames={durationInFrames}
        themePalette={themePalette}
      />

      {/* 4. Vivid Theme Background: Blur default, Plasma for Star Wars, or Baseplate */}
      <Background
        frame={frame}
        durationInFrames={durationInFrames}
        bgRotation={bgRotation}
        themePalette={themePalette}
        photoList={photoList}
        framesPerPhoto={framesPerPhoto}
        crossfadeFrames={crossfadeFrames}
        backgroundStyle={resolvedBgStyle}
      />

      {/* Top Header Card / Identity */}
      <Header
        id={id}
        name={name}
        year={year}
        theme={theme}
        collection={collection}
        headerEntrance={headerEntrance}
        themePalette={themePalette}
      />

      {/* Hero Stock Photo Slideshow */}
      <HeroSlideshow
        frame={frame}
        durationInFrames={durationInFrames}
        heroImageEntrance={heroImageEntrance}
        photoList={photoList}
        totalPhotos={totalPhotos}
        activePhotoIdx={activePhotoIdx}
        framesPerPhoto={framesPerPhoto}
        crossfadeFrames={crossfadeFrames}
      />

      {/* 4-Box Telemetry / Info Dashboard */}
      <TelemetryGrid
        frame={frame}
        cards={cards}
        isPieceActive={isCountingPieces}
        isBuildActive={isCountingBuildTime}
        themePalette={themePalette}
      />

      {/* Synchronized Captions / Subtitle Bar */}
      <SubtitleBar
        visibleSubtitles={visibleSubtitles}
        themePalette={themePalette}
      />

      {/* Bottom Footer / Brand Badge */}
      <Footer />

      {/* 6. Procedural Sound Effects (SFX) */}
      <Sequence from={2} durationInFrames={18}>
        <Audio src={WHOOSH_SFX} volume={0.4} />
      </Sequence>

      {card1EntranceFrame > 0 && card1EntranceFrame < durationInFrames && (
        <Sequence from={card1EntranceFrame} durationInFrames={15}>
          <Audio src={CARD_SNAP_SFX} volume={0.35} />
        </Sequence>
      )}

      {card2EntranceFrame > 0 && card2EntranceFrame < durationInFrames && (
        <Sequence from={card2EntranceFrame} durationInFrames={15}>
          <Audio src={CARD_SNAP_SFX} volume={0.35} />
        </Sequence>
      )}

      {card3EntranceFrame > 0 && card3EntranceFrame < durationInFrames && (
        <Sequence from={card3EntranceFrame} durationInFrames={15}>
          <Audio src={CARD_SNAP_SFX} volume={0.35} />
        </Sequence>
      )}

      {/* Voiceover Narration Audio Track */}
      {audioSrc && <Audio src={audioSrc} />}
    </AbsoluteFill>
  );
};
