"""重画素材库总览图：references/library_sprites.png（角色/道具）+ library_backgrounds.png（背景）。往 library/assets 加了素材后跑一次。"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SK = Path(__file__).resolve().parent.parent
A = SK / 'library' / 'assets'
FT = ImageFont.truetype(str(SK / 'template' / 'web' / 'fonts' / 'fusion12.otf'), 24)
rows = []
for s in sorted(p.stem for p in A.glob('*.json')):
    meta = json.loads((A / f'{s}.json').read_text(encoding='utf-8'))['sprites']
    ims = [Image.open(A / m['file']).convert('RGBA') for m in meta]
    bg = len(ims) == 1 and ims[0].width >= 300
    sc = 2 if bg else 4
    W = sum(i.width * sc + 12 for i in ims) + 12; H = max(i.height for i in ims) * sc + 40
    r = Image.new('RGBA', (max(W, 420), H + 34), (70, 84, 110, 255)); d = ImageDraw.Draw(r)
    d.text((8, 4), f'{s}  {len(ims)}帧  {ims[0].width}×{ims[0].height}', fill=(255, 255, 255), font=FT)
    x = 12
    for k, im in enumerate(ims):
        big = im.resize((im.width * sc, im.height * sc), Image.NEAREST); r.paste(big, (x, 34 + H - 40 - big.height), big)
        d.text((x, H + 4), str(k), fill=(255, 230, 120), font=FT); x += big.width + 12
    rows.append((bg, r))
for name, group in (('library_sprites.png', [r for b, r in rows if not b]), ('library_backgrounds.png', [r for b, r in rows if b])):
    W = max(r.width for r in group); H = sum(r.height + 6 for r in group)
    out = Image.new('RGB', (W, H), (40, 44, 56)); y = 0
    for r in group:
        out.paste(r, (0, y)); y += r.height + 6
    out.save(SK / 'references' / name); print(name, out.size)
