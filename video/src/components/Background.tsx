import React from 'react';
import { Img, interpolate } from 'remotion';
import type { ThemePalette } from '../theme';

interface BackgroundProps {
  frame: number;
  durationInFrames: number;
  bgRotation: number;
  themePalette: ThemePalette;
  photoList: string[];
  framesPerPhoto: number;
  crossfadeFrames: number;
}

const PARTICLES = [
  { id: 0, x: 120, y: 350, size: 8, speed: 0.7, phase: 0 },
  { id: 1, x: 260, y: 720, size: 12, speed: 0.9, phase: 1.2 },
  { id: 2, x: 880, y: 480, size: 6, speed: 0.5, phase: 2.1 },
  { id: 3, x: 940, y: 920, size: 10, speed: 0.8, phase: 0.8 },
  { id: 4, x: 180, y: 1150, size: 7, speed: 0.6, phase: 3.4 },
  { id: 5, x: 420, y: 250, size: 11, speed: 1.0, phase: 1.8 },
  { id: 6, x: 760, y: 1350, size: 8, speed: 0.7, phase: 2.5 },
  { id: 7, x: 320, y: 1580, size: 13, speed: 1.1, phase: 4.1 },
  { id: 8, x: 620, y: 640, size: 6, speed: 0.6, phase: 0.5 },
  { id: 9, x: 820, y: 220, size: 9, speed: 0.8, phase: 3.1 },
  { id: 10, x: 150, y: 840, size: 10, speed: 0.7, phase: 2.7 },
  { id: 11, x: 520, y: 1080, size: 7, speed: 0.5, phase: 1.5 },
  { id: 12, x: 910, y: 1520, size: 12, speed: 0.9, phase: 3.8 },
  { id: 13, x: 380, y: 410, size: 8, speed: 0.6, phase: 0.9 },
  { id: 14, x: 710, y: 810, size: 11, speed: 1.0, phase: 2.2 },
  { id: 15, x: 230, y: 1390, size: 6, speed: 0.5, phase: 4.5 },
];

export const Background: React.FC<BackgroundProps> = ({
  frame,
  durationInFrames,
  bgRotation,
  themePalette,
  photoList,
  framesPerPhoto,
  crossfadeFrames,
}) => {
  const totalPhotos = photoList.length;

  return (
    <>
      {/* 1. Seamless Full-Bleed Ambient Backdrop with Cross-fading */}
      {photoList.map((src, idx) => {
        const photoStart = idx === 0 ? 0 : idx * framesPerPhoto - crossfadeFrames;
        const photoEnd = idx === totalPhotos - 1 ? durationInFrames : (idx + 1) * framesPerPhoto;

        if (frame < photoStart - 5 || frame > photoEnd + 5) {
          return null;
        }

        let opacity = 0.68;
        if (totalPhotos > 1) {
          if (idx === 0) {
            opacity = interpolate(
              frame,
              [photoEnd - crossfadeFrames, photoEnd],
              [0.68, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          } else if (idx === totalPhotos - 1) {
            opacity = interpolate(
              frame,
              [photoStart, photoStart + crossfadeFrames],
              [0, 0.68],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          } else {
            opacity = interpolate(
              frame,
              [photoStart, photoStart + crossfadeFrames, photoEnd - crossfadeFrames, photoEnd],
              [0, 0.68, 0.68, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          }
        }

        return (
          <div
            key={`bg-photo-${idx}`}
            style={{
              position: 'absolute',
              top: -120,
              left: -120,
              right: -120,
              bottom: -120,
              overflow: 'hidden',
              pointerEvents: 'none',
              opacity,
              zIndex: 0,
            }}
          >
            <Img
              src={src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(50px) saturate(2.2) brightness(0.55)',
                transform: `scale(1.2) translateY(${interpolate(frame, [0, durationInFrames], [20, -20])}px)`,
              }}
            />
          </div>
        );
      })}

      {/* Darkening vignette overlay to ensure foreground and cards stand out */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.3) 20%, rgba(5, 8, 17, 0.78) 75%, rgba(5, 8, 17, 0.95) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 2. 3D Embossed Lego Studs Matrix */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          right: -200,
          bottom: -200,
          backgroundImage:
            'radial-gradient(circle at 38% 38%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.14) 28%, rgba(0, 0, 0, 0.55) 55%, transparent 68%)',
          backgroundSize: '52px 52px',
          transform: `rotate(${bgRotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. Ambient Theme Radial Spotlight */}
      <div
        style={{
          position: 'absolute',
          top: 660,
          left: '50%',
          width: 950,
          height: 950,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${themePalette.glow} 0%, rgba(5, 8, 17, 0.0) 70%)`,
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 4. Floating Theme Particles (Luminous Bokeh) */}
      {PARTICLES.map((p) => {
        const currentY = ((p.y - frame * p.speed * 1.8) % 1920 + 1920) % 1920;
        const currentX = p.x + Math.sin(frame * 0.03 + p.phase) * 28;
        const particleOpacity = 0.35 + 0.3 * Math.sin(frame * 0.05 + p.phase);

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: currentY,
              left: currentX,
              width: p.size + 2,
              height: p.size + 2,
              borderRadius: '50%',
              backgroundColor: themePalette.primary,
              boxShadow: `0 0 16px 3px ${themePalette.primary}`,
              opacity: particleOpacity,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        );
      })}
    </>
  );
};
