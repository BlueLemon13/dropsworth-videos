"""Turn a script + voice segment timings into Remotion props.

Script line syntax (one line per spoken segment):
  *word      -> BIG emphasis word
  ^word      -> BIG + Dropsworth blue
  word=spoken_words  -> show `word`, but time it like the spoken words (e.g. ^$500=five_hundred_dollars)
  [visual key=val ...] -> switch visual at this point (swipe transition)
"""
import json, re, sys

def parse_visual(tok):
    parts = tok.strip('[]').split()
    v = {'visual': parts[0]}
    for p in parts[1:]:
        k, val = p.split('=', 1)
        if k == 'zoom':
            v['zoom'] = float(val)
        elif k == 'items':
            v['items'] = val.replace('_', ' ').split('|')
        elif k == 'ticks':
            v['tickWords'] = val.split('|')
        else:
            v[k] = val
    return v

def build(lines, segs, audio, fps=30, out=None):
    words, scenes = [], []
    for (a, b), line in zip(segs, lines):
        toks = re.findall(r'\[[^\]]+\]|\S+', line)
        items = []  # (kind, data)
        for t in toks:
            if t.startswith('['):
                items.append(('scene', parse_visual(t)))
            else:
                big = t.startswith('*') or t.startswith('^')
                blue = t.startswith('^')
                t2 = t.lstrip('*^')
                disp, _, spoken = t2.partition('=')
                spoken = spoken.replace('_', ' ') if spoken else disp
                weight = sum(len(re.sub(r'[^A-Za-z0-9$]', '', w)) + 2.5 for w in spoken.split())
                if re.search(r'[.,?!]$', disp):
                    weight += 2  # tiny pause after punctuation
                items.append(('word', dict(text=disp, big=big, blue=blue, w=weight, spoken=spoken.lower())))
        total = sum(d['w'] for k, d in items if k == 'word')
        t = a
        for k, d in items:
            if k == 'scene':
                d['start'] = round(t, 3)
                scenes.append(d)
            else:
                d['t'] = round(t, 3)
                t += (b - a) * d['w'] / total
                d['end'] = round(t, 3)
                words.append(d)
    end = segs[-1][1]
    for i, s in enumerate(scenes):
        s['end'] = scenes[i + 1]['start'] if i + 1 < len(scenes) else end + 0.6
        if 'tickWords' in s:
            s['ticks'] = []
            for tw in s.pop('tickWords'):
                hit = next((w['t'] - s['start'] for w in words if w['t'] >= s['start'] and w['text'].lower().strip('.,') == tw.lower()), None)
                s['ticks'].append(round(hit, 3) if hit is not None else None)
    # caption groups: max 3 words, break after punctuation and before/after big words
    groups, cur = [], []
    for i, w in enumerate(words):
        if cur and (len(cur) >= 3 or (w['big'] and len(cur) >= 2)):
            groups.append(cur); cur = []
        cur.append(i)
        if re.search(r'[.,?!]$', w['text']):
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    # also break groups at scene starts
    starts = [s['start'] for s in scenes]
    g2 = []
    for g in groups:
        part = [g[0]]
        for i in g[1:]:
            if any(words[part[-1]]['t'] < st <= words[i]['t'] for st in starts):
                g2.append(part); part = []
            part.append(i)
        g2.append(part)
    groups = [dict(words=g, start=words[g[0]]['t'], end=(words[g2[j + 1][0]]['t'] if j + 1 < len(g2) else end + 0.6)) for j, g in enumerate(g2)]
    for w in words:
        for k in ('w', 'spoken'):
            w.pop(k, None)
    props = dict(audio=audio, words=words, groups=groups, scenes=scenes, duration=round(end + 0.6, 3))
    if out:
        json.dump(props, open(out, 'w'), indent=1)
    return props

if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    segs = json.load(open(spec['segments']))
    build(spec['lines'], segs, spec['audio'], out=sys.argv[2])
