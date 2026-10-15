#!/usr/bin/env python3
"""混音：原曲 + 音效提示表（music/sfx_cues.json）→ music/full_mix.wav

用法: python3 mix.py <项目目录>
sfx_cues.json 格式：
{
  "music_gain": 0.9, "tail_fade": 1.5, "end": 47.0,          // end 可选：只取前 N 秒（demo/预告），结尾按 tail_fade 淡出
  "beds": [ {"sfx": "rain_heavy", "start": 0, "end": 17.4, "gain": 0.25, "fade": [1.0, 0.8]} ],   // 循环铺底
  "hits": [ {"sfx": "train_pass", "at": 26.0, "gain": 0.5, "pan": 0.6, "pan_to": -0.6} ]        // 单次，pan -1 左 … 1 右
}
音效查找顺序：<项目>/music/sfx/<名>.wav（本集 bgm/coin/whoosh/impact）→ skill library/sfx/<名>.wav（24 种程序化音效）
"""
import json, sys, wave
from pathlib import Path
import numpy as np

LIB = Path(__file__).resolve().parent.parent / 'library' / 'sfx'


def read(p):
    w = wave.open(str(p)); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr


def load_sfx(proj, name, sr):
    for p in (proj / 'music' / 'sfx' / f'{name}.wav', LIB / f'{name}.wav'):
        if p.exists():
            x, s0 = read(p)
            if s0 != sr:
                x = np.interp(np.arange(0, len(x), s0 / sr), np.arange(len(x)), x)
            return x
    raise FileNotFoundError(f'找不到音效 {name}')


def main():
    proj = Path(sys.argv[1]).resolve()
    w = wave.open(str(proj / 'music' / 'song.wav')); sr = w.getframerate()
    song = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(np.float32) / 32768
    cfg_p = proj / 'music' / 'sfx_cues.json'
    cfg = json.loads(cfg_p.read_text(encoding='utf-8')) if cfg_p.exists() else {}
    if cfg.get('end'):
        song = song[: int(cfg['end'] * sr)]
    n = len(song); t = np.arange(n) / sr
    mix = song * cfg.get('music_gain', 0.9)
    for b in cfg.get('beds', []):
        x = load_sfx(proj, b['sfx'], sr)
        i0, i1 = int(b['start'] * sr), min(n, int(b['end'] * sr))
        reps = int(np.ceil((i1 - i0) / len(x))) + 1
        seg = np.tile(x, reps)[: i1 - i0]
        fi, fo = b.get('fade', [0.8, 0.8])
        tt = np.arange(i1 - i0) / sr; e = np.clip(np.minimum(tt / max(fi, 1e-3), (tt[-1] - tt) / max(fo, 1e-3)), 0, 1)
        seg = seg * e * b.get('gain', 0.2)
        mix[i0:i1, 0] += seg; mix[i0:i1, 1] += np.roll(seg, 257)
    for h in cfg.get('hits', []):
        x = load_sfx(proj, h['sfx'], sr) * h.get('gain', 0.5)
        i0 = int(h['at'] * sr); m = min(len(x), n - i0)
        if m <= 0: continue
        p0, p1 = h.get('pan', 0), h.get('pan_to', h.get('pan', 0))
        pan = np.linspace(p0, p1, m)
        mix[i0:i0 + m, 0] += x[:m] * np.clip(1 - pan, 0, 1.5) * 0.7
        mix[i0:i0 + m, 1] += x[:m] * np.clip(1 + pan, 0, 1.5) * 0.7
    tf = cfg.get('tail_fade', 1.5)
    mix *= np.clip((t[-1] - t) / tf, 0, 1)[:, None]
    mix *= 0.95 / (np.abs(mix).max() + 1e-9)
    out = proj / 'music' / 'full_mix.wav'
    with wave.open(str(out), 'wb') as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr); o.writeframes((mix * 32767).astype('<i2').tobytes())
    print(f'混音完成 {n / sr:.2f}s：{len(cfg.get("beds", []))} 段铺底，{len(cfg.get("hits", []))} 个点状音效 → {out}')


if __name__ == '__main__':
    main()
