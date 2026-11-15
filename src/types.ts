export type Scene = {
  say: string;
  big: string;
  small?: string;
  visual: string; // e.g. "figure-confused" or "img:shopify-dashboard"
  score: number; // 0-100
  items?: string[];
  zoom?: number; // photo scenes: starting zoom (1.0-1.6) // used by checklist / signposts
  // Filled in by the voice step (seconds, relative to video start). Optional for silent previews.
  start?: number;
  end?: number;
  bigAt?: number;
  smallAt?: number;
};

export type VideoProps = {
  account?: string;
  audio?: string; // file in public/ e.g. "audio/001.mp3"
  scenes: Scene[];
};

export const FPS = 30;

// Fills in timings when there is no voiceover yet (silent preview).
export const withTimings = (scenes: Scene[]): Required<Pick<Scene, 'start' | 'end' | 'bigAt' | 'smallAt'>>[] & Scene[] => {
  let t = 0.2;
  return scenes.map((s) => {
    if (s.start !== undefined && s.end !== undefined) {
      return {...s, bigAt: s.bigAt ?? s.start + 0.1, smallAt: s.smallAt ?? s.start + (s.end - s.start) * 0.45} as any;
    }
    const words = s.say.split(/\s+/).length;
    const dur = Math.max(1.8, words * 0.34 + 0.6);
    const out = {...s, start: t, end: t + dur, bigAt: t + 0.1, smallAt: t + dur * 0.4};
    t += dur;
    return out as any;
  });
};
