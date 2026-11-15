import React from 'react';
import {Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BLUE, Defs, Figure} from './Figure';
import {Boxy} from './Boxy';
import {Compare} from './Compare';
import {GAdSpend, GComments, GDm, GRange, GScan, GScore, GStores, GTrend} from './Graphics';

const FLOOR = 1180;
const CX = 540;

const Spotlight: React.FC<{strength?: number}> = ({strength = 1}) => (
  <g opacity={strength}>
    <polygon points={`${CX - 70},380 ${CX + 70},380 ${CX + 300},${FLOOR} ${CX - 300},${FLOOR}`} fill="url(#cone)" filter="url(#blur20)" />
    <ellipse cx={CX} cy={FLOOR} rx={330} ry={34} fill={BLUE} opacity={0.25} filter="url(#blur20)" />
  </g>
);

const Floor = () => <line x1={0} x2={1080} y1={FLOOR} y2={FLOOR} stroke="#fff" strokeOpacity={0.12} strokeWidth={2} />;

const txt = (size: number, weight = 800) => ({
  fontFamily: 'Montserrat',
  fontWeight: weight,
  fontSize: size,
  fill: '#fff',
  letterSpacing: 3,
});

// One colour grade for every real photo: darker, punchier, slightly cool.
export const Graded: React.FC<{src: string; durationInFrames: number; zoom?: number; dir?: number}> = ({src, durationInFrames, zoom = 1.06, dir = 1}) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, durationInFrames], [zoom, zoom + 0.09]);
  const dx = interpolate(f, [0, durationInFrames], [0, 14 * dir]);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#000'}}>
      <Img src={src} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z}) translateX(${dx}px)`, filter: 'saturate(0.8) contrast(1.15) brightness(0.68)'}} />
      <div style={{position: 'absolute', inset: 0, background: '#0b1e4a', mixBlendMode: 'soft-light', opacity: 0.55}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 32%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.75) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </div>
  );
};

export const Visual: React.FC<{name: string; items?: string[]; durationInFrames: number; zoom?: number; ticks?: (number | null)[]; opts?: Record<string, any>; index?: number}> = ({name, items = [], durationInFrames, zoom = 1.08, ticks, opts = {}, index = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f, fps, config: {damping: 14, mass: 0.6}});
  const prog = (from = 0.1, to = 0.8) => interpolate(f, [durationInFrames * from, durationInFrames * to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bob = Math.sin(f / 6);

  if (name.startsWith('vid:')) {
    // moving b-roll, muted, slight push-in, starts `from` seconds into the clip.
    // grade=bright: punchy, saturated, only a soft top shade for caption readability. default: dark moody.
    const bright = opts.grade === 'bright';
    const z = interpolate(f, [0, durationInFrames], [opts.zoom ?? 1.04, (opts.zoom ?? 1.04) + 0.05]);
    return (
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#000'}}>
        <OffthreadVideo src={staticFile(`bvideo/${name.slice(4)}`)} muted startFrom={Math.round((Number(opts.from) || 0.4) * fps)} playbackRate={Number(opts.rate) || 1} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: bright ? 'saturate(1.2) contrast(1.08) brightness(1.02)' : 'saturate(0.8) contrast(1.15) brightness(0.7)'}} />
        {bright ? (
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0) 50%)'}} />
        ) : (
          <>
            <div style={{position: 'absolute', inset: 0, background: '#0b1e4a', mixBlendMode: 'soft-light', opacity: 0.55}} />
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 32%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.75) 100%)'}} />
            <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
          </>
        )}
      </div>
    );
  }

  if (name.startsWith('g-')) {
    const img = opts.img as string | undefined;
    const d = durationInFrames;
    return (
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {name === 'g-adspend' && <GAdSpend dur={d} />}
        {name === 'g-stores' && <GStores img={img} dur={d} />}
        {name === 'g-scan' && <GScan img={img} dur={d} />}
        {name === 'g-score' && <GScore img={img} ticks={ticks} dur={d} />}
        {name === 'g-comments' && <GComments dur={d} />}
        {name === 'g-trend' && <GTrend dur={d} />}
        {name === 'g-range' && <GRange ticks={ticks} dur={d} />}
        {name === 'g-dm' && <GDm dur={d} />}
      </div>
    );
  }

  if (name.startsWith('pin:')) {
    return <Graded src={staticFile(`broll/${name.slice(4)}`)} durationInFrames={durationInFrames} zoom={opts.zoom ?? 1.06} dir={index % 2 ? -1 : 1} />;
  }

  if (name === 'compare') return <Compare stage={opts.stage} durationInFrames={durationInFrames} />;

  if (name === 'boxy') {
    return (
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="bxBg" cx="0.5" cy="0.62" r="0.65">
            <stop offset="0" stopColor="#12244d" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#bxBg)" />
        <Boxy x={CX} y={1420} scale={1.75} mood={opts.mood ?? 'happy'} prop={opts.prop ?? 'none'} label={opts.label ?? 'check'} />
      </svg>
    );
  }

  if (name.startsWith('photo:')) {
    const file = name.slice(6);
    const z = zoom;
    const pan = interpolate(f, [0, durationInFrames], [12, -12]);
    const o = 1;
    return (
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: o}}>
        <Img src={staticFile(`photos/${file}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z}) translateY(${pan}px)`, filter: 'saturate(0.9) contrast(1.1) brightness(0.75)'}} />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.9) 80%, #000 100%)'}} />
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)`}} />
      </div>
    );
  }

  if (name.startsWith('img:')) {
    const file = name.slice(4);
    return (
      <div style={{position: 'absolute', left: 140, top: 640, width: 800, height: 560, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transform: `scale(${0.85 + 0.15 * pop})`}}>
        <Img
          src={staticFile(`images/${file}`)}
          style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: `grayscale(1) contrast(1.25) brightness(1.1) drop-shadow(0 0 30px ${BLUE}) drop-shadow(0 0 8px #fff)`}}
        />
      </div>
    );
  }

  let body: React.ReactNode = null;
  switch (name) {
    case 'figure-idle':
      body = (<><Spotlight /><Figure x={CX} y={FLOOR} label="YOU" /></>);
      break;
    case 'figure-confused':
      body = (
        <>
          <Spotlight strength={0.6} />
          <Figure x={CX} y={FLOOR} label="YOU" />
          {[[-150, -330, 0], [140, -360, 8], [10, -450, 16]].map(([dx, dy, d], i) => {
            const o = interpolate(f, [d, d + 8], [0, 1], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});
            return <text key={i} x={CX + dx} y={FLOOR + dy + bob * 8 * (i % 2 ? 1 : -1)} textAnchor="middle" style={txt(90)} opacity={o} filter="url(#glow)">?</text>;
          })}
        </>
      );
      break;
    case 'figure-vs': {
      const a = prog(0.05, 0.4);
      body = (
        <>
          <Figure x={290} y={FLOOR} dashed label={items[0] ?? 'HIM'} scale={0.85} />
          <line x1={420} x2={420 + 220 * a} y1={FLOOR - 120} y2={FLOOR - 120} stroke="#fff" strokeWidth={5} strokeDasharray="14 12" />
          <polyline points={`${625},${FLOOR - 140} ${645},${FLOOR - 120} ${625},${FLOOR - 100}`} fill="none" stroke="#fff" strokeWidth={5} opacity={a > 0.95 ? 1 : 0} />
          <g opacity={a}><Figure x={810} y={FLOOR} label={items[1] ?? 'YOU'} scale={0.85} /></g>
        </>
      );
      break;
    }
    case 'figure-celebrate': {
      const s = 1 + 0.15 * spring({frame: f - 4, fps, config: {damping: 8}});
      body = (
        <>
          <Spotlight strength={1.3} />
          <Figure x={CX} y={FLOOR} label="YOU" scale={s} />
          {Array.from({length: 10}).map((_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            const r1 = 260, r2 = 260 + 70 * prog(0.05, 0.3);
            const cy = FLOOR - 230;
            if (Math.sin(ang) > 0.2) return null;
            return <line key={i} x1={CX + Math.cos(ang) * r1} y1={cy + Math.sin(ang) * r1} x2={CX + Math.cos(ang) * r2} y2={cy + Math.sin(ang) * r2} stroke="#fff" strokeWidth={6} strokeLinecap="round" filter="url(#glow)" />;
          })}
        </>
      );
      break;
    }
    case 'phone': {
      const cards = items.length ? items : [];
      body = (
        <>
          <rect x={CX - 190} y={560} width={380} height={640} rx={50} fill="#000" stroke="#fff" strokeWidth={8} filter="url(#glow)" />
          {cards.length === 0 ? (
            <>
              <text x={CX} y={860} textAnchor="middle" style={txt(120)}>0</text>
              <text x={CX} y={920} textAnchor="middle" style={txt(34, 700)} opacity={0.7}>ORDERS</text>
            </>
          ) : (
            cards.slice(0, 4).map((c, i) => {
              const o = interpolate(f, [i * 7, i * 7 + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
              return (
                <g key={i} opacity={o} transform={`translate(0 ${(1 - o) * -20})`}>
                  <rect x={CX - 155} y={620 + i * 130} width={310} height={105} rx={18} fill="#1a1a1a" stroke="#fff" strokeOpacity={0.25} />
                  <circle cx={CX - 105} cy={672 + i * 130} r={22} fill={BLUE} />
                  <text x={CX - 65} y={684 + i * 130} style={txt(32, 700)}>{c}</text>
                </g>
              );
            })
          )}
        </>
      );
      break;
    }
    case 'chart-down':
    case 'chart-up': {
      const up = name === 'chart-up';
      const pts = up ? [[260, 1100], [400, 1040], [520, 1060], [660, 900], [780, 820], [860, 640]] : [[260, 660], [400, 720], [520, 700], [660, 880], [780, 960], [860, 1100]];
      const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
      const p = prog(0.05, 0.6);
      return (
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <Defs />
          <line x1={220} x2={220} y1={600} y2={1150} stroke="#fff" strokeOpacity={0.3} strokeWidth={4} />
          <line x1={220} x2={900} y1={1150} y2={1150} stroke="#fff" strokeOpacity={0.3} strokeWidth={4} />
          <path d={d} fill="none" stroke={up ? '#fff' : '#fff'} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} filter="url(#glow)" />
          {up && <circle cx={860} cy={640} r={22 * (p > 0.98 ? 1 : 0)} fill={BLUE} filter="url(#glow)" />}
          {items[0] && <text x={CX} y={1240} textAnchor="middle" style={txt(40, 800)} opacity={p}>{items[0]}</text>}
        </svg>
      );
    }
    case 'checklist': {
      const list = items.length ? items : ['MARGIN', 'SATURATION', 'SUPPLIER', 'SHIPPING'];
      body = (
        <>
          <rect x={210} y={620} width={660} height={120 + list.length * 105} rx={30} fill="none" stroke="#fff" strokeWidth={6} filter="url(#glow)" />
          {list.map((it, i) => {
            const at = ticks && ticks[i] != null ? (ticks[i] as number) * fps : durationInFrames * (0.15 + i * 0.15);
            const t = interpolate(f, [at, at + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const y = 700 + i * 105;
            return (
              <g key={i}>
                <rect x={270} y={y} width={60} height={60} rx={10} fill="none" stroke="#fff" strokeWidth={5} />
                <polyline points={`${282},${y + 32} ${296},${y + 46} ${320},${y + 14}`} fill="none" stroke={BLUE} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} filter="url(#glow)" />
                <text x={365} y={y + 46} style={txt(48)} opacity={0.5 + 0.5 * t}>{it}</text>
              </g>
            );
          })}
        </>
      );
      break;
    }
    case 'padlock': {
      const close = prog(0.2, 0.45);
      body = (
        <>
          <path d={`M ${CX - 95} ${880 - 60 * (1 - close)} L ${CX - 95} ${780 - 60 * (1 - close)} A 95 95 0 0 1 ${CX + 95} ${780 - 60 * (1 - close)} L ${CX + 95} ${880 - 60 * (1 - close)}`} fill="none" stroke="#fff" strokeWidth={40} filter="url(#glow)" />
          <rect x={CX - 160} y={860} width={320} height={260} rx={36} fill="#fff" filter="url(#glow)" />
          <circle cx={CX} cy={970} r={26} fill="#000" />
          <rect x={CX - 9} y={975} width={18} height={60} rx={8} fill="#000" />
        </>
      );
      break;
    }
    case 'package':
      body = (
        <>
          <Spotlight strength={0.8} />
          <g filter="url(#glow)" transform={`translate(0 ${bob * 6})`}>
            <polygon points={`${CX},760 ${CX + 200},850 ${CX},940 ${CX - 200},850`} fill="#fff" />
            <polygon points={`${CX - 200},850 ${CX},940 ${CX},1160 ${CX - 200},1070`} fill="#ddd" />
            <polygon points={`${CX + 200},850 ${CX},940 ${CX},1160 ${CX + 200},1070`} fill="#bbb" />
            <polygon points={`${CX - 100},805 ${CX + 100},895 ${CX + 100},935 ${CX - 100},845`} fill={BLUE} opacity={0.8} />
          </g>
          {items[0] && <text x={CX} y={1250} textAnchor="middle" style={txt(40)}>{items[0]}</text>}
        </>
      );
      break;
    case 'signposts': {
      const sign = (x: number, label: string) => (
        <g>
          <line x1={x} x2={x} y1={820} y2={FLOOR} stroke="#fff" strokeWidth={8} filter="url(#glow)" />
          <rect x={x - 120} y={740} width={240} height={90} rx={14} fill="#000" stroke="#fff" strokeWidth={6} filter="url(#glow)" />
          <text x={x} y={800} textAnchor="middle" style={txt(40)}>{label}</text>
        </g>
      );
      body = (<>{sign(190, items[0] ?? 'GUESS')}{sign(890, items[1] ?? 'DATA')}<Figure x={CX} y={FLOOR} label="YOU" scale={0.75} /></>);
      break;
    }
    case 'figure-crowd': {
      const spots = [[150,1180,0.55],[300,1150,0.6],[780,1150,0.6],[930,1180,0.55],[90,1120,0.45],[990,1120,0.45]];
      body = (
        <>
          <Spotlight strength={0.7} />
          {spots.map(([x, y, sc], i) => {
            const o = interpolate(f, [i * 3, i * 3 + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return <g key={i} opacity={o * 0.8}><Figure x={x} y={y} scale={sc} dashed /></g>;
          })}
          <Figure x={CX} y={FLOOR} label="YOU" scale={0.8} />
          {items[0] && <text x={CX} y={1310} textAnchor="middle" style={txt(34)} opacity={0.8}>{items[0]}</text>}
        </>
      );
      break;
    }
    case 'comment': {
      const typed = (items[0] ?? 'VALIDATE').slice(0, Math.max(0, Math.floor((f - 8) / 2.2)));
      body = (
        <>
          <Boxy x={CX - 250} y={FLOOR + 40} scale={0.95} mood="happy" prop="phone" look={1} />
          <g>
            <rect x={CX - 150} y={720} width={480} height={150} rx={40} fill="#fff" />
            <polygon points={`${CX - 110},860 ${CX - 60},860 ${CX - 140},930`} fill="#fff" />
          </g>
          <text x={CX + 90} y={818} textAnchor="middle" style={{...txt(64), fill: '#000'}}>{typed}<tspan opacity={Math.floor(f / 8) % 2}>|</tspan></text>
          <text x={CX - 120} y={700} style={txt(28, 700)} opacity={0.6}>ADD A COMMENT...</text>
        </>
      );
      break;
    }
    default:
      body = (<><Spotlight /><Figure x={CX} y={FLOOR} label="YOU" /></>);
  }

  return (
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <Defs />
      <g>
        <Floor />
        {body}
      </g>
    </svg>
  );
};
