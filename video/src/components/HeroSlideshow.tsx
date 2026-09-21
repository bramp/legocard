import React from 'react';
import { Img, interpolate } from 'remotion';

interface HeroSlideshowProps {
  frame: number;
  durationInFrames: number;
  heroImageEntrance: number;
  photoList: string[];
  totalPhotos: number;
  activePhotoIdx: number;
  framesPerPhoto: number;
  crossfadeFrames: number;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  frame,
  durationInFrames,
  heroImageEntrance,
  photoList,
  totalPhotos,
  activePhotoIdx,
  framesPerPhoto,
  crossfadeFrames,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 280,
        left: 40,
        right: 40,
        height: 780,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        opacity: heroImageEntrance,
        transform: `translateY(${(1 - heroImageEntrance) * 80}px) scale(${0.88 + heroImageEntrance * 0.12})`,
      }}
    >
      {photoList.map((src, idx) => {
        const photoStart = idx === 0 ? 0 : idx * framesPerPhoto - crossfadeFrames;
        const photoEnd = idx === totalPhotos - 1 ? durationInFrames : (idx + 1) * framesPerPhoto;

        if (frame < photoStart - 5 || frame > photoEnd + 5) {
          return null;
        }

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

        // Cinematic Ken Burns multi-axis camera motion per slide
        const motionType = idx % 4;
        let scale = 1.1;
        let translateX = 0;
        let translateY = 0;
        let rotate = 0;

        if (motionType === 0) {
          scale = interpolate(frame, [photoStart, photoEnd], [1.04, 1.22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateX = interpolate(frame, [photoStart, photoEnd], [-25, 30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateY = interpolate(frame, [photoStart, photoEnd], [10, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          rotate = interpolate(frame, [photoStart, photoEnd], [-0.8, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else if (motionType === 1) {
          scale = interpolate(frame, [photoStart, photoEnd], [1.22, 1.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateX = interpolate(frame, [photoStart, photoEnd], [35, -25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateY = interpolate(frame, [photoStart, photoEnd], [-15, 15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          rotate = interpolate(frame, [photoStart, photoEnd], [0.8, -0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else if (motionType === 2) {
          scale = interpolate(frame, [photoStart, photoEnd], [1.05, 1.20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateX = interpolate(frame, [photoStart, photoEnd], [-30, 20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateY = interpolate(frame, [photoStart, photoEnd], [25, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          rotate = interpolate(frame, [photoStart, photoEnd], [0.5, -0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else {
          scale = interpolate(frame, [photoStart, photoEnd], [1.18, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateX = interpolate(frame, [photoStart, photoEnd], [20, -30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          translateY = interpolate(frame, [photoStart, photoEnd], [-20, 20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          rotate = interpolate(frame, [photoStart, photoEnd], [-0.6, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        }

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
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
              filter: 'drop-shadow(0 35px 55px rgba(0, 0, 0, 0.95))',
            }}
          />
        );
      })}

      {/* Dynamic Light Sheen / Shimmer Sweep on entrance */}
      {frame < 45 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: 24,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -100,
              bottom: -100,
              width: 250,
              transform: `translateX(${interpolate(frame, [5, 38], [-350, 1000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px) skewX(-25deg)`,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.18) 50%, transparent 100%)',
              filter: 'blur(10px)',
            }}
          />
        </div>
      )}

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
  );
};
