"""真书封面：豆瓣搜书 → 选版本 → 下大图 → 像素化成 web/assets/book_real（bookReveal 用）。
硬规则：书本一律用真实封面像素化，不许让 AI 画书。

  pk.py cover <项目> "书名"              搜索并自动选（书名完全一致的优先，再按评价人数）
  pk.py cover <项目> "书名" --pick 2     改选候选表里的第 2 个
  pk.py cover <项目> --id 34326931       直接用豆瓣条目 ID
  pk.py cover <项目> --image 封面.jpg    用本地封面图（豆瓣打不开、或想用别的版本时）
  --name book_tw                         输出成另一个素材名（默认 book_real；想同时展示两个版本时用）
  --lock auto|white|dark|none            封面上的白字/黑字锁成纯色，避免量化后发糊（默认 auto = 两种都锁；白底封面糊了改 dark）
  --width 120 --colors 18                像素封面宽度和颜色数（默认就是实测值）
搜索会顺着豆瓣「这本书的其他版本」把同一作品的所有版本都列出来（不同译名的大陆版/台版/原版都在里面）。
输出：gen/cover/c_<ID>.jpg（原图）、gen/cover/meta.json（书名/作者/出版社/年份）、
      web/assets/<name>.json + <name>_0.png、gen/cover/<name>_px_preview.png（原图 vs 像素版，拿来目检）
"""
import argparse, html, json, re, sys, urllib.parse, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'


def get(url, referer='https://book.douban.com/'):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': referer, 'Accept-Language': 'zh-CN,zh;q=0.9'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def search(q):
    ids = []
    try:
        for it in json.loads(get('https://book.douban.com/j/subject_suggest?q=' + urllib.parse.quote(q))):
            if it.get('type') == 'b':
                ids.append(it['id'])
    except Exception as e:
        print('  豆瓣联想接口失败：', e)
    try:
        page = get('https://www.douban.com/search?cat=1001&q=' + urllib.parse.quote(q), 'https://www.douban.com/').decode('utf-8', 'ignore')
        ids += re.findall(r'book\.douban\.com%2Fsubject%2F(\d+)', page) + re.findall(r'book\.douban\.com/subject/(\d+)', page)
    except Exception as e:
        print('  豆瓣搜索页失败：', e)
    seen = []
    for i in ids:
        if i not in seen:
            seen.append(i)
    for sid in seen[:2]:                                 # 顺着「其他版本」把同一作品的各个版本都拉进来（译名不同也能找到）
        try:
            w = re.search(r'book\.douban\.com/works/(\d+)', get(f'https://book.douban.com/subject/{sid}/').decode('utf-8', 'ignore'))
            if w:
                for e in re.findall(r'book\.douban\.com/subject/(\d+)/', get(f'https://book.douban.com/works/{w.group(1)}').decode('utf-8', 'ignore')):
                    if e not in seen:
                        seen.append(e)
        except Exception as e:
            print('  其他版本页失败：', e)
    return seen[:14]


def subject(sid):
    p = get(f'https://book.douban.com/subject/{sid}/').decode('utf-8', 'ignore')
    if 'sec.douban.com' in p[:3000] or 'og:image' not in p:
        raise RuntimeError('豆瓣要求验证/页面异常')
    f = lambda pat: (lambda m: html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else '')(re.search(pat, p, re.S))
    info = re.search(r'<div id="info"[^>]*>(.*?)</div>', p, re.S)
    info = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', info.group(1)))) if info else ''
    pick = lambda key: (re.search(key + r'\s*:\s*(.+?)(?=\s(?:[\u4e00-\u9fff]{2,4}|ISBN)\s*:|$)', info) or [None, ''])[1].strip()
    return {'id': sid, 'title': f(r'<span property="v:itemreviewed">(.*?)</span>'), 'img': f(r'<meta property="og:image" content="([^"]+)"'),
            'votes': int(f(r'<span property="v:votes">(\d+)</span>') or 0), 'rating': f(r'property="v:average"[^>]*>(.*?)<'),
            'author': pick('作者'), 'publisher': pick('出版社'), 'year': pick('出版年'), 'origin': pick('原作名')}


