"""静帧检查 / 精灵预览。

  pk.py stills <项目>                 每句的关键词时刻（K+0.3s）各抽一张 → stills/总览.jpg（标了句号和秒数）
  pk.py stills <项目> 12.5 30 44      指定秒数
  pk.py stills <项目> --every 4       每 4 秒一张
  pk.py stills <项目> --lines 8-14    只看第 8–14 句
（内部）stills.py sheet <项目> <名字>  把 web/assets/<名字>_*.png 放大并排 → gen/<名字>_px.png，标出帧号
"""
import json, os, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent


def font(sz):                                   # 用模板自带的像素字库标注，任何系统都有
    return ImageFont.truetype(str(HERE.parent / 'template' / 'web' / 'fonts' / 'fusion12.otf'), sz)


def narr(P):
    js = (P / 'web' / 'narration.js').read_text(encoding='utf-8')
    return json.loads(re.search(r'const NARR = (\[.*?\]);', js, re.S).group(1)), float(re.search(r'NARR_DUR = ([\d.]+)', js).group(1))


def frames(args):
    P = Path(args[0]).resolve(); rest = args[1:]
    N, dur = narr(P)
    labels = {}
    if rest and rest[0] == '--every':
        step = float(rest[1]); ts = [round(x * step + step / 2, 2) for x in range(int(dur // step))]
    elif rest and rest[0] == '--lines':
        a, b = (rest[1].split('-') + [rest[1]])[:2]; idx = range(int(a), int(b) + 1); ts = []
    elif rest:
        ts = [float(x) for x in rest]
    else:
        idx = range(len(N)); ts = []
    if not ts:
        for i in idx:
            l = N[i]; plain = l['text'].replace('[', '').replace(']', ''); at = l['text'].find('[')
            k = l['t'] + (l['end'] - l['t']) * (0 if at < 0 else at / max(1, len(plain)))
            t = round(min(k + 0.3, l['end'] - 0.05), 2); ts.append(t); labels[t] = f'#{i} '
    sys.path.insert(0, str(HERE)); from pk import sync; sync(P)
    env = dict(os.environ, MV_PROJECT=str(P))
    r = subprocess.run([sys.executable, str(HERE / 'render.py'), 'stills'] + [str(t) for t in ts], env=env, capture_output=True, text=True)
    print('\n'.join(l for l in (r.stdout + r.stderr).splitlines() if not l.startswith('still ') or '出错' in l))
    fs = [(t, P / 'stills' / f't{t:06.2f}.png') for t in ts]
    fs = [(t, f) for t, f in fs if f.exists()]
    if not fs:
        sys.exit('一张也没出来，看上面的报错')
    cols = 6 if len(fs) > 8 else min(4, len(fs)); rows = (len(fs) + cols - 1) // cols
    tw, th = 400, 225; sheet = Image.new('RGB', (cols * (tw + 4), rows * (th + 30)), (250, 250, 250)); d = ImageDraw.Draw(sheet); ft = font(24)
    for k, (t, f) in enumerate(fs):
        x, y = (k % cols) * (tw + 4), (k // cols) * (th + 30)
        sheet.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y))
        d.text((x + 4, y + th + 2), f'{labels.get(t, "")}{t:.2f}s', fill=(20, 20, 20), font=ft)
    out = P / 'stills' / '总览.jpg'; sheet.save(out, quality=86)
    print(f'{len(fs)} 张 → {out}（打开看；单张原图在 stills/tXXX.XX.png）')


def sheet(args):
    P = Path(args[0]).resolve(); name = args[1]; A = P / 'web' / 'assets'
    meta = json.loads((A / f'{name}.json').read_text(encoding='utf-8'))['sprites']
    ims = [Image.open(A / m['file']).convert('RGBA') for m in meta]
    s = 4 if max(i.height for i in ims) < 100 else 2
    W = sum(i.width * s + 16 for i in ims) + 16; H = max(i.height for i in ims) * s + 50
    out = Image.new('RGBA', (W, H), (70, 84, 110, 255)); d = ImageDraw.Draw(out); ft = font(24); x = 16
    for k, im in enumerate(ims):
        big = im.resize((im.width * s, im.height * s), Image.NEAREST)
        out.paste(big, (x, H - 34 - big.height), big); d.text((x, H - 28), f'{k}', fill=(255, 240, 160), font=ft); x += big.width + 16
    out.convert('RGB').save(P / 'gen' / f'{name}_px.png')
    print(f'{name}: {len(ims)} 帧 {[(i.width, i.height) for i in ims]} → 预览 gen/{name}_px.png（打开看抠像/切帧对不对）')


if __name__ == '__main__':
    {'frames': frames, 'sheet': sheet}[sys.argv[1]](sys.argv[2:])
