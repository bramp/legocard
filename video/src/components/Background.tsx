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
  backgroundStyle?: 'baseplate' | 'ambient' | 'blur' | 'plasma';
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
  backgroundStyle = 'blur',
}) => {
  const totalPhotos = photoList.length;

  if (backgroundStyle === 'baseplate') {
    return (
      <>
        {/* Authentic Physical LEGO Baseplate Texture with embossed LEGO studs */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <radialGradient id="studFaceGrad" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
              </radialGradient>
              <linearGradient id="studRimGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="45%" stopColor="transparent" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
              </linearGradient>
              <pattern id="legoBaseplateStud" width="54" height="54" patternUnits="userSpaceOnUse">
                {/* Stud Drop Shadow */}
                <circle cx="29" cy="30" r="16" fill="#000000" opacity="0.55" />
                {/* Stud Rim (Cylinder bevel) */}
                <circle cx="27" cy="27" r="16" fill={themePalette.baseplateStud} />
                <circle cx="27" cy="27" r="16" fill="url(#studRimGrad)" />
                {/* Stud Flat Top Face */}
                <circle cx="27" cy="27" r="13.5" fill={themePalette.baseplateStud} />
                <circle cx="27" cy="27" r="13.5" fill="url(#studFaceGrad)" />
                {/* Embossed LEGO Logo */}
                <text
                  x="27.5"
                  y="27.8"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontWeight="900"
                  fontStyle="italic"
                  fontSize="8.5"
                  fill="#000000"
                  opacity="0.6"
                  textAnchor="middle"
                  dominantBaseline="central"
                  letterSpacing="-0.4px"
                >
                  LEGO
                </text>
                <text
                  x="26.5"
                  y="26.3"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontWeight="900"
                  fontStyle="italic"
                  fontSize="8.5"
                  fill="#ffffff"
                  opacity="0.35"
                  textAnchor="middle"
                  dominantBaseline="central"
                  letterSpacing="-0.4px"
                >
                  LEGO
                </text>
                <text
                  x="27"
                  y="27"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontWeight="900"
                  fontStyle="italic"
                  fontSize="8.5"
                  fill={themePalette.baseplateStud}
                  textAnchor="middle"
                  dominantBaseline="central"
                  letterSpacing="-0.4px"
                >
                  LEGO
                </text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={themePalette.baseplateBg} />
            <rect width="100%" height="100%" fill="url(#legoBaseplateStud)" />
          </svg>
        </div>

        {/* Ambient Theme Radial Spotlight shining across the baseplate */}
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

        {/* Soft edge vignette framing the tabletop */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.0) 35%, rgba(5, 8, 17, 0.55) 75%, rgba(5, 8, 17, 0.88) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </>
    );
  }

  // 2. Fluid Organic Plasma Background
  if (backgroundStyle === 'plasma') {
    const blob1X = 260 + Math.cos(frame * 0.016) * 190;
    const blob1Y = 420 + Math.sin(frame * 0.02) * 170;

    const blob2X = 520 + Math.sin(frame * 0.022) * 220;
    const blob2Y = 820 + Math.cos(frame * 0.018) * 190;

    const blob3X = 220 + Math.cos(frame * 0.019 + 1.2) * 180;
    const blob3Y = 1200 + Math.sin(frame * 0.015 + 0.8) * 210;

    const blob4X = 600 + Math.sin(frame * 0.017) * 160;
    const blob4Y = 250 + Math.cos(frame * 0.024) * 130;

    const tertiaryColor = themePalette.isSpaceTheme ? '#6366f1' : '#c026d3';

    return (
      <>
        {/* Plasma Canvas Base */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#050811',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {/* Blob 1: Primary Theme Aura */}
          <div
            style={{
              position: 'absolute',
              top: blob1Y - 450,
              left: blob1X - 450,
              width: 900,
              height: 900,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themePalette.primary} 0%, rgba(0,0,0,0) 68%)`,
              filter: 'blur(95px)',
              opacity: 0.55,
            }}
          />

          {/* Blob 2: Secondary Theme Wave */}
          <div
            style={{
              position: 'absolute',
              top: blob2Y - 480,
              left: blob2X - 480,
              width: 960,
              height: 960,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themePalette.secondary} 0%, rgba(0,0,0,0) 68%)`,
              filter: 'blur(105px)',
              opacity: 0.5,
            }}
          />

          {/* Blob 3: Deep Jewel Tone Contrast */}
          <div
            style={{
              position: 'absolute',
              top: blob3Y - 420,
              left: blob3X - 420,
              width: 840,
              height: 840,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${tertiaryColor} 0%, rgba(0,0,0,0) 68%)`,
              filter: 'blur(90px)',
              opacity: 0.4,
            }}
          />

          {/* Blob 4: Glowing Specular Top Highlight */}
          <div
            style={{
              position: 'absolute',
              top: blob4Y - 360,
              left: blob4X - 360,
              width: 720,
              height: 720,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themePalette.accentText} 0%, rgba(0,0,0,0) 68%)`,
              filter: 'blur(85px)',
              opacity: 0.42,
            }}
          />
        </div>

        {/* Ambient Theme Radial Spotlight */}
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

        {/* Darkening vignette overlay to ensure foreground and cards stand out */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.25) 20%, rgba(5, 8, 17, 0.72) 75%, rgba(5, 8, 17, 0.95) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Floating Theme Particles */}
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
  }

  // 3. Large Blurred Photo Background ('blur') or Hybrid ('ambient')
  return (
    <>
      {/* Seamless Full-Bleed Ambient Backdrop with Cross-fading */}
      {photoList.map((src, idx) => {
        const photoStart = idx === 0 ? 0 : idx * framesPerPhoto - crossfadeFrames;
        const photoEnd = idx === totalPhotos - 1 ? durationInFrames : (idx + 1) * framesPerPhoto;

        if (frame < photoStart - 5 || frame > photoEnd + 5) {
          return null;
        }

        let opacity = 0.72;
        if (totalPhotos > 1) {
          if (idx === 0) {
            opacity = interpolate(
              frame,
              [photoEnd - crossfadeFrames, photoEnd],
              [0.72, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          } else if (idx === totalPhotos - 1) {
            opacity = interpolate(
              frame,
              [photoStart, photoStart + crossfadeFrames],
              [0, 0.72],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          } else {
            opacity = interpolate(
              frame,
              [photoStart, photoStart + crossfadeFrames, photoEnd - crossfadeFrames, photoEnd],
              [0, 0.72, 0.72, 0],
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
                filter: 'blur(55px) saturate(2.4) brightness(0.58)',
                transform: `scale(1.22) translateY(${interpolate(frame, [0, durationInFrames], [24, -24])}px)`,
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
            'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.25) 20%, rgba(5, 8, 17, 0.72) 75%, rgba(5, 8, 17, 0.95) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Rotating Studs Matrix (Only included for 'ambient', omitted for clean 'blur') */}
      {backgroundStyle === 'ambient' && (
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
      )}

      {/* Ambient Theme Radial Spotlight */}
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

      {/* Floating Theme Particles (Luminous Bokeh) */}
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
