"""把 AI 生成的"假像素"图转成真像素精灵。

绿幕抠像 → 按列空隙切分多个角色 → 同一张表用同一缩放（保持相对大小）
→ 每个格子取不透明像素的中位色 → 共享调色板量化 → 输出 RGBA PNG。

用法:
  python pixelize.py sheet.png out_prefix --height 56 --colors 24 [--palette-from a.png b.png] [--ref-height 0]
  --height   该表里"最高的那个人物"在真像素下的高度
  --palette  可传一个已有的调色板 png（.pal.png）以复用同一角色的颜色
"""
import argparse, json, sys
import numpy as np
from PIL import Image


KEY = 'green'


def green_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    if KEY == 'magenta':
        return (np.minimum(r, b) - g > 110) & (r > 170) & (b > 170)
    return (g - np.maximum(r, b) > 60) & (g > 120)


def split_columns(fg, min_gap=6, min_w=10):
    cols = fg.any(axis=0)
    spans, start, gap = [], None, 0
    for x, on in enumerate(cols):
        if on:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, x - gap + 1)); start = None; gap = 0
    if start is not None:
        spans.append((start, len(cols)))
    return [s for s in spans if s[1] - s[0] >= min_w]


def cell_reduce(rgb, fg, cell, cover=0.45):
    """每格取"众数色"（先粗量化到 16 级再统计），比中位数更不会混出脏色。"""
    h, w = fg.shape
    H, W = int(round(h / cell)), int(round(w / cell))
    out = np.zeros((H, W, 4), np.uint8)
    q = (rgb // 16).astype(np.int32)
    key = (q[..., 0] << 8) | (q[..., 1] << 4) | q[..., 2]
    for j in range(H):
        for i in range(W):
            y0, x0 = int(j * cell), int(i * cell)
            y1, x1 = min(h, int((j + 1) * cell)), min(w, int((i + 1) * cell))
            # 只看格子中间 70%，避开 AI 网格漂移造成的边缘混色
            my, mx = int((y1 - y0) * 0.15), int((x1 - x0) * 0.15)
            ys, xs = slice(y0 + my, max(y0 + my + 1, y1 - my)), slice(x0 + mx, max(x0 + mx + 1, x1 - mx))
            m = fg[ys, xs]
            if m.size and m.mean() > cover:
                k = key[ys, xs][m]
                vals, cnt = np.unique(k, return_counts=True)
                best = vals[cnt.argmax()]
                out[j, i, :3] = np.median(rgb[ys, xs][m][k == best], 0)
                out[j, i, 3] = 255
    return out


def kmeans_palette(px, k, iters=12, seed=0):
    rng = np.random.default_rng(seed)
    px = px.astype(float)
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(iters):
        d = ((px[:, None, :] - c[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for i in range(k):
            sel = px[lab == i]
            if len(sel):
                c[i] = sel.mean(0)
    return c.round().astype(np.uint8)


def apply_palette(img, pal):
    a = img[..., 3] > 0
    px = img[..., :3][a].astype(int)
    d = ((px[:, None, :] - pal[None].astype(int)) ** 2).sum(-1)
    img = img.copy()
    img[..., :3][a] = pal[d.argmin(1)]
    return img


GRAY_MAX = 222


def is_gray(px):
    mx, mn = px[..., :3].max(-1).astype(int), px[..., :3].min(-1).astype(int)
    return (px[..., 3] > 0) & (mx - mn < 22) & (mx > 120) & (mx < GRAY_MAX)


def is_skin(px):
    r, g, b = [px[..., i].astype(int) for i in range(3)]
    return (px[..., 3] > 0) & (r > 190) & (g > 140) & (g < 220) & (b > 110) & (b < 200) & (r - b > 30)


def find_stick(s):
    g = is_gray(s)
    al = s[..., 3] > 0
    cnt = al.sum(1)
    rows = np.where(cnt > 0.22 * cnt.max())[0]
    head_top = rows.min() if len(rows) else s.shape[0]
    best = None
    for x in range(s.shape[1]):
        col = g[:, x]; y = 0
        while y < len(col):
            if col[y]:
                y0 = y
                while y < len(col) and col[y]:
                    y += 1
                if y0 <= head_top + 2 and (best is None or y - y0 > best[2]):
                    best = (x, y0, y - y0)
            else:
                y += 1
    return best if best and best[2] >= 5 else None


def repair_stick(s):
    st = find_stick(s)
    if st is None:
        return s
    sx, y0, ln = st
    g = is_gray(s)
    ys = np.where(g[:, sx])[0]
    y1 = ys.max()
    s = s.copy()
    light = np.array([204, 206, 212, 255], np.uint8)
    dark = np.array([70, 62, 72, 255], np.uint8)
    for y in range(y0, y1 + 1):
        if is_skin(s[y:y + 1, sx:sx + 1])[0, 0]:
            continue
        s[y, sx] = light
        for dx in (-1, 1):
            x = sx + dx
            if 0 <= x < s.shape[1] and (s[y, x, 3] == 0 or is_gray(s[y:y + 1, x:x + 1])[0, 0]):
                s[y, x] = dark
    if y0 > 0:
        s[y0 - 1, sx] = dark
    return s


def repair_stick_at(s, sx, y0):
    """擦掉 sx±2 列的旧伞柄像素，再从 y0 画到手的位置。"""
    s = s.copy()
    h, w = s.shape[:2]
    sx = max(1, min(w - 2, sx))
    lo, hi = max(0, sx - 2), min(w, sx + 3)
    hand = None
    for y in range(max(0, y0), h):
        if is_skin(s[y:y + 1, lo:hi]).any():
            hand = y; break
    if hand is None or hand - y0 > h * 0.6:
        hand = min(h, y0 + int(h * 0.35))
    for y in range(max(0, y0 - 1), hand):
        for x in range(lo, hi):
            px = s[y, x]
            if px[3] and (px[:3].max() - px[:3].min() < 30) and (px[:3].max() > 150 or px[:3].max() < 90):
                # 旧伞柄的浅色 / 描边：只在头部以外（左右没有大块头发/皮肤）时清除
                s[y, x, 3] = 0
    light = np.array([214, 216, 222, 255], np.uint8)
    dark = np.array([70, 62, 72, 255], np.uint8)
    for y in range(max(0, y0), hand):
        s[y, sx] = light
        for x in (sx - 1, sx + 1):
            if s[y, x, 3] == 0:
                s[y, x] = dark
    if y0 > 0:
        s[y0 - 1, sx - 1:sx + 2] = dark
    return s


def repair_stick_old(s):
    g = is_gray(s)
    if g.sum() < 4:
        return s
    h = s.shape[0]
    upper = g[: h // 2]                       # 伞柄在上半身
    if upper.sum() == 0:
        return s
    sx = int(np.argmax(upper.sum(0)))
    ys = np.where(g[:, sx])[0]
    if len(ys) == 0:
        return s
    y0, y1 = ys.min(), ys.max()
    # 向上延伸：顶端以上若同列还有残缺的灰/暗色，补到最顶的那个
    s = s.copy()
    light = np.array([204, 206, 212, 255], np.uint8)
    dark = np.array([70, 62, 72, 255], np.uint8)
    for y in range(y0, y1 + 1):
        if is_skin(s[y:y + 1, sx:sx + 1])[0, 0]:
            continue
        s[y, sx] = light
        for dx in (-1, 1):
            x = sx + dx
            if 0 <= x < s.shape[1] and (s[y, x, 3] == 0 or is_gray(s[y:y + 1, x:x + 1])[0, 0]):
                s[y, x] = dark
    if y0 > 0:
        s[y0 - 1, sx] = dark                   # 顶端封口
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--height', type=int, default=56)
    ap.add_argument('--colors', type=int, default=24)
    ap.add_argument('--palette', default=None)
    ap.add_argument('--single', action='store_true', help='不切分，整张当一个精灵')
    ap.add_argument('--no-key', action='store_true', help='不抠绿幕（背景图）')
    ap.add_argument('--width', type=int, default=0, help='背景图: 目标宽度')
    ap.add_argument('--frames', type=int, default=0, help='按帧数切分（在等分线附近找投影谷底）')
    ap.add_argument('--stick', action='store_true', help='修复竖直伞柄为连续 3px 细杆')
    ap.add_argument('--skip-gray', action='store_true', help='量身高时忽略浅灰低饱和像素（伞柄）')
    ap.add_argument('--gray-max', type=int, default=222)
    ap.add_argument('--key', default='green', choices=['green', 'magenta'])
    a = ap.parse_args()
    global KEY, GRAY_MAX
    KEY = a.key
    GRAY_MAX = a.gray_max

    rgb = np.array(Image.open(a.src).convert('RGB'))
    fg = np.ones(rgb.shape[:2], bool) if a.no_key else ~green_mask(rgb)
    # 去掉孤立噪点行列
    if a.no_key:
        spans = [(0, rgb.shape[1])]
    elif a.single:
        cx = np.where(fg.any(0))[0]; spans = [(cx.min(), cx.max() + 1)]
    else:
        spans = split_columns(fg)
    if a.frames:
        cols = fg.sum(0).astype(float)
        nz = np.where(cols > 0)[0]; L, R = nz.min(), nz.max() + 1
        fw = (R - L) / a.frames
        cuts = [L]
        for k in range(1, a.frames):
            c = int(L + k * fw); r = int(fw * 0.3)
            cuts.append(c - r + int(np.argmin(cols[c - r:c + r])))
        cuts.append(R)
        spans = list(zip(cuts[:-1], cuts[1:]))

    boxes = []
    for x0, x1 in spans:
        rows = np.where(fg[:, x0:x1].any(1))[0]
        boxes.append((x0, rows.min(), x1, rows.max() + 1))
    if a.no_key and a.width:
        cell = rgb.shape[1] / a.width
    elif a.width:
        cell = (max(b[2] for b in boxes) - min(b[0] for b in boxes)) / a.width
    else:
        mfg = fg
        if a.skip_gray:
            mx, mn = rgb.max(-1).astype(int), rgb.min(-1).astype(int)
            mfg = fg & ~((mx - mn < 22) & (mx > 120) & (mx < 222))
        def body_h(x0, x1):
            cnt = mfg[:, x0:x1].sum(1)
            r = np.where(cnt > 0.22 * cnt.max())[0]
            return r.max() - r.min() + 1
        tallest = max(body_h(b[0], b[2]) for b in boxes)
        cell = tallest / a.height
    # 统一脚底基线：所有精灵用同一高度画布，底对齐
    base = max(b[3] for b in boxes)
    top = min(b[1] for b in boxes)

    sprites = []
    raw_sticks = []
    for (x0, y0, x1, y1) in boxes:
        sprites.append(cell_reduce(rgb[top:base, x0:x1], fg[top:base, x0:x1], cell))
        if a.stick:
            sub = rgb[top:base, x0:x1].astype(int); f = fg[top:base, x0:x1]
            light = f & (sub.max(-1) - sub.min(-1) < 30) & (sub.max(-1) > 165)
            runs = []
            for x in range(light.shape[1]):
                col = light[:, x]; best = (0, 0); y = 0
                while y < len(col):
                    if col[y]:
                        y0r = y
                        while y < len(col) and col[y]:
                            y += 1
                        if y - y0r > best[0]:
                            best = (y - y0r, y0r)
                    else:
                        y += 1
                runs.append(best)
            mr = max(r[0] for r in runs)
            cols = [x for x, r in enumerate(runs) if r[0] >= 0.7 * mr]
            raw_sticks.append((float(np.mean(cols)) / cell, min(runs[x][1] for x in cols) / cell) if mr > 3 * cell else None)

    if a.palette:
        pal = np.array(Image.open(a.palette).convert('RGB')).reshape(-1, 3)
    else:
        allpx = np.concatenate([s[..., :3][s[..., 3] > 0] for s in sprites])
        if len(allpx) > 40000:
            allpx = allpx[np.random.default_rng(1).choice(len(allpx), 40000, replace=False)]
        side = int(np.ceil(np.sqrt(len(allpx))))
        tile = np.zeros((side * side, 3), np.uint8); tile[:len(allpx)] = allpx; tile[len(allpx):] = allpx[0]
        qi = Image.fromarray(tile.reshape(side, side, 3)).quantize(a.colors, method=Image.Quantize.MEDIANCUT)
        pal = np.array(qi.getpalette()[:a.colors * 3], np.uint8).reshape(-1, 3)
        Image.fromarray(pal.reshape(1, -1, 3)).save(a.out + '.pal.png')

    meta = []
    for i, s in enumerate(sprites):
        s = apply_palette(s, pal)
        if a.stick and raw_sticks[i]:
            s = repair_stick_at(s, int(round(raw_sticks[i][0] - 0.5)), int(round(raw_sticks[i][1])))
        Image.fromarray(s).save(f'{a.out}_{i}.png')
        al = s[..., 3] > 0
        mx, mn = s[..., :3].max(-1).astype(int), s[..., :3].min(-1).astype(int)
        gray = al & (mx - mn < 22) & (mx > 120) & (mx < GRAY_MAX)
        body = al & ~gray
        cnt = body.sum(1)
        rows = np.where(cnt > 0.22 * cnt.max())[0] if cnt.max() else np.array([0])
        top = rows.min()
        head = body[top:top + 10]
        hx = float(np.where(head.any(0))[0].mean()) if head.any() else s.shape[1] / 2
        m = {'file': f'{a.out.split("/")[-1]}_{i}.png', 'w': s.shape[1], 'h': s.shape[0],
             'headX': round(hx, 1), 'headTop': int(top)}
        if a.stick and raw_sticks[i]:
            m['stickTop'] = [int(round(raw_sticks[i][0] - 0.5)), int(round(raw_sticks[i][1]))]
        elif gray.sum() >= 4:
            gy, gx = np.where(gray)
            t = gy.argmin(); m['stickTop'] = [int(gx[t]), int(gy[t])]
        meta.append(m)
    json.dump({'cell': cell, 'sprites': meta}, open(a.out + '.json', 'w'), indent=1)
    print(a.src, 'cell=%.2f' % cell, [(m['w'], m['h']) for m in meta])


if __name__ == '__main__':
    main()
