#!/usr/bin/env python3
"""pixel-knowledge 命令行入口。所有步骤都从这里调：

  python3 pk.py setup                    装依赖（skill 自己的 .venv + Chromium + 音效库），只需一次
  python3 pk.py doctor                   检查环境（缺什么、怎么装）
  python3 pk.py new <目录> --title 书名 [--author 作者] [--kind 传说·心理学] [--book-name 封面书名] [--channel 频道名]
  python3 pk.py cover <项目> [书名] [--id 豆瓣ID | --image 本地封面] [--pick N] [--name book_real] [--lock auto|white|dark|none]
  python3 pk.py gen <项目> <名字> "<提示词>" [参考图…]        Codex 生一张图 → <项目>/gen/<名字>.png
  python3 pk.py gen <项目> --batch gen/batch.json               批量并行（[{name, prompt, refs}]）
  python3 pk.py px <项目> <名字> [pixelize 参数…]               gen/<名字>.png → web/assets/<名字>_*.png + 预览图
  python3 pk.py voice <项目>             episode.json → 配音 + 时间轴（web/narration.js）
  python3 pk.py lines <项目>             打印每句的序号 / A 句首 / K 关键词 / E 句尾时刻（写 ep.js 时对照）
  python3 pk.py stills <项目> [秒…]      抽静帧 + 拼成一张总览图（不给秒数 = 每句关键词时刻各一张）
  python3 pk.py render <项目> [--jobs 4] [--name 成片名]   音效 → 混音 → 并行渲染 → 合成 → 分享版 → qa
  python3 pk.py qa <成片.mp4>            成片质检

所有命令都会自动切到 skill 目录下的 .venv（setup 建的）运行。
"""
import json, os, re, shutil, subprocess, sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SCRIPTS = SKILL / 'scripts'
VENV = Path(os.environ.get('PK_VENV', SKILL / '.venv'))
VPY = VENV / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
REQS = ['numpy>=2.0', 'pillow>=10', 'playwright>=1.45', 'edge-tts>=6.1']


def in_venv():
    try:
        return Path(sys.prefix).resolve() == VENV.resolve()
    except OSError:
        return False


def reexec_in_venv():
    if not in_venv() and VPY.exists() and not os.environ.get('PK_NO_VENV'):
        os.execv(str(VPY), [str(VPY), str(Path(__file__).resolve())] + sys.argv[1:])


def run(cmd, **kw):
    print('$', ' '.join(str(c) for c in cmd), flush=True)
    return subprocess.run([str(c) for c in cmd], **kw)


# ---------------------------------------------------------------- setup / doctor
def cmd_setup(args):
    if sys.version_info < (3, 9):
        sys.exit('需要 Python 3.9 以上')
    if not VPY.exists():
        run([sys.executable, '-m', 'venv', VENV], check=True)
    run([VPY, '-m', 'pip', 'install', '-q', '--upgrade', 'pip'], check=True)
    run([VPY, '-m', 'pip', 'install', '-q'] + REQS, check=True)
    if run([VPY, '-m', 'playwright', 'install', '--only-shell', 'chromium']).returncode:
        run([VPY, '-m', 'playwright', 'install', 'chromium'], check=True)
    run([VPY, SCRIPTS / 'sfx_synth.py', SKILL / 'library' / 'sfx'], check=True)
    print('\n依赖装好了。下面检查一遍：\n')
    os.environ['PK_NO_VENV'] = ''
    run([VPY, Path(__file__).resolve(), 'doctor'])


