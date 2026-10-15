// 启动：素材加载完成后挂上 __seek（无头渲染）或开始播放（预览）。必须最后加载。
'use strict';
// ---------- 播放器 ----------
let playing = true, t0 = performance.now(), base = 0;
const seekEl = document.getElementById('seek'), tc = document.getElementById('tc'), playBtn = document.getElementById('play');
function tick() {
  if (playing) {
    let t = base + (performance.now() - t0) / 1000;
    if (t > DUR) { base = 0; t0 = performance.now(); t = 0; }
    seek(t); seekEl.value = t; tc.textContent = t.toFixed(2) + 's';
  }
  requestAnimationFrame(tick);
}
seekEl.oninput = () => { playing = false; playBtn.textContent = '播放'; base = +seekEl.value; seek(base); tc.textContent = base.toFixed(2) + 's'; };
playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '暂停' : '播放'; base = curT; t0 = performance.now(); };

window.__ready = loadAll().then(() => {
  makeGrain();
  window.__seek = (t) => { playing = false; seek(t); };
  window.__dur = DUR;
  if (!/render/.test(location.search)) requestAnimationFrame(tick);
  else seek(0);
});
