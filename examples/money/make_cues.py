"""《金钱心理学》音效表：时刻全部按旁白句子算（读 web/narration.js）→ music/sfx_cues.json"""
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
coins = lambda t0, n, dt=0.08, g=0.06: [h('coin', t0 + i * dt, g) for i in range(n)]
# 序章
h('text_pop', A(0) + 0.3, 0.25); h('text_pop', K(0), 0.25)
h('page_flip', A(1) - 0.05, 0.3); h('text_pop', A(1) + 0.95, 0.3)
h('impact', K(2), 0.25); h('whoosh', K(2) + 0.2, 0.18)
h('sparkle', K(3), 0.45); coins(K(3), 14)
d4 = E(4) - A(4)
for ta in (A(4) + 0.1, A(4) + d4 * 0.42, K(4)): h('text_pop', ta, 0.22); h('text_pop', ta + 0.3, 0.12)
# 技能书 / 三关
h('sparkle', K(5) - 0.05, 0.45); h('page_flip', A(6) + 0.2, 0.3)
for i in range(3): h('text_pop', K(7) + i * 0.22, 0.25)
for li in (8, 14, 20): h('page_flip', A(li) - 0.4, 0.35); h('sparkle', K(li) + 0.35, 0.35)
# 第一关
h('whoosh', A(9) - 0.3, 0.3); h('text_pop', K(9) + 0.1, 0.25); h('impact', K(10), 0.12); h('text_pop', K(10), 0.25)
h('sparkle', K(11) - 0.05, 0.4)
d12 = E(12) - A(12)
h('text_pop', A(12) + 0.2, 0.22)
for tf in (A(12) + d12 * 0.3, A(12) + d12 * 0.58): h('whoosh', tf, 0.2); coins(tf + 0.45, 8, 0.05, 0.07)
h('sparkle', K(12), 0.4); h('page_flip', A(13) - 0.1, 0.3); h('text_pop', K(13), 0.25)
# 第二关
h('text_pop', A(15) + 0.1, 0.22); h('text_pop', K(15), 0.25)
for i in range(3): h('text_pop', A(16) + 0.2 + i * 0.25, 0.18)
h('impact', E(16) - 0.4, 0.12); h('text_pop', A(17) + 0.1, 0.25)
h('impact', K(17), 0.4); h('door_creak', K(17) - 0.05, 0.25); h('text_pop', K(17) + 0.15, 0.25)
for i in range(3): h('text_pop', A(18) + 0.15 + i * 0.3, 0.2)
h('whoosh', K(18) + 0.5, 0.2)
# 终点线：和 ep.js 的 goalState 同一套算法
x0, v, POS = 280, 400, [760, 1080, 1380, 1580]; ts, stopT = A(19), K(19) + 0.2
hx = lambda tt: x0 + 40 + v * max(0, tt - ts)
j = 0
while j < len(POS) - 1 and hx(stopT) >= POS[j] - 140:
    h('whoosh', ts + (POS[j] - 140 - x0 - 40) / v, 0.15); j += 1
arrive = ts + (POS[j] - 90 - x0 - 40) / v
for k in range(int((arrive - ts) / 0.3)): h('footstep_wet', ts + k * 0.3, 0.08)
h('sparkle', arrive, 0.45)
# 第三关
h('page_flip', A(21) - 0.3, 0.3); h('sparkle', K(21), 0.4); h('text_pop', A(22) + 0.4, 0.2); h('sparkle', K(22), 0.3)
for i in range(4): h('paper_toss', A(23) + 0.15 + i * 0.4, 0.15)
h('sparkle', K(23), 0.4); h('page_flip', A(24) + 0.05, 0.3); h('text_pop', K(24), 0.3)
# 隐藏关
h('sparkle', K(25) + 0.1, 0.4); h('sparkle', K(26), 0.45)
d27 = E(27) - A(27)
for ta in (A(27) + 0.1, A(27) + d27 * 0.32, K(27)): h('text_pop', ta, 0.2)
h('sparkle', K(28) - 0.1, 0.4)
# 终章
h('text_pop', A(29) + 0.2, 0.2); h('text_pop', A(29) + 0.4, 0.2); h('impact', K(30), 0.15)
h('sparkle', K(31), 0.3); coins(K(31), 10)
h('sparkle', K(32) - 0.05, 0.45); h('text_pop', A(33), 0.25); h('text_pop', A(34), 0.25); h('text_pop', A(34) + 1.2, 0.35)
beds = [{'sfx': 'bgm', 'start': 0, 'end': DUR, 'gain': 0.42, 'fade': [1.5, 2.0]},
        {'sfx': 'crowd_murmur', 'start': 0, 'end': A(5) - 0.3, 'gain': 0.07, 'fade': [1.0, 0.5]},
        {'sfx': 'crowd_murmur', 'start': A(9) - 0.3, 'end': A(11) - 0.3, 'gain': 0.07, 'fade': [0.5, 0.5]},
        {'sfx': 'wind', 'start': K(17) - 0.25, 'end': A(19) - 0.3, 'gain': 0.12, 'fade': [0.4, 0.4]},
        {'sfx': 'wind', 'start': A(25) - 0.4, 'end': A(29) - 0.3, 'gain': 0.07, 'fade': [0.6, 0.6]},
        {'sfx': 'crowd_murmur', 'start': A(29) - 0.3, 'end': DUR, 'gain': 0.07, 'fade': [0.6, 1.5]}]
(P / 'music' / 'sfx_cues.json').write_text(json.dumps({'music_gain': 1.0, 'tail_fade': 1.4, 'beds': beds, 'hits': sorted(hits, key=lambda x: x['at'])}, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(hits), 'hits,', len(beds), 'beds, dur', DUR, '| goal hops', j, 'arrive', round(arrive - ts, 2))