def cmd_doctor(args):
    ok = True
    def line(good, name, hint=''):
        nonlocal ok
        ok &= bool(good) or name.startswith('(可选)')
        print(('  ✓ ' if good else '  ✗ ') + name + ('' if good else f'  →  {hint}'))
    print(f'pixel-knowledge 环境检查（skill 目录 {SKILL}）')
    line(in_venv(), f'skill 自带 Python 环境 {VENV}', f'先运行：python3 "{SCRIPTS / "pk.py"}" setup')
    for mod in ('numpy', 'PIL', 'playwright', 'edge_tts'):
        try:
            __import__(mod); good = True
        except Exception:
            good = False
        line(good, f'Python 包 {mod}', 'python3 pk.py setup')
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            p.chromium.launch().close()
        good = True
    except Exception as e:
        good = False
    line(good, 'Chromium（无头渲染用）', 'python3 pk.py setup（会执行 playwright install chromium）')
    ff = shutil.which('ffmpeg')
    line(ff and shutil.which('ffprobe'), 'ffmpeg / ffprobe', 'macOS: brew install ffmpeg ；Windows: winget install ffmpeg ；Linux: apt install ffmpeg')
    line((SKILL / 'library' / 'sfx' / 'text_pop.wav').exists(), '程序化音效库', 'python3 pk.py setup')
    cx = shutil.which('codex')
    line(cx, '(可选) Codex CLI（生新场景/角色图）', 'npm i -g @openai/codex 然后 codex login（需要 ChatGPT 账号）；没有也能做，只用素材库')
    print('\n结论：' + ('可以开工' if ok else '有必需项没装好，按 → 后面的办法处理'))
    sys.exit(0 if ok else 1)


# ---------------------------------------------------------------- 新建一集
def cmd_new(args):
    import argparse
    ap = argparse.ArgumentParser(prog='pk.py new')
    ap.add_argument('dir'); ap.add_argument('--title', required=True)
    ap.add_argument('--author', default=''); ap.add_argument('--kind', default='传说 · 好书')
    ap.add_argument('--book-name', default='', help='技能书卡上的书名（封面版本的书名和片名不同时用，如片名原子习惯、封面掌控习惯）')
    ap.add_argument('--channel', default=os.environ.get('PK_CHANNEL', '读书搭子'))
    ap.add_argument('--voice', default='zh-CN-YunxiNeural')
    a = ap.parse_args(args)
    D = Path(a.dir).resolve()
    if D.exists() and any(D.iterdir()):
        sys.exit(f'{D} 已存在且不是空目录，换个名字')
    T = SKILL / 'template'
    for sub in ('gen', 'out', 'stills', 'music', 'web/assets', 'web/scenes'):
        (D / sub).mkdir(parents=True, exist_ok=True)
    shutil.copytree(T / 'web' / 'core', D / 'web' / 'core')
    shutil.copytree(T / 'web' / 'fonts', D / 'web' / 'fonts')
    for f in ('index.html', 'boot.js', 'project.timeline.js'):
        shutil.copy(T / 'web' / f, D / 'web' / f)
    shutil.copy(T / 'web' / 'scenes' / 'ep.js', D / 'web' / 'scenes' / 'ep.js')
    shutil.copy(T / 'music' / 'make_cues.py', D / 'music' / 'make_cues.py')
    for f in (SKILL / 'library' / 'assets').iterdir():
        shutil.copy(f, D / 'web' / 'assets' / f.name)
    ep = {'title': a.title, 'book': {'name': a.book_name or a.title, 'author': a.author, 'kind': a.kind}, 'channel': a.channel,
          'voice': a.voice, 'rate': '+0%', 'chapters': ['第一关标题', '第二关标题', '第三关标题', '隐藏关'], 'tail': 2.6,
          'lines': [['开场钩子，[关键词]用方括号。', 1.2]]}
    (D / 'episode.json').write_text(dump_episode(ep), encoding='utf-8')
    (D / 'web' / 'project.config.js').write_text(
        "'use strict';\n// sheets 由 pk.py sync 按 web/assets/*.json 自动登记，别手改\n"
        f"const PROJECT = {{ duration: 10.0, bw: 320, bh: 180, bpm: 60, beat0: 0, title: {json.dumps(a.title, ensure_ascii=False)}, artist: '', credit: '', images: [], sheets: {{}} }};\n"
        "const BEAT = 60 / PROJECT.bpm, BEAT0 = PROJECT.beat0;\n", encoding='utf-8')
    sync(D)
    print(f'建好了：{D}\n下一步：写 episode.json → pk.py cover → pk.py voice → 生图/像素化 → 写 web/scenes/ep.js → pk.py stills → pk.py render')


