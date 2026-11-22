import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/tiktok-sans/600.css';

// Format: "Dodged It" — hype hook over b-roll, then a calm, clear walkthrough of a phone
// recording of a Dropsworth scan (pen taps each step), TikTok "Classic" text on top, then a CTA.
// Posted silent so a trending sound is added in TikTok.
export type DodgedShot = {
  t: number; // start inside the clip (seconds of source)
  d: number; // length on screen (seconds)
  crop: [number, number, number]; // [centre x, centre y, width] in the 1080x1920 portrait source
  file?: string; // clip in public/dodged
  path?: string; // any clip under public/ (b-roll), used instead of file
  rate?: number; // playback speed (0.6 = slowed so the screen is easy to read)
  big?: boolean; // hook-sized text, centred
  text: string; // HTML allowed: <r>red</r> <g>green</g> <b>blue</b>
};
export type DodgedProps = {src: string; shots: DodgedShot[]; cta: string[]; ctaSeconds: number; label?: string};

const FPS = 30;
const TEXT_TOP = 300;

const tk: React.CSSProperties = {
  fontFamily: 'TikTok Sans',
  fontWeight: 600,
  color: '#fff',
  fontSize: 64,
  lineHeight: 1.12,
  letterSpacing: -1.6,
  WebkitTextStroke: '7px #000',
  paintOrder: 'stroke fill',
  textAlign: 'center',
};
const colour = (s: string) =>
  s.replace(/<r>(.*?)<\/r>/g, '<span style="color:#ff3b5c">$1</span>')
    .replace(/<g>(.*?)<\/g>/g, '<span style="color:#2ee66b">$1</span>')
    .replace(/<b>(.*?)<\/b>/g, '<span style="color:#6f7dff">$1</span>');

const srcOf = (s: DodgedShot, src: string) => staticFile(s.path ?? `dodged/${s.file ?? src}`);

const Shot: React.FC<{src: string; s: DodgedShot}> = ({src, s}) => {
  const f = useCurrentFrame();
  const n = Math.round(s.d * FPS);
  const [mx, my, cw] = s.crop;
  const ch = (cw * 1920) / 1080;
  const cx = Math.min(Math.max(mx - cw / 2, 0), 1080 - cw);
  const cy = Math.min(Math.max(my - ch / 2, 0), 1920 - ch);
  const sc = 1080 / cw;
  // gentle push so the screen stays readable
  const z = interpolate(f, [0, n], [1.0, 1.04], {extrapolateRight: 'clamp'});
  const fade = interpolate(f, [0, 5], [0, 1], {extrapolateRight: 'clamp'});
  const rise = interpolate(f, [0, 6], [18, 0], {extrapolateRight: 'clamp'});
  const from = Math.round(s.t * FPS);
  const rate = s.rate ?? 1;
  return (
    <AbsoluteFill>
      <OffthreadVideo src={srcOf(s, src)} muted startFrom={from} playbackRate={rate}
        style={{position: 'absolute', inset: -60, width: 1200, height: 2040, objectFit: 'cover', filter: 'blur(40px) brightness(0.45) saturate(1.2)'}} />
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: '50% 50%'}}>
          <OffthreadVideo src={srcOf(s, src)} muted startFrom={from} playbackRate={rate}
            style={{position: 'absolute', width: 1080 * sc, height: 1920 * sc, left: -cx * sc, top: -cy * sc, filter: s.big ? 'brightness(0.72) contrast(1.05)' : 'contrast(1.08) saturate(1.1)'}} />
        </div>
      </div>
      {s.big ? (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
          <div style={{...tk, fontSize: 80, lineHeight: 1.1, opacity: fade, transform: `translateY(${rise}px)`}} dangerouslySetInnerHTML={{__html: colour(s.text)}} />
        </AbsoluteFill>
      ) : (
        <div style={{position: 'absolute', left: 50, right: 50, top: TEXT_TOP, opacity: fade, transform: `translateY(${rise}px)`}}>
          <div style={tk} dangerouslySetInnerHTML={{__html: colour(s.text)}} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const Cta: React.FC<{src: string; last: DodgedShot; lines: string[]}> = ({src, last, lines}) => {
  const f = useCurrentFrame();
  const end = last.t + last.d * (last.rate ?? 1);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <OffthreadVideo src={srcOf(last, src)} muted startFrom={Math.round(end * FPS)}
        style={{position: 'absolute', inset: -80, width: 1240, height: 2080, objectFit: 'cover', filter: 'blur(38px) saturate(1.15)'}} />
      <AbsoluteFill style={{background: 'rgba(0,0,0,.28)'}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 46, padding: '0 70px', flexDirection: 'column'}}>
        {lines.map((l, i) => (
          <div key={i} style={{...tk, fontSize: 60, opacity: interpolate(f, [i * 5, i * 5 + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}
            dangerouslySetInnerHTML={{__html: colour(l)}} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Dodged: React.FC<DodgedProps> = ({src, shots, cta, ctaSeconds, label}) => {
  let at = 0;
  const seqs = shots.map((s, i) => {
    const from = at;
    const n = Math.round(s.d * FPS);
    at += n;
    return (
      <Sequence key={i} from={from} durationInFrames={n}>
        <Shot src={src} s={s} />
      </Sequence>
    );
  });
  const hookFrames = shots.filter((s) => s.big).reduce((a, s) => a + Math.round(s.d * FPS), 0);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {seqs}
      {label && hookFrames > 0 && (
        // tutorial tag sits low during the hook, like the reference tutorials
        <Sequence from={0} durationInFrames={hookFrames}>
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 470}}>
            <div style={{...tk, fontSize: 54}} dangerouslySetInnerHTML={{__html: colour(label)}} />
          </AbsoluteFill>
        </Sequence>
      )}
      <Sequence from={at} durationInFrames={Math.round(ctaSeconds * FPS)}>
        <Cta src={src} last={shots[shots.length - 1]} lines={cta} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const dodgedLength = (p: DodgedProps) =>
  p.shots.reduce((a, s) => a + Math.round(s.d * FPS), 0) + Math.round(p.ctaSeconds * FPS);
