#!/usr/bin/env python3
"""成片质检：音画时长 / 动态量 / 静止段 / 抽帧总览图。

用法: python3 qa.py <成片.mp4> [抽帧间隔秒，默认按时长取 24 张]
合格线：音画时长差 <0.1s；没有超过 3 秒的静止段；接近静止秒数占比 <5%
"""
import subprocess, sys, json
import numpy as np


def main():
    src = sys.argv[1]
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,duration', '-of', 'json', src], capture_output=True, text=True).stdout)
    durs = {s['codec_type']: float(s.get('duration', 0)) for s in pr['streams']}
    print(f"时长  视频 {durs.get('video', 0):.2f}s  音频 {durs.get('audio', 0):.2f}s  差 {abs(durs.get('video', 0) - durs.get('audio', 0)):.2f}s")
    fps, w, h = 4, 160, 90
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={fps},scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    d = np.abs(np.diff(a, axis=0)).mean((1, 2))
    per = d[: len(d) // fps * fps].reshape(-1, fps).mean(1)
    still = per < 0.6
    holds, run, start = [], 0, 0
    for i, s in enumerate(still):
        if s:
            if run == 0: start = i
            run += 1
        else:
            if run >= 3: holds.append((start, run))
            run = 0
    if run >= 3: holds.append((start, run))
    holds = [hh for hh in holds if hh[0] < len(per) - 10]   # 片尾 10 秒的字幕定格不算
    print(f'动态  平均每秒变化 {per.mean():.2f}  接近静止占比 {still.mean() * 100:.0f}%  明显切换 {(d > 12).sum()} 次')
    print('静止段 ≥3s：' + ('无' if not holds else '，'.join(f'{s // 60}:{s % 60:02d} 起 {n}s' for s, n in holds)))
    vd = durs.get('video', 0) or len(per)
    step = float(sys.argv[2]) if len(sys.argv) > 2 else max(2.0, vd / 24)
    n = int(vd // step); cols = 6; rows = max(1, -(-n // cols))
    sheet = src.rsplit('.', 1)[0] + '_总览.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{step / 2:.2f}', '-i', src, '-vf', f'fps=1/{step},scale=480:-1,tile={cols}x{rows}:padding=4:color=white', '-frames:v', '1', '-q:v', '3', sheet])
    print('抽帧总览 →', sheet)
    ok = abs(durs.get('video', 0) - durs.get('audio', 0)) < 0.1 and not holds and still.mean() < 0.05
    print('结论：' + ('通过' if ok else '有问题，按上面逐项处理'))


if __name__ == '__main__':
    main()
