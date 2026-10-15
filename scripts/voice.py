"""episode.json → 逐句 TTS（edge-tts，免费）→ 去首尾静音 → 拼 music/song.wav（立体声 48k）
+ web/narration.js（每句起止时刻）+ web/episode.js（片名/章节/书信息）+ 改写 project.config.js 的 duration。

episode.json:
{ "title": "书名", "book": {"name": "书名", "author": "作者", "kind": "传说 · 心理学"}, "channel": "频道名",
  "voice": "zh-CN-YunxiNeural", "rate": "+0%", "chapters": ["第一关", "第二关", "第三关", "隐藏关"], "tail": 2.6,
  "lines": [["文本，[关键词]用方括号", 句前停顿秒], …] }
改了哪句只重配哪句（按文本比对缓存）。换配音不用改画面：ep.js 里的时间全部挂在句子上。
"""
import asyncio, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
import edge_tts

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
EP = json.loads((P / 'episode.json').read_text(encoding='utf-8'))
SR = 48000


def check():
    bad = []
    for i, (t, g) in enumerate(EP['lines']):
        if t.count('[') != t.count(']'):
            bad.append(f'第 {i} 句方括号不成对：{t}')
        if not isinstance(g, (int, float)):
            bad.append(f'第 {i} 句停顿不是数字')
    if len(EP.get('chapters', [])) < 2:
        bad.append('chapters 至少两项（最后一项是隐藏关/终章）')
    if bad:
        sys.exit('\n'.join(bad))


async def tts(text, out):
    for k in range(4):
        try:
            await edge_tts.Communicate(text, EP.get('voice', 'zh-CN-YunxiNeural'), rate=EP.get('rate', '+0%')).save(str(out))
            return
        except Exception as e:
            if k == 3:
                raise
            await asyncio.sleep(2 + 3 * k)


def load(mp3):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-af',
                          'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                          '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768


async def main():
    check()
    d = P / 'music' / 'tts'; d.mkdir(parents=True, exist_ok=True)
    lines = EP['lines']
    plain = [t.replace('[', '').replace(']', '') for t, _ in lines]
    key = lambda i: plain[i] + '|' + EP.get('voice', '') + '|' + EP.get('rate', '')
    todo = [i for i in range(len(lines)) if not (d / f'l{i:02d}.mp3').exists() or not (d / f'l{i:02d}.txt').exists()
            or (d / f'l{i:02d}.txt').read_text(encoding='utf-8') != key(i)]
    sem = asyncio.Semaphore(6)
    async def one(i):
        async with sem:
            await tts(plain[i], d / f'l{i:02d}.mp3'); (d / f'l{i:02d}.txt').write_text(key(i), encoding='utf-8')
    await asyncio.gather(*[one(i) for i in todo])
    t, parts, tl = 0.0, [], []
    for i, (text, gap) in enumerate(lines):
        t += gap; x = load(d / f'l{i:02d}.mp3'); parts.append((t, x))
        tl.append({'t': round(t, 3), 'end': round(t + len(x) / SR, 3), 'text': text}); t += len(x) / SR
    dur = round(t + EP.get('tail', 2.5), 2)
    mix = np.zeros(int(dur * SR) + 1, np.float32)
    for t0, x in parts:
        a = int(t0 * SR); mix[a:a + len(x)] += x
    st = (np.clip(np.stack([mix, mix], 1), -1, 1) * 32767).astype('<i2')
    (P / 'music').mkdir(exist_ok=True)
    with wave.open(str(P / 'music' / 'song.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
    (P / 'web' / 'narration.js').write_text("// 旁白时间轴（pk.py voice 生成，勿手改）\n'use strict';\n"
        f"const NARR = {json.dumps(tl, ensure_ascii=False, indent=1)};\nconst NARR_DUR = {dur:.3f};\n", encoding='utf-8')
    meta = {k: EP[k] for k in ('title', 'channel', 'chapters', 'book') if k in EP}
    meta.setdefault('book', {'name': EP['title']})
    (P / 'web' / 'episode.js').write_text("// 本集元信息（pk.py voice 从 episode.json 生成，勿手改）\n'use strict';\n"
        f"const EPISODE = {json.dumps(meta, ensure_ascii=False)};\n", encoding='utf-8')
    cfg = P / 'web' / 'project.config.js'
    if cfg.exists():
        s = cfg.read_text(encoding='utf-8'); cfg.write_text(re.sub(r'duration:\s*[\d.]+', f'duration: {dur:.2f}', s), encoding='utf-8')
    print(f'{len(lines)} 句，新合成 {len(todo)} 句，总长 {dur:.2f}s（{int(dur // 60)}:{dur % 60:04.1f}）')
    for i, l in enumerate(tl):
        print(f"{i:>3}  {l['t']:7.2f}–{l['end']:7.2f}  {l['text']}")

asyncio.run(main())
