import React from 'react';
import type { ThemePalette } from '../theme';

export interface TelemetryCardData {
  icon: string;
  label: string;
  value: string;
  sub: string;
  entranceFrame: number;
  spring: number;
}

interface TelemetryGridProps {
  frame: number;
  cards: TelemetryCardData[];
  isPieceActive: boolean;
  isBuildActive: boolean;
  themePalette: ThemePalette;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  frame,
  cards,
  isPieceActive,
  isBuildActive,
  themePalette,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 1134, // Shifted up 96px (~1/20 of 1920px canvas) from 1230px
        left: 50,
        right: 50,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        zIndex: 10,
      }}
    >
      {cards.map((card, idx) => {
        const col = (idx % 2) + 1;
        const row = Math.floor(idx / 2) + 1;

        // Before narration cue, do not render box
        if (frame < card.entranceFrame) {
          return (
            <div
              key={idx}
              style={{
                gridColumn: col,
                gridRow: row,
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
            />
          );
        }

        // idx 0 (Pieces) & idx 2 (Model Size) are in Column 1 (Left)
        // idx 1 (Build Time) & idx 3 (Status) are in Column 2 (Right)
        const isFromLeft = idx % 2 === 0;

        const isActive = (idx === 0 && isPieceActive) || (idx === 1 && isBuildActive);
        const cardScale = (0.88 + card.spring * 0.12) * (isActive ? 1.05 : 1);
        const cardBorderColor = isActive ? themePalette.primary : 'rgba(51, 65, 85, 0.75)';
        const cardBoxShadow = isActive
          ? `0 12px 35px ${themePalette.glow}`
          : '0 10px 25px rgba(0,0,0,0.5)';

        // Fly in from side of the page (left: -500px, right: +500px)
        const flyX = (1 - card.spring) * (isFromLeft ? -500 : 500);

        return (
          <div
            key={idx}
            style={{
              gridColumn: col,
              gridRow: row,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: `1.5px solid ${cardBorderColor}`,
              backdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: '18px 22px',
              opacity: card.spring,
              transform: `translateX(${flyX}px) scale(${cardScale})`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: cardBoxShadow,
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
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
                color: isActive ? themePalette.primary : idx === 1 ? themePalette.primary : '#f8fafc',
                lineHeight: 1.15,
                margin: '2px 0',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: isActive ? `0 0 16px ${themePalette.glow}` : 'none',
              }}
            >
              {card.value}
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: themePalette.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
