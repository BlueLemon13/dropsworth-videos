import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/tiktok-sans/700.css';
import {Visual} from './visuals/Visual';

export type Word = {text: string; big: boolean; blue: boolean; red?: boolean; t: number; end: number};
export type Group = {words: number[]; start: number; end: number};
export type ReelScene = {visual: string; start: number; end: number; zoom?: number; items?: string[]; ticks?: (number | null)[]; transition?: string; cap?: string; [k: string]: any};
export type Sfx = {name: string; t: number; vol?: number};
export type ReelProps = {audio?: string; words: Word[]; groups: Group[]; scenes: ReelScene[]; sfx?: Sfx[]; duration: number; music?: string; musicVol?: number; uniformText?: boolean};

const BLUE = '#2F7BFF';
const RED = '#FF3B3B';
const SWIPE = 6; // frames
const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

const Swipe: React.FC<{dir: [number, number]; first: boolean; children: React.ReactNode}> = ({dir, first, children}) => {
  const f = useCurrentFrame();
  if (first) return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(f, [0, SWIPE], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const blur = interpolate(f, [0, SWIPE - 2, SWIPE], [14, 4, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{transform: `translate(${dir[0] * p * 1080}px, ${dir[1] * p * 1920}px)`, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, background: '#000'}}>
      {children}
    </AbsoluteFill>
  );
};

const CAP_TOP: Record<string, number> = {top: 270, mid: 850, low: 1300};

// uniform: every word the same size (owner's explainer style); key words keep their blue/red colour.
const Captions: React.FC<{words: Word[]; groups: Group[]; scenes: ReelScene[]; uniform?: boolean}> = ({words, groups, scenes, uniform}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const g = groups.find((g) => t >= g.start && t < g.end);
  if (!g) return null;
  const scene = [...scenes].reverse().find((s) => t >= s.start);
  if (scene?.cap === 'none') return null;
  const top = CAP_TOP[scene?.cap ?? 'top'] ?? 270;
  return (
    <div style={{position: 'absolute', top, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', columnGap: 24, rowGap: 0}}>
      {g.words.map((wi) => {
        const w = words[wi];
        const local = f - Math.round(w.t * fps);
        if (local < 0) return null;
        const p = interpolate(local, [0, 3], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        const big = w.big && !uniform;
        const punch = big ? interpolate(local, [0, 3, 6], [1.25, 0.96, 1], {extrapolateRight: 'clamp'}) : 1;
        return (
          <span
            key={wi}
            style={{
              fontFamily: 'Montserrat',
              fontWeight: big ? 900 : uniform ? 800 : 700,
              fontSize: big ? Math.min(150, 960 / (w.text.length * 0.78)) : uniform ? 80 : 74,
              lineHeight: big ? 1.0 : 1.25,
              letterSpacing: big ? -2 : 0,
              color: w.blue ? BLUE : w.red ? RED : '#fff',
              textTransform: big ? 'uppercase' : 'none',
              textShadow: '0 4px 20px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)',
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px) scale(${punch})`,
              display: 'inline-block',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// Hook card: big on-screen hook text (TikTok style) over the first scene, e.g. "the first step to ai dropshipping" / "age 16 - 29".
const HookCard: React.FC<{scenes: ReelScene[]}> = ({scenes}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = scenes.find((x) => x.hook && x.hook.length);
  if (!s) return null;
  const from = Math.round(s.start * fps), to = Math.round(s.end * fps);
  if (f < from || f >= to) return null;
  const local = f - from;
  const o = interpolate(local, [0, 5, to - from - 5, to - from], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lines: string[] = Array.isArray(s.hook) ? s.hook : [String(s.hook)];
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: o, transform: `scale(${interpolate(local, [0, 6], [0.92, 1], {extrapolateRight: 'clamp'})})`}}>
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: 'TikTok Sans', fontWeight: 700, fontSize: i === 0 ? 72 : 60, lineHeight: 1.15, color: '#fff', textAlign: 'center', textShadow: '0 0 4px rgba(0,0,0,0.95), 0 3px 14px rgba(0,0,0,0.8)'}}>{l}</div>
      ))}
    </div>
  );
};

export const Reel: React.FC<ReelProps> = ({audio, words, groups, scenes, sfx = [], music, musicVol = 0.12, uniformText}) => {
  const {fps} = useVideoConfig();
  let swipeIdx = 0;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {audio && <Audio src={staticFile(audio)} />}
      {music && <Audio src={staticFile(music)} volume={musicVol} loop />}
      {sfx.map((s, i) => (
        <Sequence key={`sfx${i}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={fps * 3}>
          <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.6} />
        </Sequence>
      ))}
      {scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const noSwipe = i === 0 || s.transition === 'none';
        const dur = Math.round((s.end - s.start) * fps) + (i + 1 < scenes.length && scenes[i + 1].transition === 'none' ? 0 : SWIPE);
        const dir = DIRS[noSwipe ? 0 : swipeIdx++ % 4];
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Swipe dir={dir} first={noSwipe}>
              <AbsoluteFill style={{background: '#000'}}>
                <Visual name={s.visual} items={s.items} durationInFrames={dur} zoom={s.zoom} ticks={s.ticks} opts={s} index={i} />
              </AbsoluteFill>
            </Swipe>
          </Sequence>
        );
      })}
      <StepBadge scenes={scenes} />
      <HookCard scenes={scenes} />
      <Captions words={words} groups={groups} scenes={scenes} uniform={uniformText} />
    </AbsoluteFill>
  );
};

// "STEP 2" pill above the captions. A scene with `step=N` sets it; later scenes keep it
// until one sets step=0. Pops in when the step changes.
const StepBadge: React.FC<{scenes: ReelScene[]}> = ({scenes}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  let step = 0, since = 0;
  for (const s of scenes) {
    if (s.start > t) break;
    if (s.step !== undefined && Number(s.step) !== step) { step = Number(s.step); since = s.start; }
  }
  if (!step) return null;
  const local = f - Math.round(since * fps);
  const p = interpolate(local, [0, 4, 8], [0.4, 1.12, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: 'Montserrat', fontWeight: 900, fontSize: 46, letterSpacing: 2, color: '#fff', background: BLUE, padding: '8px 30px', borderRadius: 999, transform: `scale(${p})`, boxShadow: '0 8px 24px rgba(0,0,0,0.45)'}}>
        STEP {step}
      </div>
    </div>
  );
};
