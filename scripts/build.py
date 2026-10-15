"""整片出片：登记素材 → 本集配乐/音效 → 音效表（music/make_cues.py）→ 混音 → 并行渲染 → 合成 → 分享版 → qa 自检。

  pk.py render <项目> [--jobs 4] [--name 成片名] [--audio-only]
140 秒左右的一集，4 路并行在 M 系列 Mac 上约 10–20 分钟；务必放后台跑。
产物：out/<成片名>.mp4（高画质）、out/<成片名>_分享版.mp4（发平台用）、out/<成片名>_分享版_总览.jpg（qa 抽帧图）
"""
import argparse, json, math, re, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from pk import sync  # noqa: E402

FPS = 30


def sh(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], **kw)
    if r.returncode:
        sys.exit(f'失败：{" ".join(str(c) for c in cmd)[:200]}')
    return r


def encoders():
    try:
        return subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True).stdout
    except Exception:
        return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('proj'); ap.add_argument('--jobs', type=int, default=4); ap.add_argument('--name')
    ap.add_argument('--audio-only', action='store_true')
    a = ap.parse_args()
    P = Path(a.proj).resolve()
    for f in ('web/narration.js', 'web/episode.js', 'web/scenes/ep.js', 'music/song.wav'):
        if not (P / f).exists():
            sys.exit(f'缺 {f}：先 pk.py voice，再写 web/scenes/ep.js')
    title = json.loads((P / 'episode.json').read_text(encoding='utf-8'))['title']
    name = a.name or f'{title}_pixel-knowledge'
    sync(P)
    py = sys.executable
    sh([py, HERE / 'bgm.py', P])
    cues = P / 'music' / 'make_cues.py'
    if cues.exists():
        import os
        sh([py, cues, P], env={**os.environ, 'PYTHONPATH': str(HERE)})
    sh([py, HERE / 'mix.py', P])
    if a.audio_only:
        return
    dur = float(re.search(r'duration:\s*([\d.]+)', (P / 'web' / 'project.config.js').read_text(encoding='utf-8')).group(1))
    n = max(1, a.jobs)
    total = math.ceil(dur * FPS) + 3 + 2 * n               # 多渲几帧（片尾是黑场；分段拼接每段会丢约 1 帧），合成时按音频长度裁齐
    out = P / 'out'; parts = out / 'parts'; parts.mkdir(parents=True, exist_ok=True)
    for f in parts.glob('p*.mp4'):
        f.unlink()
    per = math.ceil(total / n); procs = []
    t0 = time.time()
    print(f'渲染 {total} 帧（{dur:.1f}s），{n} 路并行……', flush=True)
    for i in range(n):
        f0, f1 = i * per, min(total, (i + 1) * per)
        if f0 >= f1:
            continue
        log = open(parts / f'p{i}.log', 'w')
        procs.append((i, subprocess.Popen([py, HERE / 'render.py', 'range', parts / f'p{i}.mp4', str(f0), str(f1)],
                                          env={**__import__('os').environ, 'MV_PROJECT': str(P)}, stdout=log, stderr=subprocess.STDOUT), log, f1 - f0))
    while any(p.poll() is None for _, p, _, _ in procs):
        time.sleep(30)
        done = 0
        for i, _, _, cnt in procs:
            txt = (parts / f'p{i}.log').read_text(errors='ignore')
            m = re.findall(r' (\d+)/\d+', txt); done += cnt if 'done' in txt else (int(m[-1]) if m else 0)
        el = time.time() - t0
        print(f'  {done}/{total} 帧  已用 {el / 60:.1f} 分' + (f'  预计还要 {el / done * (total - done) / 60:.0f} 分' if done > total * 0.08 else '  （估算中）'), flush=True)
    for i, p, log, _ in procs:
        log.close()
        txt = (parts / f'p{i}.log').read_text(errors='ignore')
        if p.returncode or 'done' not in txt:
            print(f'第 {i} 段渲染失败：\n' + txt[-1500:]); sys.exit(1)
    (parts / 'list.txt').write_text(''.join(f"file 'p{i}.mp4'\n" for i, *_ in procs))
    sh(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', parts / 'list.txt', '-c', 'copy', parts / 'video.mp4'])
    main_mp4, share = out / f'{name}.mp4', out / f'{name}_分享版.mp4'
    sh(['ffmpeg', '-v', 'error', '-y', '-i', parts / 'video.mp4', '-i', P / 'music' / 'full_mix.wav', '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', main_mp4])
    enc = encoders()
    if 'hevc_videotoolbox' in enc:
        vopt = ['-c:v', 'hevc_videotoolbox', '-b:v', '8M', '-tag:v', 'hvc1']
    else:
        vopt = ['-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p']
    sh(['ffmpeg', '-v', 'error', '-y', '-i', main_mp4, *vopt, '-c:a', 'copy', '-movflags', '+faststart', share])
    for f in parts.glob('p*.mp4'):
        f.unlink()
    (parts / 'video.mp4').unlink(missing_ok=True)
    print(f'出片完成，用时 {(time.time() - t0) / 60:.1f} 分钟', flush=True)
    for f in (main_mp4, share):
        print(f'  {f.name}  {f.stat().st_size / 1e6:.0f} MB')
    subprocess.run([py, HERE / 'qa.py', share])


if __name__ == '__main__':
    main()
