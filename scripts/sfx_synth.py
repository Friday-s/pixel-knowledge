#!/usr/bin/env python3
"""程序化音效库：生成 24 种常用环境音/动作音（单声道 44.1kHz wav），无版权问题。

用法: python3 sfx_synth.py <输出目录>        # 默认生成到 skill 的 assets/sfx
用户自有音效：同名 wav 放进项目 music/sfx/ 会覆盖库里的版本（mix.py 优先读项目目录）。
"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 44100
rng = np.random.default_rng(2026)


def t_(d): return np.arange(int(SR * d)) / SR
def noise(d): return rng.standard_normal(int(SR * d)).astype(np.float32)
def env(d, a=0.01, r=0.3):
    t = t_(d); e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4)); return e
def lp(x, fc):                      # FFT 低通/带通
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(F / (1 + (f / fc) ** 4), len(x))
def bp(x, lo, hi):
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(F * ((f > lo) & (f < hi)), len(x))
def pink(d):
    x = noise(d); F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(F / np.sqrt(np.maximum(f, 30)), len(x))
def loopify(x, fade=0.5):           # 首尾交叉淡化，便于循环
    n = int(SR * fade); y = x[:-n].copy(); y[:n] = y[:n] * np.linspace(0, 1, n) + x[-n:] * np.linspace(1, 0, n); return y
def drops(d, rate, f0, decay, amp):
    out = np.zeros(int(SR * d))
    for _ in range(int(rate * d)):
        i = rng.integers(0, len(out) - 3000); m = 2500; tt = np.arange(m) / SR
        out[i:i + m] += np.sin(2 * np.pi * f0 * rng.uniform(0.7, 1.5) * tt) * np.exp(-tt * decay) * amp * rng.uniform(0.3, 1)
    return out
def norm(x, peak=0.8): return x / (np.abs(x).max() + 1e-9) * peak


def build():
    S = {}
    S['rain_light'] = loopify(norm(lp(pink(10.5), 6000)) * 0.5 + norm(drops(10.5, 40, 2800, 90, 1)) * 0.25)
    S['rain_heavy'] = loopify(norm(lp(pink(10.5), 8000)) * 0.8 + norm(drops(10.5, 120, 2400, 70, 1)) * 0.3)
    S['rain_umbrella'] = loopify(norm(drops(10.5, 70, 900, 45, 1) + 0.15 * bp(noise(10.5), 300, 2000)))
    S['rain_indoor'] = loopify(norm(lp(pink(10.5), 900)) * 0.7)
    th = lp(noise(6), 120) * env(6, 0.05, 2.0) + bp(noise(6), 200, 1500) * env(6, 0.01, 0.25) * 0.6
    S['thunder'] = norm(th)
    S['wind'] = loopify(norm(bp(pink(10.5), 150, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * t_(10.5)))))
    # 火车经过（8s）：隆隆 + 轨缝咔哒，包络中间最响
    d = 8; rum = norm(lp(noise(d), 140)); clk = np.zeros(int(SR * d))
    for c in np.arange(0.3, d - 0.3, 0.21):
        for dd in (0, 0.05):
            i = int((c + dd) * SR); tt = np.arange(1200) / SR
            if i + 1200 < len(clk): clk[i:i + 1200] += np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 60)
    S['train_pass'] = norm((rum * 0.6 + norm(clk) * 0.4) * np.sin(np.pi * t_(d) / d) ** 1.5)
    cab = np.zeros(int(SR * 8.5))
    for c in np.arange(0, 8.5, 0.42):
        i = int(c * SR); tt = np.arange(2000) / SR
        if i + 2000 < len(cab): cab[i:i + 2000] += np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 40)
    S['train_cabin'] = loopify(norm(norm(lp(noise(8.5), 200)) * 0.6 + norm(cab) * 0.4))
    S['fireworks_boom'] = norm(np.sin(2 * np.pi * 70 * t_(1.6)) * env(1.6, 0.005, 0.25) + lp(noise(1.6), 400) * env(1.6, 0.005, 0.15))
    cr = noise(2.2) * (rng.random(int(SR * 2.2)) < 0.015); S['fireworks_crackle'] = norm(bp(cr, 1500, 9000) * env(2.2, 0.05, 0.9))
    S['footstep_wet'] = norm(bp(noise(0.35), 200, 3000) * env(0.35, 0.005, 0.05) + drops(0.35, 20, 1800, 120, 0.3))
    t = t_(1.4); creak = np.sin(2 * np.pi * (180 + 60 * np.sin(2 * np.pi * 3 * t)) * t) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 37 * t)))
    S['door_creak'] = norm(bp(creak, 150, 2500) * env(1.4, 0.15, 0.8))
    S['umbrella_open'] = norm(bp(noise(0.6), 800, 6000) * env(0.6, 0.12, 0.12) + np.sin(2 * np.pi * 300 * t_(0.6)) * env(0.6, 0.45, 0.03) * 0.5)
    S['page_flip'] = norm(bp(noise(0.5), 1000, 8000) * np.sin(np.pi * t_(0.5) / 0.5) ** 2)
    sh = np.zeros(int(SR * 0.35)); sh[:600] = noise(600 / SR)[:600]; sh[5000:5600] = noise(600 / SR)[:600] * 0.7
    S['camera_shutter'] = norm(bp(sh, 1500, 9000))
    t = t_(2.5); bell = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(880, 1), (1760, 0.4), (2640, 0.2)]) * (np.sin(2 * np.pi * 14 * t) > 0) * env(2.5, 0.01, 1.2)
    S['school_bell'] = norm(bell)
    t = t_(10.5); S['cicadas'] = loopify(norm(bp(noise(10.5), 4000, 7000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * t))))
    birds = np.zeros(int(SR * 10.5))
    for _ in range(30):
        i = rng.integers(0, len(birds) - SR); d2 = rng.uniform(0.08, 0.2); tt = t_(d2); f0 = rng.uniform(2500, 4500)
        birds[i:i + len(tt)] += np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 12 * tt)) * tt) * np.sin(np.pi * tt / d2)
    S['birds'] = loopify(norm(birds) * 0.7)
    t = t_(10.5); S['crickets'] = loopify(norm(np.sin(2 * np.pi * 4200 * t) * (np.sin(2 * np.pi * 30 * t) > 0.6) * (np.sin(2 * np.pi * 0.7 * t) > -0.2)) * 0.5)
    S['crowd_murmur'] = loopify(norm(bp(pink(10.5), 250, 1800) * (0.7 + 0.3 * np.abs(np.sin(2 * np.pi * 1.7 * t_(10.5))))) * 0.6)
    S['chalk'] = norm(bp(noise(0.25), 2000, 9000) * (rng.random(int(SR * 0.25)) < 0.3) * env(0.25, 0.01, 0.1))
    S['paper_toss'] = norm(bp(noise(0.7), 600, 5000) * np.sin(np.pi * t_(0.7) / 0.7) ** 3)
    t = t_(1.2); S['sparkle'] = norm(sum(np.sin(2 * np.pi * f * t) * env(1.2, 0.002 + k * 0.06, 0.4) for k, f in enumerate([1568, 2093, 2637, 3136])))
    t = t_(0.12); S['text_pop'] = norm(np.sin(2 * np.pi * (900 + 1400 * t / 0.12) * t) * env(0.12, 0.002, 0.04)) * 0.6
    return S


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'assets' / 'sfx'
    out.mkdir(parents=True, exist_ok=True)
    for k, x in build().items():
        with wave.open(str(out / f'{k}.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    print(f'生成 {len(list(out.glob("*.wav")))} 个音效 → {out}')


if __name__ == '__main__':
    main()
