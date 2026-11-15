import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/tiktok-sans/500.css';
import '@fontsource/tiktok-sans/700.css';

// Richer motion graphics for the explainer (replace the box character).
// All share one animated brand background. `img` = product image path inside public/.
const BLUE = '#2F7BFF';
const RED = '#FF3B3B';
const GREEN = '#22C55E';
const M = 'Montserrat';
const T = 'TikTok Sans';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const useAnim = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (delay = 0, damping = 13) => spring({frame: f - delay, fps, config: {damping, mass: 0.6}});
  const lin = (a: number, b: number, from = 0, to = 1, ease = Easing.out(Easing.cubic)) => interpolate(f, [a, b], [from, to], {...clamp, easing: ease});
  return {f, fps, sp, lin};
};

export const GBackground: React.FC = () => {
  const {f} = useAnim();
  const shift = (f * 1.2) % 120;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 60%, #1d4ed8 0%, #0b1a4a 45%, #050914 100%)'}}>
      <div style={{position: 'absolute', inset: -120, transform: `translateY(${shift}px)`, backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px)', backgroundSize: '120px 120px'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)'}} />
    </div>
  );
};

const money = (n: number, dec = 2) => '$' + n.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});

// ---------------- 1. Ads dashboard bleeding money ----------------
export const GAdSpend: React.FC<{dur: number}> = ({dur}) => {
  const {f, sp, lin} = useAnim();
  const p = lin(4, Math.max(20, dur - 6), 0, 1, Easing.inOut(Easing.quad));
  const spent = 487.32 * p;
  const purchases = Math.floor(2 * p + 0.2);
  const roas = 0.31;
  const card = sp(0);
  const pts = Array.from({length: 24}, (_, i) => i / 23);
  const W = 780, H = 300;
  const spendLine = pts.map((x, i) => `${i ? 'L' : 'M'} ${x * W} ${H - (x ** 0.9) * H * 0.92}`).join(' ');
  const revLine = pts.map((x, i) => `${i ? 'L' : 'M'} ${x * W} ${H - (0.05 + 0.18 * x + 0.04 * Math.sin(x * 9)) * H}`).join(' ');
  const row = (label: string, value: string, color: string, delay: number) => {
    const o = lin(delay, delay + 6);
    return (
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '18px 0', borderBottom: '2px solid #eef0f4', opacity: o, transform: `translateX(${(1 - o) * 30}px)`}}>
        <span style={{fontFamily: M, fontWeight: 700, fontSize: 34, color: '#5b6475'}}>{label}</span>
        <span style={{fontFamily: M, fontWeight: 900, fontSize: 46, color}}>{value}</span>
      </div>
    );
  };
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 90, right: 90, top: 640, background: '#fff', borderRadius: 36, padding: '36px 44px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', transform: `scale(${0.85 + 0.15 * card}) translateY(${(1 - card) * 80}px)`, opacity: card}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10}}>
          <div style={{width: 22, height: 22, borderRadius: 11, background: GREEN, boxShadow: `0 0 0 ${6 + 4 * Math.sin(f / 4)}px rgba(34,197,94,0.25)`}} />
          <span style={{fontFamily: M, fontWeight: 800, fontSize: 30, color: '#111'}}>Campaign · Active</span>
          <span style={{marginLeft: 'auto', fontFamily: M, fontWeight: 700, fontSize: 26, color: '#8a93a6'}}>Today</span>
        </div>
        {row('Amount spent', money(spent), '#111', 6)}
        {row('Purchases', String(purchases), '#111', 10)}
        {row('Cost per purchase', purchases ? money(spent / purchases) : '—', RED, 14)}
        {row('ROAS', p > 0.3 ? roas.toFixed(2) : '0.00', RED, 18)}
        <svg width={W} height={H + 20} style={{marginTop: 26}}>
          <path d={spendLine} fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
          <path d={revLine} fill="none" stroke={GREEN} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
          <text x={W} y={30} textAnchor="end" style={{fontFamily: M, fontWeight: 800, fontSize: 26, fill: RED}} opacity={p}>SPEND</text>
          <text x={W} y={H - 10} textAnchor="end" style={{fontFamily: M, fontWeight: 800, fontSize: 26, fill: GREEN}} opacity={p}>REVENUE</text>
        </svg>
      </div>
      {p > 0.85 && (
        <div style={{position: 'absolute', top: 1500, left: 0, right: 0, textAlign: 'center', transform: `rotate(-6deg) scale(${sp(Math.round(dur * 0.85) - 2, 9) * 1})`}}>
          <span style={{fontFamily: M, fontWeight: 900, fontSize: 110, color: '#fff', background: RED, padding: '6px 34px', borderRadius: 18}}>-${Math.round(spent - 61)}</span>
        </div>
      )}
    </>
  );
};

