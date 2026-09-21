import React from 'react';
import type { ThemePalette } from '../theme';

interface ProgressBarProps {
  frame: number;
  durationInFrames: number;
  themePalette: ThemePalette;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  frame,
  durationInFrames,
  themePalette,
}) => {
  const progressPercent = Math.min(
    100,
    Math.max(0, ((frame + 1) / durationInFrames) * 100)
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        zIndex: 60,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: `linear-gradient(90deg, ${themePalette.secondary}, ${themePalette.primary})`,
          boxShadow: `0 0 20px ${themePalette.primary}, 0 0 8px #ffffff`,
          position: 'relative',
        }}
      >
        {/* Leading Spark Glow Tip */}
        <div
          style={{
            position: 'absolute',
            right: -4,
            top: -3,
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 16px 4px ${themePalette.primary}`,
          }}
        />
      </div>
    </div>
  );
};
