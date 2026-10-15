"""音效表工具（给每集的 music/make_cues.py 用）。时刻全部挂在旁白句子上，换配音后重跑就对齐。

  from cues import *          # NARR, DUR, A, E, K, KW, M（锚句）, h(), bed(), auto(), save()
  auto()                      # 自动层：配乐铺底、每句关键词 text_pop、书出现 sparkle、关卡翻页 + 闪光、隐藏关、终章打字和按键
  h('coin', K(12), 0.12)      # 本集特有的动作音效
  bed('wind', A(20), A(23), 0.15)
  save()                      # → music/sfx_cues.json

可用音效：本集合成的 bgm coin whoosh impact；library/sfx 里的 rain_light rain_heavy rain_umbrella rain_indoor thunder wind
train_pass train_cabin fireworks_boom fireworks_crackle footstep_wet door_creak umbrella_open page_flip camera_shutter
school_bell cicadas birds crickets crowd_murmur chalk paper_toss sparkle text_pop
"""
import json, re, sys
from pathlib import Path

P = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
_js = (P / 'web' / 'narration.js').read_text(encoding='utf-8')
NARR = json.loads(re.search(r'const NARR = (\[.*?\]);', _js, re.S).group(1))
DUR = float(re.search(r'NARR_DUR = ([\d.]+)', _js).group(1))
A = lambda i: NARR[i]['t']
E = lambda i: NARR[i]['end']
PLAIN = [l['text'].replace('[', '').replace(']', '') for l in NARR]


def K(i):
    l = NARR[i]; at = l['text'].find('[')
    return l['t'] + (l['end'] - l['t']) * (0 if at < 0 else at / max(1, len(PLAIN[i])))


def KW(i):
    m = re.search(r'\[(.*?)\]', NARR[i]['text']); return m.group(1) if m else ''


def _marks():                                   # 和 pklib.js 的 pkMarks() 同一套规则
    n = len(PLAIN); find = lambda pat, a=0: next((i for i in range(a, n) if re.search(pat, PLAIN[i])), -1)
    levels = [i for i in range(n) if re.match(r'^第[一二三四五六七八九十]+[关招课步]', PLAIN[i])]
    book = find(r'《.+》'); last = levels[-1] if levels else book
    hidden = find(r'隐藏关', last + 1)
    comment = next((i for i in range(n - 1, -1, -1) if '评论区' in PLAIN[i]), n - 2)
    outro = find(r'回到开头|回到最开始', max(hidden, last) + 1)
    if outro < 0: outro = max(max(hidden, last) + 2, comment - 3)
    item = find(r'道具', outro)
    if item < 0 or item >= comment: item = comment - 1
    return {'book': book, 'levels': levels, 'hidden': hidden, 'outro': outro, 'item': item, 'comment': comment, 'follow': n - 1}


M = _marks()
HITS, BEDS = [], []


def h(sfx, at, gain=0.3, **kw):
    HITS.append({'sfx': sfx, 'at': round(max(0, at), 3), 'gain': gain, **kw})


def bed(sfx, start, end, gain=0.1, fade=(0.6, 0.6)):
    BEDS.append({'sfx': sfx, 'start': round(max(0, start), 3), 'end': round(min(DUR, end), 3), 'gain': gain, 'fade': list(fade)})


def auto(bgm_gain=0.42):
    bed('bgm', 0, DUR, bgm_gain, (1.5, 2.0))
    bed('crowd_murmur', 0, A(M['book']) - 0.3, 0.07, (1.0, 0.6))
    marked = set(M['levels'] + [M['book'], M['hidden'], M['item'], M['comment'], M['follow']])
    for i in range(len(NARR)):
        if KW(i) and i not in marked:
            h('text_pop', K(i), 0.18)
    h('sparkle', K(M['book']) - 0.05, 0.45)
    for li in M['levels']:
        h('page_flip', A(li) - 0.4, 0.35); h('sparkle', K(li) + 0.35, 0.35)
    if M['hidden'] >= 0:
        h('page_flip', A(M['hidden']) - 0.4, 0.3); h('sparkle', K(M['hidden']), 0.45)
    h('sparkle', K(M['item']) - 0.05, 0.45)
    for k in range(6):
        h('text_pop', A(M['comment']) + 0.8 + k * 0.25, 0.12)
    h('text_pop', A(M['follow']), 0.25); h('text_pop', A(M['follow']) + 1.2, 0.35)


def save(music_gain=1.0):
    hits = sorted(HITS, key=lambda x: x['at']); out = []
    for x in hits:                               # 同一音效 0.08s 内只留一个
        if not any(y['sfx'] == x['sfx'] and abs(y['at'] - x['at']) < 0.08 for y in out):
            out.append(x)
    (P / 'music' / 'sfx_cues.json').write_text(json.dumps({'music_gain': music_gain, 'tail_fade': 1.4, 'beds': BEDS, 'hits': out}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'音效表：{len(out)} 个点状音效，{len(BEDS)} 段铺底，总长 {DUR:.1f}s')