def pixel_cover(src, w, colors, lock):
    small = src.filter(ImageFilter.UnsharpMask(radius=2, percent=170, threshold=2)).resize((w, round(w * src.height / src.width)), Image.LANCZOS)
    a = np.array(small).astype(int)
    q = np.array(small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    if lock in ('auto', 'white'):
        q[(a.min(2) > 200) & (a.max(2) - a.min(2) < 28)] = [248, 248, 244]  # 接近纯白的字/底锁成一色（米色、浅黄不动）
    if lock in ('auto', 'dark'):
        q[a.max(2) < 70] = [24, 22, 22]                                      # 黑字锁成纯黑
    return Image.fromarray(q.astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('proj'); ap.add_argument('query', nargs='?')
    ap.add_argument('--id'); ap.add_argument('--image'); ap.add_argument('--pick', type=int, default=0); ap.add_argument('--name', default='book_real')
    ap.add_argument('--lock', default='auto', choices=['auto', 'white', 'dark', 'none'])
    ap.add_argument('--width', type=int, default=120); ap.add_argument('--colors', type=int, default=18)
    a = ap.parse_args()
    P = Path(a.proj).resolve(); C = P / 'gen' / 'cover'; C.mkdir(parents=True, exist_ok=True)
    meta = {}
    if a.image:
        img_path = Path(a.image).resolve()
        meta = {'title': a.query or '', 'source': 'local', 'file': img_path.name}
    else:
        if a.id:
            cands = [subject(a.id)]
        else:
            if not a.query:
                sys.exit('给书名，或 --id / --image')
            ids = search(a.query); cands = []
            for sid in ids:
                try:
                    cands.append(subject(sid))
                except Exception as e:
                    print(f'  跳过 {sid}：{e}')
            if not cands:
                sys.exit('豆瓣没搜到 / 打不开。办法：换个书名（大陆版常用译名）、或 --id 豆瓣条目号、或自己下载封面后 --image 封面.jpg')
            q = a.query.strip('《》 ')
            cands.sort(key=lambda c: (c['title'] != q, -c['votes']))
        print('候选版本（默认选 1 = 书名完全一致里评价最多的，没有完全一致的就选评价最多的。注意同一本书大陆版可能换了译名，'
              '比如《原子习惯》的大陆版叫《掌控习惯》：选哪个版本，旁白就念哪个书名，或者在旁白里交代译名）：')
        for i, c in enumerate(cands, 1):
            print(f"  {i}. 《{c['title']}》 {c['author']} / {c['publisher']} / {c['year']}  评分 {c['rating'] or '-'}（{c['votes']} 人）"
                  + (f"  原作名 {c['origin']}" if c['origin'] else '') + f"  id={c['id']}")
        c = cands[min(max(a.pick, 1), len(cands)) - 1]
        url = re.sub(r'/view/subject/[sm]/', '/view/subject/l/', c['img'])
        img_path = C / f"c_{c['id']}.jpg"
        img_path.write_bytes(get(url))
        meta = {**c, 'source': f"https://book.douban.com/subject/{c['id']}/"}
        (C / 'candidates.json').write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f"选用：《{c['title']}》 {c['publisher']} {c['year']}  → {img_path.name}")
    src = Image.open(img_path).convert('RGB')
    px = pixel_cover(src, a.width, a.colors, a.lock)
    A = P / 'web' / 'assets'; A.mkdir(parents=True, exist_ok=True)
    px.save(A / f'{a.name}_0.png')
    (A / f'{a.name}.json').write_text(json.dumps({'sprites': [{'file': f'{a.name}_0.png', 'w': px.width, 'h': px.height, 'headX': px.width / 2, 'headTop': 0}]}), encoding='utf-8')
    big = px.resize((px.width * 4, px.height * 4), Image.NEAREST)
    ref = src.resize((round(src.width * big.height / src.height), big.height), Image.LANCZOS)
    prev = Image.new('RGB', (ref.width + big.width + 30, big.height), (30, 30, 34)); prev.paste(ref, (0, 0)); prev.paste(big, (ref.width + 30, 0))
    prev.save(C / f'{a.name}_px_preview.png')
    meta.update({'px_size': [px.width, px.height]})
    (C / ('meta.json' if a.name == 'book_real' else f'meta_{a.name}.json')).write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    if (P / 'web' / 'project.config.js').exists():
        sys.path.insert(0, str(Path(__file__).resolve().parent)); from pk import sync; sync(P)
    print(f'像素封面 {px.width}×{px.height} → web/assets/{a.name}_0.png（ep.js 里 SP(\'{a.name}\')）；对比图 gen/cover/{a.name}_px_preview.png（打开看一眼书名清不清楚）')


if __name__ == '__main__':
    main()
