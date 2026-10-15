"""本集程序化配乐与音效：bgm（暖色铺底 pad + 八分音符铃声琶音，长度跟旁白走）、coin、whoosh、impact → <项目>/music/sfx/*.wav
无采样、无版权问题。pk.py render 会自动调用。用法：python bgm.py <项目>
"""
import re, sys, wave
from pathlib import Path
import numpy as np

SR = 48000
P = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
OUT = P / 'music' / 'sfx'
rng = np.random.default_rng(7)


def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())


def hz(m): return 440 * 2 ** ((m - 69) / 12)


def bgm(dur=39.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    # 和弦（MIDI）：Am → F → C → G → Am → F → C → E
    prog = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 55, 60, 64], [55, 59, 62, 66],
            [57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 60, 67], [52, 56, 59, 64]]
    span = 4.0
    for k in range(int(np.ceil(dur / span))):
        ch = prog[k % len(prog)]; a, b = int(k * span * SR), min(n, int((k + 1) * span * SR + 1.2 * SR))
        tt = t[a:b] - k * span
        env = np.clip(tt / 1.2, 0, 1) * np.clip((span + 1.2 - tt) / 1.2, 0, 1)
        for m in ch:
            f = hz(m)
            x[a:b] += env * (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.003 * tt) + 0.5 * np.sin(2 * np.pi * f * 0.5 * tt)) * 0.05
        # 铃声琶音：八分音符
        for j in range(int(span / 0.4)):
            m = ch[[0, 1, 2, 3, 2, 1, 3, 2, 0, 2][j % 10]] + 12
            s0 = a + int(j * 0.4 * SR); L = int(1.6 * SR); e = min(n, s0 + L)
            u = np.arange(e - s0) / SR
            x[s0:e] += np.exp(-u * 3.2) * (np.sin(2 * np.pi * hz(m) * u) + 0.25 * np.sin(2 * np.pi * hz(m) * 3 * u)) * 0.028
    # 开场 4 秒：低音长音 + 渐强
    x += np.where(t < 7, np.sin(2 * np.pi * hz(33) * t) * np.clip(t / 3, 0, 1) * np.clip((7 - t) / 1.0, 0, 1) * 0.08, 0)
    # 简单混响：几路衰减延迟
    y = x.copy()
    for d, g in [(0.047, 0.35), (0.083, 0.28), (0.131, 0.22), (0.211, 0.16), (0.317, 0.11)]:
        k = int(d * SR); y[k:] += x[:-k] * g
    return y * np.clip(t / 1.5, 0, 1)


def coin():
    t = np.arange(int(0.22 * SR)) / SR
    return np.where(t < 0.06, np.sin(2 * np.pi * 1976 * t), np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 18)


def whoosh(d=1.2):
    n = int(d * SR); t = np.arange(n) / SR; w = rng.standard_normal(n)
    out = np.zeros(n); a = 0.0
    for i in range(n):           # 一阶低通，截止频率随时间升高
        c = 0.02 + 0.25 * (i / n); a += c * (w[i] - a); out[i] = a
    return out * np.sin(np.pi * t / d) ** 2


def impact():
    t = np.arange(int(1.4 * SR)) / SR
    boom = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 3.5)
    crack = rng.standard_normal(len(t)) * np.exp(-t * 22) * 0.6
    return boom + crack


cfg = P / 'web' / 'project.config.js'
DUR = float(re.search(r'duration:\s*([\d.]+)', cfg.read_text(encoding='utf-8')).group(1)) + 1.5 if cfg.exists() else 39.0
OUT.mkdir(parents=True, exist_ok=True)
save('bgm', bgm(DUR)); save('coin', coin()); save('whoosh', whoosh()); save('impact', impact())
print('配乐/音效', sorted(p.name for p in OUT.iterdir()), f'bgm {DUR:.1f}s')
