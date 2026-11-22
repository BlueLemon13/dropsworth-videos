import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/tiktok-sans/600.css';
import '@fontsource/tiktok-sans/800.css';

// "AI dropshipping tutorial" format: voiceover, crumpled-paper hook + CTA with 1-2 word
// captions in the middle, and a clear phone-recorded walkthrough with captions at the top.
export type WalkShot = {from: number; to: number; paper?: boolean; file?: string; t?: number; rate?: number; crop?: [number, number, number]};
export type WalkChunk = {t0: number; t1: number; html: string; paper: boolean};
export type WalkProps = {audio: string; duration: number; shots: WalkShot[]; chunks: WalkChunk[]; label?: string};

const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const colour = (s: string, dark: boolean) =>
  s.replace(/<r>(.*?)<\/r>/g, `<span style="color:${dark ? '#e0243f' : '#ff3b5c'}">$1</span>`)
    .replace(/<g>(.*?)<\/g>/g, `<span style="color:${dark ? '#14a347' : '#2ee66b'}">$1</span>`);

// Crumpled paper, drawn with SVG lighting on noise — no image needed.
export const Paper: React.FC = () => {
  const f = useCurrentFrame();
  const z = 1.04 + 0.03 * Math.sin(f / 90);
  return (
    <AbsoluteFill style={{background: '#efeae0', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, transform: `scale(${z})`}}>
        <filter id="crumple" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.0075" numOctaves={5} seed={7} result="n" />
          <feDiffuseLighting in="n" lightingColor="#fbf8f1" surfaceScale={7} diffuseConstant={1.05} result="l">
            <feDistantLight azimuth={225} elevation={52} />
          </feDiffuseLighting>
          <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1={0} k2={1} k3={0} k4={0} />
        </filter>
        <rect width="1080" height="1920" fill="#fff" filter="url(#crumple)" />
        <radialGradient id="vig" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a2e1c" stopOpacity="0.28" />
        </radialGradient>
        <rect width="1080" height="1920" fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};

// Same paper, pre-rendered once to public/walk/paper.png (the SVG lighting is slow per frame).
export const PaperImg: React.FC = () => {
  const f = useCurrentFrame();
  const z = 1.0 + 0.03 * Math.sin(f / 90);
  return (
    <AbsoluteFill style={{background: '#efeae0', overflow: 'hidden'}}>
      <Img src={staticFile('walk/paper.png')} style={{width: 1080, height: 1920, transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

export const Footage: React.FC<{s: WalkShot}> = ({s}) => {
  const f = useCurrentFrame();
  const n = fr(s.to - s.from);
  const [mx, my, cw] = s.crop ?? [540, 960, 1080];
  const ch = (cw * 1920) / 1080;
  const cx = Math.min(Math.max(mx - cw / 2, 0), 1080 - cw);
  const cy = Math.min(Math.max(my - ch / 2, 0), 1920 - ch);
  const sc = 1080 / cw;
  const z = interpolate(f, [0, n], [1.0, 1.03], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', transform: `scale(${z})`}}>
        <OffthreadVideo src={staticFile(s.file!)} muted startFrom={fr(s.t ?? 0)} playbackRate={s.rate ?? 1}
          style={{position: 'absolute', width: 1080 * sc, height: 1920 * sc, left: -cx * sc, top: -cy * sc, filter: 'contrast(1.06) saturate(1.08)'}} />
      </div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{c: WalkChunk}> = ({c}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 3, 6], [0.6, 1.1, 1], {extrapolateRight: 'clamp'});
  if (c.paper) {
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 70px'}}>
        <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: 132, lineHeight: 1.05, letterSpacing: -3, color: '#151515', textAlign: 'center', transform: `scale(${s})`}}
          dangerouslySetInnerHTML={{__html: colour(c.html, true)}} />
      </AbsoluteFill>
    );
  }
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: 270, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: 104, lineHeight: 1.05, letterSpacing: -2.5, color: '#fff', WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', textAlign: 'center', transform: `scale(${s})`}}
        dangerouslySetInnerHTML={{__html: colour(c.html, false)}} />
    </div>
  );
};

export const Walk: React.FC<WalkProps> = ({audio, shots, chunks, label}) => {
  const hookEnd = shots[0]?.paper ? shots[0].to : 0;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile(audio)} />
      {shots.map((s, i) => (
        <Sequence key={i} from={fr(s.from)} durationInFrames={Math.max(1, fr(s.to) - fr(s.from))}>
          {s.paper ? <PaperImg /> : <Footage s={s} />}
        </Sequence>
      ))}
      {label && hookEnd > 0 && (
        <Sequence from={0} durationInFrames={fr(hookEnd)}>
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
            <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: 50, letterSpacing: 1, color: '#151515', borderBottom: '6px solid #151515', paddingBottom: 6}}>{label}</div>
          </AbsoluteFill>
        </Sequence>
      )}
      {chunks.map((c, i) => (
        <Sequence key={'c' + i} from={fr(c.t0)} durationInFrames={Math.max(1, fr(c.t1) - fr(c.t0))}>
          <Caption c={c} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
