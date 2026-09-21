import React from 'react';
import type { ThemePalette } from '../theme';

interface SubtitleBarProps {
  visibleSubtitles: { word: string; active: boolean }[];
  themePalette: ThemePalette;
}

export const SubtitleBar: React.FC<SubtitleBarProps> = ({
  visibleSubtitles,
  themePalette,
}) => {
  if (visibleSubtitles.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 1530,
        left: 40,
        right: 40,
        minHeight: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        padding: '20px 32px',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
        zIndex: 15,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px 22px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {visibleSubtitles.map((item, idx) => (
          <span
            key={idx}
            style={{
              fontSize: 64, // Exact constant font size prevents line reflow & oscillation
              lineHeight: 1.25,
              fontWeight: item.active ? 900 : 700,
              color: item.active ? themePalette.primary : 'rgba(255, 255, 255, 0.72)',
              textShadow: item.active
                ? `0 0 28px ${themePalette.glow}, 0 2px 8px rgba(0,0,0,0.8)`
                : 'none',
              transition: 'color 0.1s ease-out, text-shadow 0.1s ease-out',
            }}
          >
            {item.word}
          </span>
        ))}
      </div>
    </div>
  );
};
