"""《学会提问》音效表：时刻全部按旁白句子算（读 web/narration.js）→ music/sfx_cues.json"""
import json, re
from pathlib import Path
P = Path(__file__).resolve().parent.parent
js = (P / 'web' / 'narration.js').read_text(encoding='utf-8')
NARR = json.loads(re.search(r'const NARR = (\[.*?\]);', js, re.S).group(1)); DUR = float(re.search(r'NARR_DUR = ([\d.]+)', js).group(1))
A = lambda i: NARR[i]['t']; E = lambda i: NARR[i]['end']
def K(i):
    l = NARR[i]; plain = l['text'].replace('[', '').replace(']', ''); at = l['text'].find('[')
    return l['t'] + (l['end'] - l['t']) * (0 if at < 0 else at / len(plain))
hits = []; h = lambda s, t, g=0.3: hits.append({'sfx': s, 'at': round(t, 3), 'gain': g})
for i in range(12): h('text_pop', 0.5 + i * 0.5 + 0.45, 0.16)
for j, at in enumerate([A(1) + 0.3, A(1) + 1.4, K(1)]): h('text_pop', at, 0.25)
h('impact', K(2) - 0.1, 0.22)
for i in range(16): h('coin', A(3) + 0.1 + i * 0.22 + 0.45, 0.06)
h('sparkle', K(4), 0.45)
h('sparkle', K(5) - 0.05, 0.45)
for i in range(5): h('text_pop', A(6) + 0.3 + i * 0.55, 0.2)
for i in range(3): h('text_pop', K(7) + i * 0.22, 0.25)
for li in (8, 14, 21): h('page_flip', A(li) - 0.4, 0.35); h('sparkle', K(li) + 0.35, 0.35)
h('text_pop', A(9) + 0.4, 0.3); h('page_flip', A(10) - 0.1, 0.3); h('text_pop', K(10), 0.25); h('text_pop', K(11), 0.25); h('sparkle', K(11) + 0.8, 0.3)
h('page_flip', A(12), 0.3); h('footstep_wet', A(13) + 0.4, 0.2); h('door_creak', K(13) - 0.1, 0.35)
for i in range(3): h('text_pop', A(15) + 0.5 + i * 0.6, 0.22)
h('text_pop', A(16) + 0.1, 0.3); h('text_pop', K(16) - 0.1, 0.25); h('page_flip', A(17) + 0.2, 0.3); h('text_pop', K(18) - 0.1, 0.3); h('whoosh', K(19) - 0.3, 0.3); h('impact', K(20), 0.2)
h('text_pop', K(22), 0.25); h('impact', A(23) + 0.45, 0.18); h('text_pop', K(23), 0.3); h('crowd_murmur', A(24) + 0.2, 0.15); h('text_pop', K(24), 0.3)
h('door_creak', A(25) + 0.2, 0.3); h('text_pop', K(25), 0.3); h('sparkle', K(25) + 0.6, 0.35); h('sparkle', K(26), 0.4)
h('sparkle', K(27) + 0.2, 0.3); h('page_flip', A(28) - 0.1, 0.3); h('text_pop', K(29), 0.3); h('sparkle', K(31), 0.35)
for i in range(12): h('text_pop', K(32) + i * 0.08, 0.12)
h('sparkle', K(33) - 0.05, 0.45); h('text_pop', A(34), 0.25); h('text_pop', A(35), 0.25); h('text_pop', A(35) + 1.2, 0.35)
beds = [{'sfx': 'bgm', 'start': 0, 'end': DUR, 'gain': 0.42, 'fade': [1.5, 2.0]},
        {'sfx': 'crowd_murmur', 'start': 0, 'end': A(3) - 0.2, 'gain': 0.08, 'fade': [1.0, 0.5]},
        {'sfx': 'birds', 'start': A(4) - 0.2, 'end': A(5) - 0.3, 'gain': 0.16, 'fade': [0.3, 0.3]},
        {'sfx': 'crowd_murmur', 'start': A(9) - 0.3, 'end': A(14) - 0.4, 'gain': 0.07, 'fade': [0.6, 0.5]},
        {'sfx': 'wind', 'start': A(22) - 0.3, 'end': A(27) - 0.4, 'gain': 0.12, 'fade': [0.6, 0.6]},
        {'sfx': 'birds', 'start': A(30) - 0.2, 'end': A(32) - 0.2, 'gain': 0.16, 'fade': [0.4, 0.4]},
        {'sfx': 'crowd_murmur', 'start': A(32) - 0.2, 'end': DUR, 'gain': 0.07, 'fade': [0.6, 1.5]}]
(P / 'music' / 'sfx_cues.json').write_text(json.dumps({'music_gain': 1.0, 'tail_fade': 1.4, 'beds': beds, 'hits': sorted(hits, key=lambda x: x['at'])}, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(hits), 'hits,', len(beds), 'beds, dur', DUR)
