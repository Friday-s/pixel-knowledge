"""本集音效表 → music/sfx_cues.json（pk.py render 会自动跑）。
auto() 已经铺好配乐和常规提示音；画面里有动作的地方（金币蹦出、门打开、铁栏落下、风声……）在下面补，时刻挂在句子上。"""
from cues import *  # noqa: F401,F403  —— NARR, DUR, A, E, K, KW, M, h, bed, auto, save

auto()
# 例：h('coin', K(12), 0.12)；h('impact', K(17), 0.25)；bed('wind', A(20) - 0.4, A(23), 0.18)
save()