// ---------------- 2. Hundreds of stores selling the same product ----------------
const STORE_NAMES = ['glowhaus', 'nightsky.co', 'lumora', 'dreamlite', 'cosmoroom', 'starnest', 'auralamp', 'vibeden', 'novaglow', 'moonly', 'skybeam', 'luxlite', 'orbitly', 'galaxo', 'dreamy.shop', 'hazeco', 'starfall', 'nebulux', 'calmroom', 'glowup.store', 'luna&co', 'cosmique', 'brightnest', 'zenlamp'];
export const GStores: React.FC<{img?: string; dur: number}> = ({img, dur}) => {
  const {f, lin} = useAnim();
  const cols = 4, rows = 5, cw = 225, ch = 238, gap = 16;
  const x0 = (1080 - (cols * cw + (cols - 1) * gap)) / 2, y0 = 600;
  const count = Math.round(interpolate(f, [2, dur * 0.8], [0, 247], {...clamp, easing: Easing.out(Easing.quad)}));
  return (
    <>
      <GBackground />
      {Array.from({length: cols * rows}).map((_, i) => {
        const d = 2 + i * 1.1;
        const o = lin(d, d + 5);
        const c = i % cols, r = Math.floor(i / cols);
        const price = [29.99, 34.99, 27.99, 39.99, 24.99][i % 5];
        return (
          <div key={i} style={{position: 'absolute', left: x0 + c * (cw + gap), top: y0 + r * (ch + gap), width: cw, height: ch, background: '#fff', borderRadius: 18, overflow: 'hidden', opacity: o, transform: `scale(${0.6 + 0.4 * o})`, boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}}>
            <div style={{height: 128, background: '#e9edf5', overflow: 'hidden'}}>
              {img && <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
            </div>
            <div style={{padding: '10px 14px'}}>
              <div style={{fontFamily: M, fontWeight: 800, fontSize: 21, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden'}}>{STORE_NAMES[i % STORE_NAMES.length]}</div>
              <div style={{fontFamily: M, fontWeight: 900, fontSize: 26, color: BLUE, marginTop: 4}}>${price}</div>
              <div style={{fontFamily: M, fontWeight: 700, fontSize: 16, color: RED, marginTop: 2}}>SALE · ships 7-14d</div>
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', top: 1140, left: 0, right: 0, textAlign: 'center', transform: `rotate(-4deg) scale(${0.8 + 0.2 * lin(6, 14)})`}}>
        <span style={{fontFamily: M, fontWeight: 900, fontSize: 86, color: '#fff', background: RED, padding: '12px 40px', borderRadius: 18, boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}}>{count} STORES</span>
      </div>
    </>
  );
};

// ---------------- 3. Product scan with data points ----------------
const CHIPS: [string, string, number, number][] = [
  ['Searches', '+340%', 80, 760],
  ['Supplier cost', '$6.80', 610, 820],
  ['Sells for', '$34.99', 70, 1330],
  ['Stores running ads', '12', 560, 1400],
];
export const GScan: React.FC<{img?: string; dur: number}> = ({img, dur}) => {
  const {f, sp, lin} = useAnim();
  const card = sp(0);
  const scanY = interpolate((f % 40) / 40, [0, 1], [0, 620]);
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 240, top: 700, width: 600, height: 640, borderRadius: 32, overflow: 'hidden', background: '#fff', transform: `scale(${0.8 + 0.2 * card})`, opacity: card, boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
        {img && <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
        <div style={{position: 'absolute', left: 0, right: 0, top: scanY, height: 6, background: BLUE, boxShadow: `0 0 0 2px rgba(47,123,255,0.35)`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: scanY, background: 'rgba(47,123,255,0.12)'}} />
      </div>
      {/* corner brackets */}
      {[[220, 680, 0], [860, 680, 90], [860, 1360, 180], [220, 1360, 270]].map(([x, y, r], i) => (
        <div key={i} style={{position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderTop: '8px solid #fff', borderLeft: '8px solid #fff', transform: `rotate(${r}deg)`, opacity: card}} />
      ))}
      {CHIPS.map(([k, v, x, y], i) => {
        const d = 8 + i * Math.max(5, dur / 8);
        const o = lin(d, d + 6);
        return (
          <div key={k} style={{position: 'absolute', left: x, top: y, background: '#fff', borderRadius: 20, padding: '14px 24px', opacity: o, transform: `scale(${0.7 + 0.3 * o})`, boxShadow: '0 12px 30px rgba(0,0,0,0.35)', borderLeft: `8px solid ${BLUE}`}}>
            <div style={{fontFamily: M, fontWeight: 700, fontSize: 24, color: '#5b6475'}}>{k}</div>
            <div style={{fontFamily: M, fontWeight: 900, fontSize: 44, color: '#111'}}>{v}</div>
          </div>
        );
      })}
    </>
  );
};

// ---------------- 4. Validation scorecard (meters timed to spoken words) ----------------
export const GScore: React.FC<{img?: string; ticks?: (number | null)[]; dur: number}> = ({img, ticks, dur}) => {
  const {f, fps, sp, lin} = useAnim();
  const card = sp(0);
  const metrics: [string, string, number, string][] = [
    ['DEMAND', 'High · 87/100', 0.87, GREEN],
    ['MARGIN', '3.4x · $28 profit', 0.78, GREEN],
    ['COMPETITION', 'Low · 9 stores', 0.82, GREEN],
  ];
  const at = (i: number) => (ticks?.[i] != null ? (ticks[i] as number) * fps : dur * (0.15 + i * 0.22));
  const lastAt = at(2);
  const stamp = sp(Math.round(lastAt + 8), 8);
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 80, right: 80, top: 640, background: '#fff', borderRadius: 36, padding: 44, transform: `scale(${0.85 + 0.15 * card})`, opacity: card, boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
        <div style={{display: 'flex', gap: 28, alignItems: 'center', marginBottom: 30}}>
          <div style={{width: 150, height: 150, borderRadius: 22, overflow: 'hidden', background: '#e9edf5', flexShrink: 0}}>{img && <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}</div>
          <div>
            <div style={{fontFamily: M, fontWeight: 700, fontSize: 26, color: '#8a93a6'}}>PRODUCT REPORT</div>
            <div style={{fontFamily: M, fontWeight: 900, fontSize: 46, color: '#111'}}>Validation</div>
          </div>
        </div>
        {metrics.map(([k, sub, val, color], i) => {
          const t = interpolate(f, [at(i) - 2, at(i) + 14], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
          return (
            <div key={k} style={{marginBottom: 30}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{fontFamily: M, fontWeight: 900, fontSize: 38, color: '#111'}}>{k}</span>
                <span style={{fontFamily: M, fontWeight: 700, fontSize: 28, color: t > 0.5 ? color : '#b8bfcc'}}>{sub}</span>
              </div>
              <div style={{height: 26, borderRadius: 13, background: '#eef0f4', marginTop: 12, overflow: 'hidden'}}>
                <div style={{width: `${val * t * 100}%`, height: '100%', borderRadius: 13, background: `linear-gradient(90deg, ${BLUE}, ${color})`}} />
              </div>
            </div>
          );
        })}
      </div>
      {f > lastAt + 8 && (
        <div style={{position: 'absolute', top: 1500, left: 0, right: 0, textAlign: 'center', transform: `rotate(-5deg) scale(${2 - stamp})`, opacity: stamp}}>
          <span style={{fontFamily: M, fontWeight: 900, fontSize: 100, color: '#fff', background: BLUE, padding: '8px 40px', borderRadius: 20, letterSpacing: 2}}>VALIDATED ✓</span>
        </div>
      )}
    </>
  );
};

// ---------------- 6. Trend chart: slow climb (good) vs spike that crashed (bad) ----------------
export const GTrend: React.FC<{dur: number}> = ({dur}) => {
  const {sp, lin} = useAnim();
  const card = sp(0);
  const p1 = lin(4, dur * 0.45, 0, 1, Easing.inOut(Easing.quad));
  const p2 = lin(dur * 0.45, dur * 0.85, 0, 1, Easing.inOut(Easing.quad));
  const W = 820, H = 420;
  const n = 40;
  const slow = Array.from({length: n}, (_, i) => {
    const x = i / (n - 1);
    return [x * W, H - (0.15 + 0.6 * x ** 1.3 + 0.03 * Math.sin(i * 1.7)) * H];
  });
  const spike = Array.from({length: n}, (_, i) => {
    const x = i / (n - 1);
    const y = 0.1 + 0.8 * Math.exp(-(((x - 0.45) / 0.09) ** 2)) + 0.02 * Math.sin(i * 2.3);
    return [x * W, H - y * H];
  });
  const d = (pts: number[][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const label = (text: string, color: string, o: number) => (
    <span style={{fontFamily: M, fontWeight: 900, fontSize: 40, color: '#fff', background: color, padding: '6px 22px', borderRadius: 12, opacity: o}}>{text}</span>
  );
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 90, right: 90, top: 640, background: '#fff', borderRadius: 36, padding: '34px 40px', transform: `scale(${0.85 + 0.15 * card})`, opacity: card, boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
        <div style={{fontFamily: M, fontWeight: 800, fontSize: 30, color: '#5b6475', marginBottom: 18}}>Interest over time</div>
        <svg width={W} height={H + 10}>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="#eef0f4" strokeWidth={3} />)}
          <path d={d(slow)} fill="none" stroke={GREEN} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p1} />
          <path d={d(spike)} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p2} opacity={p2 > 0 ? 1 : 0} />
        </svg>
        <div style={{display: 'flex', gap: 20, marginTop: 20}}>
          {label('✓ SLOW CLIMB', GREEN, lin(dur * 0.3, dur * 0.4))}
          {label('✗ CRASHED', RED, lin(dur * 0.8, dur * 0.88))}
        </div>
      </div>
    </>
  );
};

// ---------------- 7. Ad count range: 0 = no demand, 50+ = late, 5-15 = sweet spot ----------------
// ticks[0] = when "zero" is said, ticks[1] = when "fifty" is said (seconds from scene start)
export const GRange: React.FC<{ticks?: (number | null)[]; dur: number}> = ({ticks, dur}) => {
  const {f, fps, sp} = useAnim();
  const card = sp(0);
  const t0 = (ticks?.[0] ?? dur / fps * 0.35) * fps, t1 = (ticks?.[1] ?? dur / fps * 0.65) * fps;
  const tEnd = Math.min(dur - 4, t1 + 24);
  // pointer value 0..60
  const v = interpolate(f, [0, t0, t0 + 8, t1, t1 + 8, tEnd, tEnd + 10], [8, 8, 0, 0, 55, 55, 10], {...clamp, easing: Easing.inOut(Easing.cubic)});
  // equal-width zones: value breakpoints -> x breakpoints (piecewise linear)
  const VB = [0, 4, 16, 45, 60], XB = [60, 300, 540, 780, 1020];
  const toX = (n: number) => interpolate(n, VB, XB, clamp);
  const zone = (a: number, b: number, color: string, text: string, active: boolean) => (
    <div style={{position: 'absolute', left: toX(a), width: toX(b) - toX(a), top: 0, height: 170, background: color, opacity: active ? 1 : 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: M, fontWeight: 900, fontSize: 36, borderRight: '4px solid #0b1a4a', color: '#fff', textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line'}}>{text}</div>
  );
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, transform: `scale(${0.85 + 0.15 * card})`, opacity: card}}>
        <div style={{textAlign: 'center', fontFamily: M, fontWeight: 900, fontSize: 52, color: '#fff', marginBottom: 40}}>ADS RUNNING</div>
        <div style={{position: 'relative', height: 170, borderRadius: 24, overflow: 'hidden', margin: '0 0'}}>
          {zone(0, 4, '#64748b', 'NO\nDEMAND', v < 4)}
          {zone(4, 16, GREEN, 'SWEET\nSPOT', v >= 4 && v <= 16)}
          {zone(16, 45, '#f59e0b', 'CROWDED', v > 16 && v < 45)}
          {zone(45, 60, RED, 'TOO\nLATE', v >= 45)}
        </div>
        <div style={{position: 'absolute', left: toX(v) - 22, top: 290, width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderBottom: '30px solid #fff'}} />
        <div style={{position: 'absolute', left: toX(v) - 150, top: 330, width: 300, textAlign: 'center'}}>
          <span style={{fontFamily: M, fontWeight: 900, fontSize: 110, color: '#fff'}}>{v >= 45 ? '50+' : Math.round(v)}</span>
          <div style={{fontFamily: M, fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.8}}>ADS</div>
        </div>
      </div>
    </>
  );
};

// ---------------- 8. TikTok DM: viewer sends VALIDATE, gets the free checklist ----------------
export const GDm: React.FC<{dur: number}> = ({dur}) => {
  const {f, sp, lin} = useAnim();
  const sheet = sp(0, 16);
  const typed = 'VALIDATE'.slice(0, Math.max(0, Math.floor((f - 6) / 2.2)));
  const sentAt = 6 + 8 * 2.2 + 6;
  const sent = f >= sentAt;
  const replyAt = sentAt + 14;
  const reply = sp(Math.round(replyAt), 14);
  const bubble = (text: string, mine: boolean, o: number, extra?: React.ReactNode) => (
    <div style={{display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding: '10px 36px', opacity: o, transform: `translateY(${(1 - o) * 20}px)`}}>
      {!mine && <div style={{width: 70, height: 70, borderRadius: 35, background: BLUE, marginRight: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: M, fontWeight: 900, fontSize: 34, color: '#fff'}}>D</div>}
      <div style={{maxWidth: 640, background: mine ? '#fe2c55' : '#f1f1f2', color: mine ? '#fff' : '#111', borderRadius: 30, padding: '20px 30px', fontFamily: T, fontWeight: 700, fontSize: 38}}>
        {text}
        {extra}
      </div>
    </div>
  );
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 1260, background: '#fff', borderRadius: '40px 40px 0 0', transform: `translateY(${(1 - sheet) * 1260}px)`, overflow: 'hidden'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '30px 40px', borderBottom: '2px solid #eee'}}>
          <div style={{width: 80, height: 80, borderRadius: 40, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: M, fontWeight: 900, fontSize: 38, color: '#fff'}}>D</div>
          <div>
            <div style={{fontFamily: T, fontWeight: 700, fontSize: 36, color: '#111'}}>dropsworth</div>
            <div style={{fontFamily: T, fontWeight: 500, fontSize: 26, color: '#22c55e'}}>Active now</div>
          </div>
        </div>
        <div style={{paddingTop: 40}}>
          {sent && bubble('VALIDATE', true, lin(sentAt, sentAt + 4))}
          {f >= replyAt && bubble("here's your free checklist 👇", false, reply,
            <div style={{marginTop: 16, background: '#fff', borderRadius: 18, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, border: '2px solid #e5e7eb'}}>
              <div style={{width: 64, height: 76, borderRadius: 8, background: BLUE, color: '#fff', fontFamily: M, fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>PDF</div>
              <div style={{fontFamily: M, fontWeight: 800, fontSize: 28, color: '#111'}}>Product Validation<br />Checklist</div>
            </div>)}
        </div>
        <div style={{position: 'absolute', left: 30, right: 30, bottom: 40, height: 100, borderRadius: 50, background: '#f1f1f2', display: 'flex', alignItems: 'center', padding: '0 36px', fontFamily: T, fontWeight: 700, fontSize: 38, color: !sent && typed ? '#111' : '#9a9aa0'}}>
          {!sent && typed ? typed : 'Message...'}
          {!sent && <span style={{opacity: Math.floor(f / 8) % 2, color: '#fe2c55', marginLeft: 2}}>|</span>}
          <div style={{marginLeft: 'auto', width: 70, height: 70, borderRadius: 35, background: typed && !sent ? '#fe2c55' : '#ddd', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34}}>➤</div>
        </div>
      </div>
    </>
  );
};

// ---------------- 5. TikTok comment section flooding with VALIDATE ----------------
const COMMENTERS = ['jay.dropship', 'kayla_ecom', 'mikeyscales', 'shopify.sam', 'dropwithdre', 'ecom.nina', 'tylerbuilds', 'zoe.sells', 'marco.ecom', 'lexi.store'];
export const GComments: React.FC<{dur: number}> = ({dur}) => {
  const {f, sp, lin} = useAnim();
  const sheet = sp(0, 16);
  const shown = Math.min(COMMENTERS.length, Math.floor(interpolate(f, [4, dur * 0.75], [1, COMMENTERS.length], clamp)));
  const typed = 'VALIDATE'.slice(0, Math.max(0, Math.floor((f - 6) / 2.4)));
  const total = Math.round(interpolate(f, [0, dur], [1840, 2413], clamp));
  return (
    <>
      <GBackground />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 1220, background: '#fff', borderRadius: '40px 40px 0 0', transform: `translateY(${(1 - sheet) * 1220}px)`, overflow: 'hidden'}}>
        <div style={{textAlign: 'center', fontFamily: T, fontWeight: 700, fontSize: 32, color: '#111', padding: '30px 0 20px'}}>{total.toLocaleString('en-US')} comments</div>
        <div style={{position: 'relative', height: 920, overflow: 'hidden'}}>
          {Array.from({length: shown}).map((_, k) => {
            const i = shown - 1 - k; // newest on top
            const o = k === 0 ? lin(0, 1) : 1;
            return (
              <div key={i} style={{display: 'flex', gap: 22, padding: '18px 40px', alignItems: 'center', opacity: o}}>
                <div style={{width: 76, height: 76, borderRadius: 38, background: `hsl(${(i * 47) % 360} 70% 60%)`, flexShrink: 0}} />
                <div style={{flex: 1}}>
                  <div style={{fontFamily: T, fontWeight: 500, fontSize: 26, color: '#8a8b91'}}>{COMMENTERS[i]}</div>
                  <div style={{fontFamily: T, fontWeight: 700, fontSize: 36, color: '#111'}}>VALIDATE</div>
                </div>
                <div style={{fontFamily: T, fontWeight: 500, fontSize: 24, color: '#8a8b91', textAlign: 'center'}}>♡<br />{(i * 13 + 4) % 90 + 3}</div>
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 30, right: 30, bottom: 40, height: 100, borderRadius: 50, background: '#f1f1f2', display: 'flex', alignItems: 'center', padding: '0 36px', fontFamily: T, fontWeight: 700, fontSize: 38, color: typed ? '#111' : '#9a9aa0'}}>
          {typed || 'Add comment...'}<span style={{opacity: Math.floor(f / 8) % 2, color: '#fe2c55', marginLeft: 2}}>|</span>
        </div>
      </div>
    </>
  );
};
