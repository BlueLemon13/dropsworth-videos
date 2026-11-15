import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// The Dropsworth character: a shipping box with blue tape, big eyes, sneakers,
// and a shipping label that shows a blue check (validated) or a red cross.
// Origin = between the feet. Native height ~ 360px at scale 1.

export type Mood = 'happy' | 'sad' | 'shocked' | 'think' | 'celebrate' | 'neutral';
export type Prop = 'none' | 'magnifier' | 'money' | 'phone' | 'empty';

export const BLUE = '#2F7BFF';
export const RED = '#FF3B3B';
const KRAFT = '#C98B4E';
const KRAFT_SIDE = '#9E6834';
const KRAFT_TOP = '#DEA467';
const INK = '#141414';

export const Boxy: React.FC<{
  x: number;
  y: number;
  scale?: number;
  mood?: Mood;
  prop?: Prop;
  label?: 'check' | 'cross' | 'none';
  look?: number; // -1 left .. 1 right
  delay?: number; // frames before pop-in
  flip?: boolean;
}> = ({x, y, scale = 1, mood = 'neutral', prop = 'none', label = 'check', look = 0, delay = 0, flip = false}) => {
  const f0 = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = f0 - delay;
  const pop = spring({frame: f, fps, config: {damping: 11, mass: 0.6}});
  if (f < 0) return null;

  const celebrate = mood === 'celebrate';
  const sad = mood === 'sad';
  const jump = celebrate ? -Math.abs(Math.sin(f / 5)) * 40 : 0;
  const bob = sad ? Math.sin(f / 14) * 2 : Math.sin(f / 8) * 5;
  const squash = 1 + (celebrate ? Math.sin(f / 5) * 0.04 : Math.sin(f / 8) * 0.015);
  const blink = f % 90 > 84 ? 0.1 : 1;
  const droop = sad ? 14 : 0;

  // eyes
  const px = look * 10 + (mood === 'think' ? 9 : 0);
  const py = sad ? 10 : mood === 'think' ? -12 : 0;
  const pupilR = mood === 'shocked' ? 8 : 15;

  const brow = (side: -1 | 1) => {
    const cx = side * 46;
    const base = -228 + droop;
    let a = 0, lift = 0;
    if (mood === 'sad') { a = side * 16; lift = -6; }
    if (mood === 'shocked') lift = -16;
    if (mood === 'happy' || celebrate) lift = -8;
    if (mood === 'think') { if (side === 1) lift = -16; else a = 6; }
    return <rect x={cx - 26} y={base + lift} width={52} height={11} rx={5} fill={INK} transform={`rotate(${a} ${cx} ${base + lift + 5})`} />;
  };

  let mouth: React.ReactNode;
  const my = -128 + droop;
  switch (mood) {
    case 'happy': mouth = <path d={`M -34 ${my} Q 0 ${my + 34} 34 ${my}`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />; break;
    case 'celebrate': mouth = <path d={`M -40 ${my - 6} Q 0 ${my + 50} 40 ${my - 6} Z`} fill={INK} />; break;
    case 'sad': mouth = <path d={`M -30 ${my + 16} Q 0 ${my - 10} 30 ${my + 16}`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />; break;
    case 'shocked': mouth = <ellipse cx={0} cy={my + 8} rx={16} ry={22} fill={INK} />; break;
    case 'think': mouth = <path d={`M -18 ${my + 8} L 22 ${my + 2}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />; break;
    default: mouth = <path d={`M -24 ${my + 2} Q 0 ${my + 16} 24 ${my + 2}`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />;
  }

  // arms: shoulder at (+-110, -150)
  const armWave = Math.sin(f / 4) * 10;
  const arm = (side: -1 | 1) => {
    const sx = side * 112, sy = -150 + droop;
    let hx = side * 165, hy = -70 + droop; // default: hanging out
    if (celebrate) { hx = side * 170; hy = -290 + armWave; }
    if (sad) { hx = side * 128; hy = -40; }
    if (mood === 'shocked') { hx = side * 175; hy = -230; }
    if (mood === 'think' && side === -1) { hx = -60; hy = -110; }
    const holding = side === 1 && prop !== 'none' && prop !== 'empty';
    if (holding) { hx = 185; hy = -150; }
    const ex = (sx + hx) / 2 + side * 18, ey = (sy + hy) / 2 + 12;
    return (
      <g>
        <path d={`M ${sx} ${sy} Q ${ex} ${ey} ${hx} ${hy}`} stroke={INK} strokeWidth={13} fill="none" strokeLinecap="round" />
        <circle cx={hx} cy={hy} r={17} fill="#fff" stroke={INK} strokeWidth={6} />
        {holding && <Held prop={prop} x={hx} y={hy} f={f} />}
      </g>
    );
  };

  const leg = (side: -1 | 1) => (
    <g>
      <line x1={side * 48} y1={-44} x2={side * 52} y2={-16} stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d={`M ${side * 52 - 30} -2 Q ${side * 52 - 30} -26 ${side * 52} -24 Q ${side * 52 + 40} -22 ${side * 52 + 40} -2 Z`} fill="#fff" stroke={INK} strokeWidth={6} />
      <rect x={side * 52 - 30} y={-6} width={70} height={8} rx={4} fill={BLUE} />
    </g>
  );

  const flapL = interpolate(Math.sin(f / 10), [-1, 1], [-8, 4]) + (celebrate ? -20 : 0) + (sad ? 22 : 0);
  const flapR = interpolate(Math.cos(f / 11), [-1, 1], [-4, 8]) + (celebrate ? 20 : 0) - (sad ? 22 : 0);

  return (
    <g transform={`translate(${x} ${y + jump + bob * 0.4}) scale(${scale * pop * (flip ? -1 : 1)} ${scale * pop})`}>
      {/* shadow */}
      <ellipse cx={0} cy={4 - jump - bob * 0.4} rx={150 - (jump ? 30 : 0)} ry={16} fill="#000" opacity={0.45} />
      {leg(-1)}
      {leg(1)}
      <g transform={`translate(0 ${bob}) scale(${1 / squash} ${squash})`}>
        {arm(-1)}
        {/* flaps */}
        <polygon points={`-110,-268 -70,-292 -60,-372 -126,-330`} fill={KRAFT_TOP} stroke={INK} strokeWidth={6} strokeLinejoin="round" transform={`rotate(${flapL} -110 -268)`} />
        <polygon points={`150,-292 110,-268 132,-330 178,-366`} fill={KRAFT_SIDE} stroke={INK} strokeWidth={6} strokeLinejoin="round" transform={`rotate(${flapR} 130 -280)`} />
        {/* side + top + front */}
        <polygon points={`112,-268 152,-292 152,-66 112,-42`} fill={KRAFT_SIDE} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <polygon points={`-112,-268 -72,-292 152,-292 112,-268`} fill={KRAFT_TOP} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <rect x={-112} y={-268} width={224} height={226} rx={8} fill={KRAFT} stroke={INK} strokeWidth={7} />
        {/* tape */}
        <polygon points={`-18,-268 18,-268 58,-292 22,-292`} fill={BLUE} />
        <rect x={-18} y={-268} width={36} height={48} fill={BLUE} />
        {/* label */}
        {label !== 'none' && (
          <g transform="translate(46 -88) rotate(-6)">
            <rect x={-34} y={-24} width={68} height={48} rx={6} fill="#fff" stroke={INK} strokeWidth={4} />
            {label === 'check'
              ? <polyline points="-14,0 -3,11 16,-12" fill="none" stroke={BLUE} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
              : <g stroke={RED} strokeWidth={8} strokeLinecap="round"><line x1={-11} y1={-11} x2={11} y2={11} /><line x1={11} y1={-11} x2={-11} y2={11} /></g>}
          </g>
        )}
        {/* face */}
        <g transform={`translate(0 ${0})`}>
          {[-1, 1].map((s) => (
            <g key={s}>
              <ellipse cx={s * 46} cy={-178 + droop} rx={32} ry={38 * blink} fill="#fff" stroke={INK} strokeWidth={6} />
              {blink > 0.5 && <circle cx={s * 46 + px} cy={-174 + droop + py} r={pupilR} fill={INK} />}
              {blink > 0.5 && <circle cx={s * 46 + px + 5} cy={-180 + droop + py} r={4} fill="#fff" />}
            </g>
          ))}
          {brow(-1)}
          {brow(1)}
          {mouth}
          {sad && <ellipse cx={-64} cy={-138 + droop + ((f * 2) % 50)} rx={7} ry={10} fill={BLUE} opacity={interpolate((f * 2) % 50, [0, 40, 50], [1, 1, 0])} />}
        </g>
        {arm(1)}
      </g>
    </g>
  );
};

const Held: React.FC<{prop: Prop; x: number; y: number; f: number}> = ({prop, x, y, f}) => {
  if (prop === 'magnifier')
    return (
      <g transform={`translate(${x} ${y}) rotate(${-20 + Math.sin(f / 9) * 6})`}>
        <line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={14} strokeLinecap="round" />
        <circle cx={0} cy={-120} r={52} fill="#9cc2ff" fillOpacity={0.35} stroke={INK} strokeWidth={12} />
        <path d="M -24 -140 Q -14 -152 0 -154" stroke="#fff" strokeWidth={7} fill="none" strokeLinecap="round" />
      </g>
    );
  if (prop === 'money')
    return (
      <g transform={`translate(${x - 10} ${y - 40}) rotate(${-10 + Math.sin(f / 6) * 5})`}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 6} ${-i * 10})`}>
            <rect x={-10} y={-30} width={110} height={56} rx={6} fill="#5fbf6a" stroke={INK} strokeWidth={5} />
            <circle cx={45} cy={-2} r={13} fill="none" stroke="#2c7a37" strokeWidth={4} />
          </g>
        ))}
      </g>
    );
  if (prop === 'phone')
    return (
      <g transform={`translate(${x - 20} ${y - 100}) rotate(8)`}>
        <rect x={0} y={0} width={70} height={130} rx={12} fill={INK} stroke={INK} strokeWidth={4} />
        <rect x={7} y={10} width={56} height={108} rx={6} fill={BLUE} opacity={0.85} />
        <polygon points="26,52 26,78 48,65" fill="#fff" />
      </g>
    );
  return null;
};
