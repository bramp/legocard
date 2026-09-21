import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { LegoShowcaseProps } from './types';

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
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Intro header animation
  const headerEntrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Staggered springs for 4 info cards
  const card1Spring = spring({ frame: frame - 6, fps, config: { damping: 13 } });
  const card2Spring = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const card3Spring = spring({ frame: frame - 14, fps, config: { damping: 13 } });
  const card4Spring = spring({ frame: frame - 18, fps, config: { damping: 13 } });

  // Floating studs background subtle rotation
  const bgRotation = (frame * 0.12) % 360;

  // Animated piece counter
  const animatedPieces = Math.round(
    interpolate(
      frame,
      [10, 55],
      [0, pieces || 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  );

  // Slideshow photo list: start with primary imageSrc, add any alternate photos, capped to 6
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
  // Frame allocation per photo
  const framesPerPhoto = totalPhotos > 0 ? Math.floor(durationInFrames / totalPhotos) : durationInFrames;
  const crossfadeFrames = Math.min(20, Math.max(10, Math.floor(framesPerPhoto * 0.15)));
  const activePhotoIdx = totalPhotos > 0 ? Math.min(totalPhotos - 1, Math.floor(frame / framesPerPhoto)) : 0;

  // Subtitles / Voiceover sync: find active word
  const currentTimeMs = (frame / fps) * 1000;
  const activeWordIndex = subtitles.findIndex(
    (w) => currentTimeMs >= w.start && currentTimeMs <= w.end
  );

  // Sliding caption window (shows 3-5 words at a time)
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

  // Card 1: Pieces
  const card1 = {
    icon: '🧱',
    label: 'PIECES',
    value: pieces ? animatedPieces.toLocaleString() : '—',
    sub: pieces && pieces > 4000 ? 'Massive set' : pieces && pieces > 1800 ? 'Large build' : 'Piece count',
    spring: card1Spring,
  };

  // Card 2: Build Time & Span
  const card2 = {
    icon: '⏱️',
    label: 'BUILD TIME',
    value: formatCompactTime(timeToBuildFormatted, buildTimeHours),
    sub: buildSpanText
      ? (buildSpanText.toLowerCase().startsWith('over') ? buildSpanText : `Over ${buildSpanText}`)
      : (buildTimeHours ? 'Active build time' : 'Personal build'),
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

  const card3 = {
    icon: '📐',
    label: 'MODEL SIZE',
    value: card3Value,
    sub: card3Sub,
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

  const card4 = {
    icon: card4Icon,
    label: card4Label,
    value: card4Value,
    sub: card4Sub,
    spring: card4Spring,
  };

  const cards = [card1, card2, card3, card4];

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
      {/* Background Ambience: Subtle rotating Lego studs pattern */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          right: -200,
          bottom: -200,
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.035) 2.5px, transparent 2.5px)',
          backgroundSize: '48px 48px',
          transform: `rotate(${bgRotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient warm radial spotlight behind the hero model */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          left: '50%',
          width: 900,
          height: 900,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(30, 58, 138, 0.08) 50%, rgba(5, 8, 17, 0) 75%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Card / Identity */}
      <div
        style={{
          position: 'absolute',
          top: 75,
          left: 50,
          right: 50,
          opacity: headerEntrance,
          transform: `translateY(${(1 - headerEntrance) * -35}px)`,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.22)',
              border: '2px solid rgba(245, 158, 11, 0.7)',
              color: '#fbbf24',
              fontWeight: 800,
              fontSize: 26,
              padding: '5px 18px',
              borderRadius: 999,
              letterSpacing: '1px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            #{id}
          </div>
          {year && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#cbd5e1',
                fontWeight: 700,
                fontSize: 24,
                padding: '5px 16px',
                borderRadius: 999,
              }}
            >
              {year}
            </div>
          )}
          {collection && (
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd',
                fontWeight: 700,
                fontSize: 22,
                padding: '5px 16px',
                borderRadius: 999,
                letterSpacing: '0.5px',
              }}
            >
              {collection}
            </div>
          )}
        </div>

        {theme && (
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#f59e0b',
              marginBottom: 6,
            }}
          >
            {theme}
          </div>
        )}

        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            margin: 0,
            textShadow: '0 4px 25px rgba(0,0,0,0.9)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </h1>
      </div>

      {/* Hero Stock Photo Slideshow: Expanded to 820px Height */}
      <div
        style={{
          position: 'absolute',
          top: 290,
          left: 40,
          right: 40,
          height: 820,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        {photoList.map((src, idx) => {
          const photoStart = idx === 0 ? 0 : idx * framesPerPhoto - crossfadeFrames;
          const photoEnd = idx === totalPhotos - 1 ? durationInFrames : (idx + 1) * framesPerPhoto;

          // Only render when inside or neighboring the active window
          if (frame < photoStart - 5 || frame > photoEnd + 5) {
            return null;
          }

          // Cross-fade opacity computation
          let opacity = 1;
          if (totalPhotos > 1) {
            if (idx === 0) {
              opacity = interpolate(
                frame,
                [photoEnd - crossfadeFrames, photoEnd],
                [1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
            } else if (idx === totalPhotos - 1) {
              opacity = interpolate(
                frame,
                [photoStart, photoStart + crossfadeFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
            } else {
              opacity = interpolate(
                frame,
                [photoStart, photoStart + crossfadeFrames, photoEnd - crossfadeFrames, photoEnd],
                [0, 1, 1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
            }
          }

          // Alternating subtle Ken Burns pan and zoom per slide
          const isEven = idx % 2 === 0;
          const scale = interpolate(
            frame,
            [photoStart, photoEnd],
            isEven ? [1.02, 1.10] : [1.10, 1.02],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          const translateY = interpolate(
            frame,
            [photoStart, photoEnd],
            isEven ? [0, -16] : [-16, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <Img
              key={idx}
              src={src}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity,
                transform: `scale(${scale}) translateY(${translateY}px)`,
                filter: 'drop-shadow(0 35px 55px rgba(0, 0, 0, 0.95))',
              }}
            />
          );
        })}

        {/* Multi-Photo Counter Pill Badge */}
        {totalPhotos > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 16,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 18,
              fontWeight: 700,
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 10,
            }}
          >
            <span>📷</span>
            <span>
              {activePhotoIdx + 1} / {totalPhotos}
            </span>
          </div>
        )}
      </div>

      {/* 4-Box Telemetry / Info Dashboard */}
      <div
        style={{
          position: 'absolute',
          top: 1130,
          left: 50,
          right: 50,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          zIndex: 10,
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1.5px solid rgba(51, 65, 85, 0.75)',
              backdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: '18px 22px',
              opacity: card.spring,
              transform: `translateY(${(1 - card.spring) * 24}px)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{card.icon}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                }}
              >
                {card.label}
              </span>
            </div>

            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: idx === 1 ? '#fbbf24' : '#f8fafc',
                lineHeight: 1.15,
                margin: '2px 0',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.value}
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#38bdf8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Synchronized Captions / Subtitle Bar */}
      {visibleSubtitles.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 1440,
            left: 50,
            right: 50,
            minHeight: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(16px)',
            borderRadius: 24,
            padding: '20px 28px',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            zIndex: 15,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px 14px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {visibleSubtitles.map((item, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: item.active ? 38 : 32,
                  fontWeight: item.active ? 900 : 600,
                  color: item.active ? '#f59e0b' : 'rgba(255, 255, 255, 0.85)',
                  transform: item.active ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.15s ease-out',
                  textShadow: item.active
                    ? '0 0 25px rgba(245, 158, 11, 0.8)'
                    : 'none',
                }}
              >
                {item.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Footer / Brand Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 60,
          right: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 24px',
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <span style={{ fontSize: 22 }}>🧱</span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#e2e8f0',
            }}
          >
            legocard.bramp.net
          </span>
        </div>
      </div>

      {/* Voiceover Narration Audio Track */}
      {audioSrc && <Audio src={audioSrc} />}
    </AbsoluteFill>
  );
};
