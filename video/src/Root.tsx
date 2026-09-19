import React from 'react';
import { Composition, staticFile } from 'remotion';
import { LegoShowcase } from './LegoShowcase';
import type { LegoShowcaseProps } from './types';

const defaultShowcaseProps: LegoShowcaseProps = {
  id: '10234',
  name: 'Sydney Opera House',
  theme: 'Icons / Landmark',
  year: 2013,
  pieces: 2989,
  buildTimeHours: 7.37,
  timeToBuildFormatted: '7 hours 22 minutes',
  funFacts: 'Features 2,989 pieces recreating the iconic Australian landmark.',
  imageSrc: staticFile('images/10234.jpg'),
  audioSrc: staticFile('audio/10234.mp3'),
  subtitles: [
    { word: 'Lego', start: 100, end: 525 },
    { word: 'set', start: 538, end: 826 },
    { word: '10234:', start: 838, end: 2501 },
    { word: 'Sydney', start: 2763, end: 3213 },
    { word: 'Opera', start: 3225, end: 3525 },
    { word: 'House.', start: 3538, end: 4088 },
  ],
  audioDurationInSeconds: 20,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LegoShowcase"
        component={LegoShowcase as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={600} // 20 seconds at 30 fps default
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultShowcaseProps as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => {
          const showcaseProps = props as unknown as LegoShowcaseProps;
          const durationSeconds =
            typeof showcaseProps?.audioDurationInSeconds === 'number'
              ? showcaseProps.audioDurationInSeconds
              : 20;
          return {
            durationInFrames: Math.ceil(durationSeconds * 30),
            props,
          };
        }}
      />
    </>
  );
};
