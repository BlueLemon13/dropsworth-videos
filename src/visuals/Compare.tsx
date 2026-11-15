import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {BLUE, Boxy, Mood, Prop, RED} from './Boxy';

// Split screen: top = didn't validate, bottom = validated. One `stage` per scene;
// counters animate from the previous stage's value to this stage's value.
const STAGES = ['intro', 'pick', 'check', 'ads', 'week1', 'week1b', 'week4'] as const;
type Stage = (typeof STAGES)[number];

const TOP_VAL = [1000, 1000, 1000, 820, 540, 540, 0];
const BOT_VAL = [1000, 1000, 1000, 960, 960, 1240, 4860];
const TOP: Record<Stage, {mood: Mood; prop: Prop; note?: string; dim?: boolean}> = {
  intro: {mood: 'neutral', prop: 'none'},
  pick: {mood: 'happy', prop: 'phone', note: '"IT WENT VIRAL"'},
  check: {mood: 'neutral', prop: 'phone', dim: true},
  ads: {mood: 'happy', prop: 'none', note: 'ADS ON'},
  week1: {mood: 'shocked', prop: 'none', note: '-$10 PER SALE'},
  week1b: {mood: 'sad', prop: 'none', note: '-$10 PER SALE', dim: true},
  week4: {mood: 'sad', prop: 'empty', note: 'BROKE'},
};
const BOT: Record<Stage, {mood: Mood; prop: Prop; note?: string; dim?: boolean}> = {
  intro: {mood: 'neutral', prop: 'none'},
  pick: {mood: 'neutral', prop: 'none', dim: true},
  check: {mood: 'think', prop: 'magnifier'},
  ads: {mood: 'happy', prop: 'none', note: 'ADS ON'},
  week1: {mood: 'happy', prop: 'none', dim: true},
  week1b: {mood: 'happy', prop: 'money', note: '+$18 PER ORDER'},
  week4: {mood: 'celebrate', prop: 'money', note: 'SCALING'},
};

const font = (size: number, weight = 900) => ({fontFamily: 'Montserrat', fontWeight: weight, fontSize: size});
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const Compare: React.FC<{stage: string; durationInFrames: number}> = ({stage, durationInFrames}) => {
  const f = useCurrentFrame();
  const i = Math.max(0, STAGES.indexOf(stage as Stage));
  const st = STAGES[i];
  const p = interpolate(f, [4, Math.min(durationInFrames * 0.8, 50)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const topV = interpolate(p, [0, 1], [TOP_VAL[Math.max(0, i - 1)], TOP_VAL[i]]);
  const botV = interpolate(p, [0, 1], [BOT_VAL[Math.max(0, i - 1)], BOT_VAL[i]]);
  const week = st === 'week4' ? 'WEEK 4' : st.startsWith('week1') ? 'WEEK 1' : st === 'ads' ? 'DAY 1' : '';
  const checks = ['DEMAND', 'MARGIN', 'COMPETITION'];

  const half = (top: boolean) => {
    const y0 = top ? 0 : 960;
    const cfg = top ? TOP[st] : BOT[st];
    const val = top ? topV : botV;
    const color = top ? RED : BLUE;
    const valColor = top ? (val < 1000 ? RED : '#fff') : val > 1000 ? '#3ddc84' : '#fff';
    const label = cfg.mood === 'sad' && top && st === 'week4' ? 'cross' : top ? 'cross' : 'check';
    return (
      <g opacity={cfg.dim ? 0.35 : 1}>
        <rect x={0} y={y0} width={1080} height={960} fill={top ? '#140808' : '#060b18'} />
        <rect x={0} y={y0} width={1080} height={960} fill={`url(#${top ? 'gTop' : 'gBot'})`} />
        {/* header */}
        <g transform={`translate(60 ${y0 + (top ? 120 : 210)})`}>
          <rect x={0} y={-58} width={top ? 470 : 370} height={80} rx={40} fill={color} />
          <text x={top ? 235 : 185} y={-4} textAnchor="middle" fill="#fff" style={font(40)}>{top ? 'NO VALIDATION' : 'VALIDATED'}</text>
        </g>
        {/* character */}
        <svg x={0} y={y0} width={1080} height={960} overflow="visible">
          <Boxy x={250} y={top ? 800 : 880} scale={1.05} mood={cfg.mood} prop={cfg.prop} label={label} look={0.6} />
        </svg>
        {/* balance */}
        <text x={810} y={y0 + (top ? 420 : 520)} textAnchor="middle" fill="#fff" opacity={0.6} style={font(34, 700)}>BUDGET</text>
        <text x={810} y={y0 + (top ? 540 : 640)} textAnchor="middle" fill={valColor} style={font(Math.min(130, 900 / money(val).length), 900)}>{money(val)}</text>
        {cfg.note && (
          <text x={810} y={y0 + (top ? 640 : 740)} textAnchor="middle" fill={top ? RED : '#3ddc84'} style={font(44, 900)} opacity={interpolate(f, [6, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>{cfg.note}</text>
        )}
        {!top && st === 'check' &&
          checks.map((c, k) => {
            const t = interpolate(f, [8 + k * 12, 14 + k * 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const yy = y0 + 700 + k * 70;
            return (
              <g key={c} opacity={0.4 + 0.6 * t}>
                <rect x={620} y={yy - 40} width={46} height={46} rx={8} fill="none" stroke="#fff" strokeWidth={4} />
                <polyline points={`630,${yy - 18} 640,${yy - 8} 658,${yy - 32}`} fill="none" stroke={BLUE} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
                <text x={690} y={yy} fill="#fff" style={font(38, 800)}>{c}</text>
              </g>
            );
          })}
      </g>
    );
  };

  return (
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <defs>
        <radialGradient id="gTop" cx="0.3" cy="0.75" r="0.7">
          <stop offset="0" stopColor={RED} stopOpacity={0.22} />
          <stop offset="1" stopColor={RED} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="gBot" cx="0.3" cy="0.85" r="0.7">
          <stop offset="0" stopColor={BLUE} stopOpacity={0.28} />
          <stop offset="1" stopColor={BLUE} stopOpacity={0} />
        </radialGradient>
      </defs>
      {half(true)}
      {half(false)}
      <rect x={0} y={954} width={1080} height={12} fill="#fff" />
      {week && (
        <g transform="translate(870 120)">
          <rect x={-130} y={-58} width={260} height={80} rx={14} fill="#fff" />
          <text x={0} y={-4} textAnchor="middle" fill="#000" style={font(42)}>{week}</text>
        </g>
      )}
    </svg>
  );
};
