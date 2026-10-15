"""Codex 生图（内置 image_gen 工具）→ <项目>/gen/<名字>.png

  pk.py gen <项目> <名字> "<提示词>" [参考图…]
  pk.py gen <项目> --batch gen/batch.json [--jobs 4]
      batch.json = [{"name": "x_city", "prompt": "…", "refs": ["gen/x_hero.png"]}, …]
提示词里可以写 {STYLE}（角色像素画风，prompts/style16.txt）、{BG}（场景底板要求）、{GREEN} / {MAGENTA}（抠像背景要求），
会自动替换成 prompts/ 下的固定段落。已存在的同名图片直接跳过（想重画先删掉）。
单张 1–4 分钟；批量默认 4 张并行。需要 Codex CLI 已登录（codex login）。
"""
import json, re, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
PR = SKILL / 'prompts'


def expand(p):
    for key, f in (('STYLE', 'style16.txt'), ('BG', 'bg.txt'), ('GREEN', 'green.txt'), ('MAGENTA', 'magenta.txt')):
        p = p.replace('{' + key + '}', (PR / f).read_text(encoding='utf-8').strip())
    return p


def codex_flags():
    try:
        h = subprocess.run(['codex', 'exec', '--help'], capture_output=True, text=True, timeout=30).stdout
    except Exception:
        h = ''
    return ['--ephemeral'] if '--ephemeral' in h else []


def one(gen_dir, name, prompt, refs, extra):
    out = gen_dir / f'{name}.png'
    if out.exists():
        return f'{name} 已存在，跳过'
    t0 = time.time()
    imgs = []
    for r in refs or []:
        rp = Path(r) if Path(r).is_absolute() else (gen_dir.parent / r)
        if not rp.exists():
            return f'{name} 参考图不存在：{r}'
        imgs += ['-i', str(rp.resolve())]
    full = f'使用内置的 image_gen 工具生成一张图片：{expand(prompt)} 生成后把最终图片复制到当前目录，命名为 {name}.png，然后只回复文件名。'
    cmd = ['codex', 'exec', '--skip-git-repo-check', *extra, '-c', 'model_reasoning_effort="low"', '-C', str(gen_dir),
           '-s', 'workspace-write', *imgs, '--', full]
    log = gen_dir / f'{name}.log'
    with open(log, 'w', encoding='utf-8') as lf:
        subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=lf, stderr=subprocess.STDOUT, timeout=900)
    if not out.exists():                                    # 模型没按要求复制时，从日志里找生成图的路径
        hits = re.findall(r'(/[^\s\'"]*generated_images[^\s\'"]*\.png)', log.read_text(encoding='utf-8', errors='ignore'))
        if hits and Path(hits[-1]).exists():
            shutil.copy(hits[-1], out)
    return f"{name} {int(time.time() - t0)}s {'ok' if out.exists() else 'FAIL（看 gen/' + name + '.log）'}"


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if not shutil.which('codex'):
        sys.exit('没装 Codex CLI：npm i -g @openai/codex 然后 codex login。没有 Codex 也能做——只用 library 素材库 + 代码画（见 SKILL.md「没有 Codex 时」）')
    P = Path(a[0]).resolve(); G = P / 'gen'; G.mkdir(parents=True, exist_ok=True)
    extra = codex_flags()
    if len(a) >= 3 and a[1] == '--batch':
        jobs = json.loads((P / a[2] if not Path(a[2]).is_absolute() else Path(a[2])).read_text(encoding='utf-8'))
        n = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 4
        with ThreadPoolExecutor(n) as ex:
            for r in ex.map(lambda j: one(G, j['name'], j['prompt'], j.get('refs'), extra), jobs):
                print(r, flush=True)
    elif len(a) >= 3:
        print(one(G, a[1], a[2], a[3:], extra))
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