def dump_episode(ep):
    """episode.json 一句一行，方便改稿"""
    head = ',\n'.join(f' {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in ep.items() if k != 'lines')
    return '{\n' + head + ',\n "lines": [\n' + ',\n'.join('  ' + json.dumps(l, ensure_ascii=False) for l in ep['lines']) + '\n ]\n}\n'


def sync(D):
    """按 web/assets/*.json 登记精灵表到 project.config.js（帧数 = sprites 个数，缺帧报错）"""
    D = Path(D); A = D / 'web' / 'assets'; sheets = {}
    for j in sorted(A.glob('*.json')):
        n = len(json.loads(j.read_text(encoding='utf-8'))['sprites'])
        miss = [i for i in range(n) if not (A / f'{j.stem}_{i}.png').exists()]
        if miss:
            sys.exit(f'{j.name} 缺帧 {miss}')
        sheets[j.stem] = n
    cfg = D / 'web' / 'project.config.js'
    s = cfg.read_text(encoding='utf-8')
    s = re.sub(r'sheets:\s*\{[^}]*\}', 'sheets: ' + json.dumps(sheets).replace('"', ''), s)
    cfg.write_text(s, encoding='utf-8')
    return sheets


def cmd_sync(args):
    print(sync(Path(args[0]).resolve()))


def narr(D):
    js = (Path(D) / 'web' / 'narration.js').read_text(encoding='utf-8')
    return json.loads(re.search(r'const NARR = (\[.*?\]);', js, re.S).group(1)), float(re.search(r'NARR_DUR = ([\d.]+)', js).group(1))


def kw_time(l):
    plain = l['text'].replace('[', '').replace(']', ''); at = l['text'].find('[')
    return l['t'] + (l['end'] - l['t']) * (0 if at < 0 else at / max(1, len(plain)))


def cmd_lines(args):
    D = Path(args[0]).resolve()
    N, dur = narr(D)
    print(f'共 {len(N)} 句，总长 {dur:.2f}s    A=句首  K=关键词  E=句尾')
    for i, l in enumerate(N):
        print(f"{i:>3}  A {l['t']:7.2f}  K {kw_time(l):7.2f}  E {l['end']:7.2f}   {l['text']}")


# ---------------------------------------------------------------- 转发到各脚本
def fwd(script, args):
    sys.exit(subprocess.call([sys.executable, str(SCRIPTS / script)] + list(args)))


def cmd_px(args):
    if len(args) < 2:
        sys.exit('用法：pk.py px <项目> <名字> [--frames N --height 38 --key magenta --single --no-key --width 320 --colors 24 …]')
    D = Path(args[0]).resolve(); name = args[1]
    src = D / 'gen' / f'{name}.png'
    if not src.exists():
        sys.exit(f'找不到 {src}')
    rest = list(args[2:])
    if '--palette' in rest:                                 # 调色板路径相对项目目录
        i = rest.index('--palette') + 1
        if i < len(rest) and not Path(rest[i]).exists() and (D / rest[i]).exists():
            rest[i] = str(D / rest[i])
    for old in (D / 'web' / 'assets').glob(f'{name}_*.png'):
        old.unlink()
    r = subprocess.call([sys.executable, str(SCRIPTS / 'pixelize.py'), str(src), str(D / 'web' / 'assets' / name)] + rest)
    if r:
        sys.exit(r)
    sync(D)
    subprocess.call([sys.executable, str(SCRIPTS / 'stills.py'), 'sheet', str(D), name])


COMMANDS = {
    'setup': cmd_setup, 'doctor': cmd_doctor, 'new': cmd_new, 'sync': cmd_sync, 'lines': cmd_lines, 'px': cmd_px,
    'cover': lambda a: fwd('cover.py', a), 'gen': lambda a: fwd('gen.py', a), 'voice': lambda a: fwd('voice.py', a),
    'stills': lambda a: fwd('stills.py', ['frames'] + a), 'render': lambda a: fwd('build.py', a), 'qa': lambda a: fwd('qa.py', a),
}

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__); sys.exit(1)
    if sys.argv[1] != 'setup':
        reexec_in_venv()
    COMMANDS[sys.argv[1]](sys.argv[2:])
