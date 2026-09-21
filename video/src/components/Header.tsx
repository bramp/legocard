import React from 'react';
import type { ThemePalette } from '../theme';

interface HeaderProps {
  id: string;
  name: string;
  year?: number;
  theme?: string;
  collection?: string;
  headerEntrance: number;
  themePalette: ThemePalette;
}

export const Header: React.FC<HeaderProps> = ({
  id,
  name,
  year,
  theme,
  collection,
  headerEntrance,
  themePalette,
}) => {
  return (
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
            backgroundColor: themePalette.badgeBg,
            border: `2px solid ${themePalette.badgeBorder}`,
            color: themePalette.accentText,
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
            color: themePalette.primary,
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
  );
};
