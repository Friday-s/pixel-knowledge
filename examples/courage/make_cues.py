"""本集音效表：时刻全部按旁白句子算（读 web/narration.js），换配音后重跑即可 → music/sfx_cues.json"""
import json, re
from pathlib import Path
P = Path(__file__).resolve().parent.parent
js = (P / 'web' / 'narration.js').read_text(encoding='utf-8')
NARR = json.loads(re.search(r'const NARR = (\[.*?\]);', js, re.S).group(1)); DUR = float(re.search(r'NARR_DUR = ([\d.]+)', js).group(1))
A = lambda i: NARR[i]['t']; E = lambda i: NARR[i]['end']
def K(i):
    l = NARR[i]; plain = l['text'].replace('[', '').replace(']', ''); at = l['text'].find('[')
    return l['t'] + (l['end'] - l['t']) * (0 if at < 0 else at / len(plain))
hits = []
h = lambda s, t, g=0.3: hits.append({'sfx': s, 'at': round(t, 3), 'gain': g})
for i in range(8): h('paper_toss', 0.9 + i * 0.85, 0.18); h('text_pop', 0.9 + i * 0.85 + 0.45, 0.22)
h('impact', K(2), 0.25)
for i in range(5): h('text_pop', K(4) + i * 0.12, 0.16)
h('sparkle', K(5) - 0.05, 0.45)
for i in range(5): h('coin', K(6) - 0.5 + i * (E(6) - 0.2 - K(6) + 0.5) / 5, 0.12)
for i in range(3): h('text_pop', K(7) + i * 0.22, 0.25)
for li in (8, 17, 26): h('page_flip', A(li) - 0.4, 0.35); h('sparkle', K(li) + 0.35, 0.35)
h('text_pop', K(10) - 0.1, 0.3); h('whoosh', K(12), 0.3); h('text_pop', A(13), 0.25); h('text_pop', A(13) + 1.45, 0.3); h('text_pop', K(13), 0.3)
h('page_flip', A(14), 0.3); h('page_flip', A(15), 0.3); h('text_pop', A(16), 0.25); h('text_pop', K(16) + 0.2, 0.3)
h('door_creak', K(16) + 0.45, 0.45); h('sparkle', K(16) + 0.85, 0.4)
h('sparkle', K(19) - 0.05, 0.45); h('page_flip', A(20), 0.3); h('text_pop', K(21), 0.3)
for i in range(3): h('whoosh', A(22) + 0.35 + i * 0.6, 0.18)
for i in range(2): h('text_pop', E(22) - 0.6 + i * 0.25, 0.22)
h('text_pop', K(23), 0.3)
for i in range(3): h('text_pop', K(24) - 0.3 + i * 0.12, 0.2)
for i in range(5): h('paper_toss', K(25) - 0.7 + i * 0.12, 0.2)
h('sparkle', K(25), 0.4)
h('text_pop', K(27), 0.3); h('text_pop', A(29) + 0.5, 0.25); h('sparkle', A(29) + 1.6, 0.3); h('text_pop', K(29), 0.2)
h('whoosh', A(30) + 0.3, 0.35); h('whoosh', K(30), 0.3); h('page_flip', A(31), 0.3); h('sparkle', K(32), 0.3); h('text_pop', K(33) - 0.1, 0.3)
h('sparkle', K(35) - 0.05, 0.45); h('sparkle', K(36), 0.25)
for i in range(3): h('text_pop', K(38) + i * 0.25, 0.25)
h('sparkle', K(38) + 0.4, 0.45); h('text_pop', A(39), 0.25); h('text_pop', A(40), 0.25); h('text_pop', A(40) + 1.2, 0.35)
beds = [{'sfx': 'bgm', 'start': 0, 'end': DUR, 'gain': 0.42, 'fade': [1.5, 2.0]},
        {'sfx': 'crowd_murmur', 'start': 0, 'end': A(5) - 0.3, 'gain': 0.08, 'fade': [1.0, 0.6]},
        {'sfx': 'crowd_murmur', 'start': A(18) - 0.3, 'end': A(23) - 0.3, 'gain': 0.07, 'fade': [0.6, 0.5]},
        {'sfx': 'birds', 'start': A(23) - 0.3, 'end': A(24) - 0.2, 'gain': 0.18, 'fade': [0.4, 0.4]},
        {'sfx': 'crowd_murmur', 'start': A(25) - 0.2, 'end': A(26) - 0.4, 'gain': 0.08, 'fade': [0.4, 0.4]},
        {'sfx': 'wind', 'start': A(34) - 0.4, 'end': A(37) - 0.2, 'gain': 0.18, 'fade': [0.8, 0.6]},
        {'sfx': 'crowd_murmur', 'start': A(37) - 0.2, 'end': DUR, 'gain': 0.07, 'fade': [0.6, 1.5]}]
(P / 'music' / 'sfx_cues.json').write_text(json.dumps({'music_gain': 1.0, 'tail_fade': 1.4, 'beds': beds, 'hits': sorted(hits, key=lambda x: x['at'])}, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(hits), 'hits,', len(beds), 'beds, dur', DUR)
