import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/tiktok-sans/600.css';

// Format 2: aesthetic background (video preferred, image fallback) + one small, nonchalant
// block of text in TikTok Sans (TikTok's own in-app font, "Classic" text style).
// Posted silent so a trending sound can be added in the TikTok app.
export type SauceProps = {
  image?: string; // file in public/broll
  video?: string; // file in public/bvideo
  videoSeconds?: number; // source clip length, for looping
  text: string;
  duration: number;
  fontSize?: number;
  y?: number; // vertical centre of text, 0..1 of the frame
  audio?: string;
};

export const Sauce: React.FC<SauceProps> = ({image, video, videoSeconds, text, fontSize = 38, y = 0.5, audio}) => {
  const f = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const z = interpolate(f, [0, durationInFrames], [1.02, 1.08]);
  const bgStyle: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: video ? undefined : `scale(${z})`, filter: 'saturate(0.9) contrast(1.08) brightness(0.8)'};
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {audio && (
        <Audio
          src={staticFile(audio)}
          volume={(fr) => interpolate(fr, [0, 12, durationInFrames - 24, durationInFrames], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      )}
      {video ? (
        // Owner's rule: never replay the clip. The composition length is capped to the clip length (Root.tsx).
        <OffthreadVideo src={staticFile(`bvideo/${video}`)} muted style={bgStyle} />
      ) : image ? (
        <Img src={staticFile(`broll/${image}`)} style={bgStyle} />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 160,
          right: 160,
          top: `${y * 100}%`,
          transform: 'translateY(-50%)',
          fontFamily: 'TikTok Sans',
          fontWeight: 600,
          fontSize,
          lineHeight: 1.28,
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 1px 4px rgba(0,0,0,0.75)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
