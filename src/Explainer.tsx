import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/playfair-display/400-italic.css';
import {Visual} from './visuals/Visual';
import {BLUE} from './visuals/Figure';
import {FPS, VideoProps, withTimings} from './types';

const PopWord: React.FC<{text: string; at: number; style: React.CSSProperties}> = ({text, at, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 12, mass: 0.5}});
  if (f < at) return null;
  return <span style={{display: 'inline-block', transform: `scale(${0.6 + 0.4 * s}) translateY(${(1 - s) * 20}px)`, opacity: Math.min(1, s * 2), ...style}}>{text}</span>;
};

const ScoreBar: React.FC<{scenes: ReturnType<typeof withTimings>}> = ({scenes}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let i = scenes.findIndex((s) => t >= (s.start as number) && t < (s.end as number));
  if (i === -1) i = t < (scenes[0].start as number) ? 0 : scenes.length - 1;
  const prev = i === 0 ? 0 : scenes[i - 1].score;
  const p = spring({frame: f - Math.round((scenes[i].start as number) * FPS), fps: FPS, config: {damping: 20}});
  const val = Math.round(prev + (scenes[i].score - prev) * p);
  return (
    <div style={{position: 'absolute', top: 1330, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24, fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', fontSize: 26, letterSpacing: 4}}>
        <span style={{opacity: 0.85}}>PRODUCT SCORE</span>
        <div style={{width: 340, height: 10, borderRadius: 10, background: 'rgba(255,255,255,0.15)', overflow: 'hidden'}}>
          <div style={{width: `${val}%`, height: '100%', background: BLUE, boxShadow: `0 0 18px ${BLUE}`}} />
        </div>
        <span style={{width: 90}}>{val}%</span>
      </div>
      <div style={{fontFamily: 'Montserrat', fontWeight: 700, color: '#fff', opacity: 0.45, fontSize: 24, letterSpacing: 8}}>DROPSWORTH</div>
    </div>
  );
};

export const Explainer: React.FC<VideoProps> = ({scenes, audio}) => {
  const timed = withTimings(scenes);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {audio && <Audio src={staticFile(audio)} />}
      {timed.map((s, i) => {
        const from = Math.round((s.start as number) * FPS);
        const dur = Math.round(((s.end as number) - (s.start as number)) * FPS);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneView scene={s} from={from} dur={dur} />
          </Sequence>
        );
      })}
      <ScoreBar scenes={timed} />
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{scene: any; from: number; dur: number}> = ({scene, from, dur}) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [0, 4, dur - 3, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bigAt = Math.max(0, Math.round(scene.bigAt * FPS) - from);
  const smallAt = Math.max(bigAt + 3, Math.round(scene.smallAt * FPS) - from);
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Visual name={scene.visual} items={scene.items} durationInFrames={dur} zoom={scene.zoom} />
      <div style={{position: 'absolute', top: 300, left: 60, right: 60, textAlign: 'center', color: '#fff', lineHeight: 1.1}}>
        <PopWord text={scene.big.toUpperCase()} at={bigAt} style={{fontFamily: 'Montserrat', fontWeight: 800, fontSize: 104, letterSpacing: 2, textShadow: `0 0 30px ${BLUE}, 0 0 8px rgba(255,255,255,0.6)`}} />
        {scene.small && (
          <>
            {' '}
            <PopWord text={scene.small} at={smallAt} style={{fontFamily: 'Playfair Display', fontStyle: 'italic', fontWeight: 400, fontSize: 96, marginLeft: 22}} />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
