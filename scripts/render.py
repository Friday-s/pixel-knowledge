"""无头逐帧渲染：自带本地 HTTP 服务 → Playwright 调 window.__seek(t) → 帧直送 ffmpeg。
设 MV_PROJECT=项目目录（默认当前目录）。一般不直接调，用 pk.py stills / pk.py render。

  python render.py stills 0.5 6 10.5          # 抽样帧 → <项目>/stills/tXXX.XX.png
  python render.py range out.mp4 F0 F1        # 渲染第 F0..F1 帧（并行分段用）
"""
import base64, functools, http.server, os, subprocess, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(os.environ.get('MV_PROJECT', os.getcwd())).resolve()
WEB = Path(os.environ.get('MV_WEB', str(ROOT / 'web')))
LAUNCH_ARGS = ['--use-angle=metal', '--enable-gpu-rasterization'] if sys.platform == 'darwin' else ['--enable-gpu-rasterization']



class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    h = functools.partial(Quiet, directory=str(WEB))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def grab(page, t):
    url = page.evaluate("t => { window.__seek(t); return document.getElementById('c').toDataURL('image/png'); }", t)
    return base64.b64decode(url.split(',', 1)[1])


def main():
    mode = sys.argv[1]
    port = serve()
    with sync_playwright() as p:
        b = p.chromium.launch(args=LAUNCH_ARGS)
        page = b.new_page(viewport={'width': 1920, 'height': 1200})
        errs = []
        page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        page.on('pageerror', lambda e: errs.append(str(e)))
        try:
            page.goto(f'http://127.0.0.1:{port}/index.html?render')
            page.evaluate('window.__ready')
            page.wait_for_function('!!window.__seek', timeout=20000)
        except Exception as e:
            print('页面没能启动（多半是 ep.js 语法错、或登记的素材缺文件）：', str(e).splitlines()[0], flush=True)
            print('PAGE ERRORS:', errs[:8], flush=True)
            sys.exit(3)
        if mode == 'stills':
            out = ROOT / 'stills'; out.mkdir(exist_ok=True)
            for t in map(float, sys.argv[2:]):
                try:
                    (out / f't{t:06.2f}.png').write_bytes(grab(page, t))
                    print('still', t, flush=True)
                except Exception as e:
                    print(f'still {t} 出错：', str(e).splitlines()[0], flush=True)
        elif mode == 'range':
            dst, f0, f1 = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); fps = 30
            ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(fps), '-i', '-',
                                   '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', dst],
                                  stdin=subprocess.PIPE)
            for i in range(f0, f1):
                ff.stdin.write(grab(page, i / fps))
                if (i - f0) % 30 == 0:
                    print(f'{dst} {i - f0}/{f1 - f0}', flush=True)
            ff.stdin.close(); ff.wait()
            print('done', dst, flush=True)
        if errs:
            print('PAGE ERRORS:', errs[:5], flush=True)
            if mode == 'range':
                sys.exit(2)
        b.close()


if __name__ == '__main__':
    main()
