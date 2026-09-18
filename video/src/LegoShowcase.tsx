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

export const LegoShowcase: React.FC<LegoShowcaseProps> = ({
  id,
  name,
  theme,
  year,
  pieces,
  buildTimeHours,
  timeToBuildFormatted,
  imageSrc,
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

  // Photo subtle Ken Burns pan and scale
  const imageScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.02, 1.15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const imageTranslateY = interpolate(
    frame,
    [0, durationInFrames],
    [0, -25],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Floating studs background animation
  const bgRotation = (frame * 0.15) % 360;

  // Stats badges entrance spring staggered
  const stat1Spring = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const stat2Spring = spring({ frame: frame - 15, fps, config: { damping: 12 } });

  // Piece counter animation
  const animatedPieces = Math.round(
    interpolate(
      frame,
      [15, 60],
      [0, pieces || 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  );

  // Subtitles / Voiceover sync: find active word
  const currentTimeMs = (frame / fps) * 1000;
  const activeWordIndex = subtitles.findIndex(
    (w) => currentTimeMs >= w.start && currentTimeMs <= w.end
  );

  // Create sliding caption window (shows 3-5 words at a time)
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
      {/* Background Ambience: Subtle Lego studs pattern */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          right: -200,
          bottom: -200,
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.04) 2px, transparent 2px)',
          backgroundSize: '48px 48px',
          transform: `rotate(${bgRotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle glowing radial background highlight behind the model */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          width: 700,
          height: 700,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(5, 8, 17, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Card / Identity */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 60,
          right: 60,
          opacity: headerEntrance,
          transform: `translateY(${(1 - headerEntrance) * -40}px)`,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              border: '2px solid rgba(245, 158, 11, 0.6)',
              color: '#fbbf24',
              fontWeight: 800,
              fontSize: 28,
              padding: '6px 18px',
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
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: 26,
                padding: '6px 16px',
                borderRadius: 999,
              }}
            >
              {year}
            </div>
          )}
        </div>

        {theme && (
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#f59e0b',
              marginBottom: 8,
            }}
          >
            {theme}
          </div>
        )}

        <h1
          style={{
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </h1>
      </div>

      {/* Hero Stock Photo with Ken Burns Animation & Drop Shadow */}
      <div
        style={{
          position: 'absolute',
          top: 480,
          left: 50,
          right: 50,
          height: 620,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <Img
          src={imageSrc}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${imageScale}) translateY(${imageTranslateY}px)`,
            filter: 'drop-shadow(0 35px 50px rgba(0, 0, 0, 0.9))',
          }}
        />
      </div>

      {/* 2-Stat Glassmorphism Metric Badges */}
      <div
        style={{
          position: 'absolute',
          top: 1140,
          left: 60,
          right: 60,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 24,
          zIndex: 10,
        }}
      >
        {/* Pieces Badge */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1.5px solid rgba(51, 65, 85, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: 24,
            padding: '24px 20px',
            textAlign: 'center',
            opacity: stat1Spring,
            transform: `translateY(${(1 - stat1Spring) * 30}px)`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 8,
            }}
          >
            Pieces
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: '#f8fafc',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pieces ? animatedPieces.toLocaleString() : '—'}
          </div>
        </div>

        {/* Build Time Badge */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1.5px solid rgba(51, 65, 85, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: 24,
            padding: '24px 20px',
            textAlign: 'center',
            opacity: stat2Spring,
            transform: `translateY(${(1 - stat2Spring) * 30}px)`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 8,
            }}
          >
            Build Time
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: '#fbbf24',
            }}
          >
            {timeToBuildFormatted || (buildTimeHours ? `${buildTimeHours}h` : '—')}
          </div>
        </div>
      </div>

      {/* Synchronized Captions / Subtitle Bar */}
      {visibleSubtitles.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 250,
            left: 60,
            right: 60,
            minHeight: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 24,
            padding: '20px 30px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
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
                  fontSize: item.active ? 40 : 34,
                  fontWeight: item.active ? 900 : 600,
                  color: item.active ? '#f59e0b' : 'rgba(255, 255, 255, 0.8)',
                  transform: item.active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease-out',
                  textShadow: item.active
                    ? '0 0 20px rgba(245, 158, 11, 0.6)'
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
          bottom: 100,
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
            gap: 12,
            padding: '12px 28px',
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ fontSize: 24 }}>🧱</span>
          <span
            style={{
              fontSize: 22,
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
