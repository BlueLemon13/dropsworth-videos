import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/tiktok-sans/800.css';
import {Footage, PaperImg, WalkShot} from './Walk';

// "Dropshipping guide" format: ElevenLabs voice on crumpled paper, 1-2 word captions where each
// word only appears once it is spoken, popups (photos, cards, phone videos) that illustrate the line,
// then the owner's phone recording of a Dropsworth search with captions at the top, then a paper CTA.
// Owner (2026-11-23): calm motion — captions just appear (no zoom pop), popups ease in quickly, hard cuts.
export type GuideWord = {html: string; t0: number};
export type GuideChunk = {t0: number; t1: number; words: GuideWord[]; paper: boolean; fill?: boolean; glue?: boolean};
export type GuidePop = {t0: number; t1: number; src: string; logo?: boolean; tilt?: number; wide?: boolean; video?: boolean; row?: string[]; delays?: number[]};
export type GuideProps = {audio: string; duration: number; shots: WalkShot[]; chunks: GuideChunk[]; pops: GuidePop[]};

const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const colour = (s: string, dark: boolean) =>
  s.replace(/<r>(.*?)<\/r>/g, `<span style="color:${dark ? '#e0243f' : '#ff3b5c'}">$1</span>`)
    .replace(/<g>(.*?)<\/g>/g, `<span style="color:${dark ? '#14a347' : '#2ee66b'}">$1</span>`)
    .replace(/<b>(.*?)<\/b>/g, `<span style="color:${dark ? '#3346ff' : '#6b7bff'}">$1</span>`);

// quick, calm entrance: 5 frames, slight scale-up and fade, no bounce
const enter = (f: number) => interpolate(f, [0, 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

// Caption: words appear one by one at their spoken time (never before).
const Caption: React.FC<{c: GuideChunk; pops: GuidePop[]}> = ({c, pops}) => {
  const f = useCurrentFrame();
  const t = c.t0 + f / FPS;
  const low = c.paper && pops.some((p) => p.t0 <= t && t < p.t1);
  const shown = c.words.filter((w) => w.t0 <= t + 0.01);
  const html = colour(shown.map((w) => w.html).join(c.glue ? '' : ' '), c.paper);
  const longest = Math.max(...shown.map((w) => w.html.replace(/<[^>]+>/g, '')).join(c.glue ? '' : ' ').split(' ').map((x) => x.length));
  const fit = (base: number) => Math.min(base, Math.floor(1700 / Math.max(1, longest)));
  if (c.fill) {
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 80px'}}>
        <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: 118, lineHeight: 1.08, letterSpacing: -3, color: '#151515', textAlign: 'center'}}
          dangerouslySetInnerHTML={{__html: html}} />
      </AbsoluteFill>
    );
  }
  if (c.paper) {
    return (
      <AbsoluteFill style={{justifyContent: low ? 'flex-start' : 'center', alignItems: 'center', padding: '0 70px', paddingTop: low ? 1230 : 0}}>
        <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: fit(low ? 112 : 132), lineHeight: 1.05, letterSpacing: -3, color: '#151515', textAlign: 'center'}}
          dangerouslySetInnerHTML={{__html: html}} />
      </AbsoluteFill>
    );
  }
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: 250, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: 'TikTok Sans', fontWeight: 800, fontSize: fit(100), lineHeight: 1.05, letterSpacing: -2.5, color: '#fff', WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', textAlign: 'center'}}
        dangerouslySetInnerHTML={{__html: html}} />
    </div>
  );
};

const Media: React.FC<{p: GuidePop; src: string; style: React.CSSProperties}> = ({p, src, style}) =>
  p.video ? <OffthreadVideo src={staticFile(src)} muted style={style} /> : <Img src={staticFile(src)} style={style} />;

// Photo / card / phone video that appears on the paper like a polaroid.
const Pop: React.FC<{p: GuidePop}> = ({p}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = fr(p.t1 - p.t0);
  const e = enter(f);
  const out = interpolate(f, [n - 3, n], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tilt = p.tilt ?? 0;
  const card = (k: number): React.CSSProperties => ({opacity: k, transform: `scale(${0.94 + 0.06 * k})`});
  if (p.row) {
    return (
      <AbsoluteFill style={{flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 520, opacity: out}}>
        {p.row.map((src, i) => {
          const k = enter(f - Math.round((p.delays?.[i] ?? i * 0.17) * fps));
          return (
            <div key={i} style={{width: p.row!.length > 2 ? 300 : 420, height: p.row!.length > 2 ? 380 : 532, background: '#fff', padding: 10, borderRadius: 20, boxShadow: '0 20px 40px rgba(40,30,10,0.3)',
              ...card(k), transform: `${card(k).transform} rotate(${(i - 1) * 3}deg) translateY(${(i === 1 ? -30 : 0)}px)`}}>
              <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12}} />
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (p.wide) {
    return (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 480, opacity: out}}>
        <div style={{width: 960, height: 645, background: '#fff', padding: 12, borderRadius: 22, boxShadow: '0 30px 60px rgba(40,30,10,0.35)', ...card(e), transform: `${card(e).transform} rotate(${tilt * 0.5}deg)`}}>
          <Img src={staticFile(p.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', borderRadius: 12}} />
        </div>
      </AbsoluteFill>
    );
  }
  if (p.logo) {
    return (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 560, opacity: out}}>
        <Img src={staticFile(p.src)} style={{width: 820, ...card(e)}} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 300, opacity: out}}>
      <div style={{width: 640, height: 860, background: '#fff', padding: 16, borderRadius: 26, boxShadow: '0 30px 60px rgba(40,30,10,0.35)', ...card(e), transform: `${card(e).transform} rotate(${tilt * 0.6}deg)`}}>
        <Media p={p} src={p.src} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14}} />
      </div>
    </AbsoluteFill>
  );
};

export const Guide: React.FC<GuideProps> = ({audio, shots, chunks, pops}) => {
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile(audio)} />
      {shots.map((s, i) => (
        <Sequence key={i} from={fr(s.from)} durationInFrames={Math.max(1, fr(s.to) - fr(s.from))}>
          {s.paper ? <PaperImg /> : <Footage s={s} />}
        </Sequence>
      ))}
      {pops.map((p, i) => (
        <Sequence key={'p' + i} from={fr(p.t0)} durationInFrames={Math.max(1, fr(p.t1) - fr(p.t0))}>
          <Pop p={p} />
        </Sequence>
      ))}
      {chunks.map((c, i) => (
        <Sequence key={'c' + i} from={fr(c.t0)} durationInFrames={Math.max(1, fr(c.t1) - fr(c.t0))}>
          <Caption c={c} pops={pops} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
