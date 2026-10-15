// 像素 MV 引擎内核：画布/资源/工具/镜头/角色/后期/转场/快照/调度/播放器

// 世界坐标 = 320×180 像素底板；精灵位置取整锁格，镜头可亚像素平滑移动。
// 全部画面由 seek(t) 纯函数决定，可无头逐帧导出。
'use strict';

const W = 1920, H = 1080, BW = PROJECT.bw || 320, BH = PROJECT.bh || 180, S = W / BW;   // 世界底板可配置，默认 320×180 ×6
const DUR = PROJECT.duration;
const GY = 156;            // 脚底地面线
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const off = document.createElement('canvas'); off.width = W; off.height = H;
const octx = off.getContext('2d');
const frz = document.createElement('canvas'); frz.width = W; frz.height = H;
const fctx = frz.getContext('2d');

// ---------- 资源 ----------
const IMG = {}, META = {};
const imgList = PROJECT.images;
const sheets = PROJECT.sheets;
function loadImg(name, src) {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => { IMG[name] = i; ok(); }; i.onerror = no; i.src = src; });
}
async function loadAll() {
  const jobs = imgList.map(n => loadImg(n, `assets/${n}.png`));
  for (const [s, n] of Object.entries(sheets)) {
    jobs.push(fetch(`assets/${s}.json`).then(r => r.json()).then(j => { META[s] = j.sprites; }));
    for (let i = 0; i < n; i++) jobs.push(loadImg(`${s}_${i}`, `assets/${s}_${i}.png`));
  }
  jobs.push(document.fonts.load('12px Ark')); jobs.push(document.fonts.load('12px ArkTW'));
  await Promise.all(jobs);
}

// ---------- 工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const seg = (t, a, b) => clamp((t - a) / (b - a));
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// 像素字：先在 1x 小画布上用像素字体渲染，再最近邻放大，保证字也锁格
const textCache = new Map();
function pixText(str, color, shadow) {
  const key = str + color + shadow;
  if (textCache.has(key)) return textCache.get(key);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = '12px Ark, ArkTW';
  const w = Math.ceil(g.measureText(str).width) + 2;
  c.width = w; c.height = 15;
  g.font = '12px Ark, ArkTW'; g.textBaseline = 'top';
  if (shadow) { g.fillStyle = shadow; g.fillText(str, 1, 2); }
  g.fillStyle = color; g.fillText(str, 0, 1);
  // 去掉抗锯齿半透明像素
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
  textCache.set(key, c);
  return c;
}

// 手持般的缓慢漂移（不是抖动）：让画面永远不完全静止
function drift(c, t) {
  return { ...c, cx: c.cx + Math.sin(t * 0.47) * 0.9 + Math.sin(t * 0.13) * 0.6, cy: c.cy + Math.cos(t * 0.39) * 0.6 };
}
// 呼吸：静止姿势跟着节拍上下 1 像素
function breath(t, x) { return (Math.floor((t - BEAT0) / BEAT + x * 0.011) & 1) ? 0 : -1; }

let curT = 0;
// ---------- 后期 ----------
let grain;
function makeGrain() {
  grain = document.createElement('canvas'); grain.width = grain.height = 256;
  const g = grain.getContext('2d'), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = rnd(i * 0.0137 + 11) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; }
  g.putImageData(d, 0, 0);
}


function caption(g, str, x, y, k, scale = 6, color = '#f6f1e4', shadow = '#2a3346') {
  // 打字机：k 0..1 决定显示多少字
  const n = Math.ceil(str.length * clamp(k));
  if (!n) return;
  const im = pixText(str.slice(0, n), color, shadow);
  g.imageSmoothingEnabled = false;
  g.drawImage(im, Math.round(x - pixText(str, color, shadow).width * scale / 2), y, im.width * scale, im.height * scale);
}

function dateStamp(g, txt = "'14 06 12") {
  const im = pixText(txt, '#ffb347', '#5a2a00');
  g.imageSmoothingEnabled = false;
  g.globalAlpha = 0.85;
  g.drawImage(im, W - im.width * 4 - 60, H - 100, im.width * 4, im.height * 4);
  g.globalAlpha = 1;
}

// 雨滴气泡（像原片的 la 雨滴），这里写"滴""答"
function dropBubble(g, ch, x, y, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const r = 58;
  g.fillStyle = 'rgba(240,248,255,0.55)'; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(x, y - r * 1.9); g.quadraticCurveTo(x + r * 1.05, y - r * 0.4, x + r, y);
  g.arc(x, y, r, 0, Math.PI); g.quadraticCurveTo(x - r * 1.05, y - r * 0.4, x, y - r * 1.9); g.fill(); g.stroke();
  const im = pixText(ch, '#3b5d8a', null);
  g.imageSmoothingEnabled = false;
  g.drawImage(im, Math.round(x - im.width * 3.5), Math.round(y - 62), im.width * 7, im.height * 7);
  g.restore();
}

// 站牌样式片名卡
function titleSign(g, t) {
  const a = seg(t, 0.7, 1.3) * (1 - seg(t, 4.3, 4.9));
  if (a <= 0) return;
  const k = ease(seg(t, 0.7, 1.4));
  g.save(); g.globalAlpha = a;
  g.translate(W / 2 - 60, 560 - (1 - k) * 60);
  const bw = 600, bh = 300;
  g.fillStyle = '#3a4a3e'; g.fillRect(-bw / 2 + 60, bh / 2 - 10, 18, 330); g.fillRect(bw / 2 - 78, bh / 2 - 10, 18, 330);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = '#2f6b4f'; g.fillRect(-bw / 2 - 8, -bh / 2 - 8, bw + 16, bh + 16);
  g.shadowColor = 'transparent';
  g.fillStyle = '#fbfaf4'; g.fillRect(-bw / 2, -bh / 2 + 26, bw, bh - 26);
  g.fillStyle = '#2f6b4f'; g.fillRect(-bw / 2, -bh / 2, bw, 26);
  caption(g, PROJECT.title, 0, -bh / 2 + 60, seg(t, 1.1, 2.2), 8, '#2a2f3a', null);
  caption(g, PROJECT.artist, 0, -bh / 2 + 172, seg(t, 2.0, 2.6), 4, '#5a6270', null);
  g.fillStyle = '#2f6b4f'; g.fillRect(-bw / 2, bh / 2 - 46, bw, 4);
  caption(g, PROJECT.credit, 0, bh / 2 - 36, seg(t, 2.4, 3.0), 2.5, '#2f6b4f', null);
  g.restore();
}


// ---------- 场景通用工具 ----------

function camKeys(keys, L) {
  // 关键帧字段：t, cx, cy, z, dof, rot(荷兰角°), shake(震动幅度, 世界像素), ease('io'|'lin'|'out'|'in'), whip(从上一镜甩过来)
  let i = 0;
  while (i < keys.length - 2 && L >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], span = b.t - a.t;
  const raw = span < 0.01 ? 1 : seg(L, a.t, b.t);
  const E = { io: ease, lin: x => x, out: x => 1 - (1 - x) ** 3, in: x => x ** 3 }[b.ease || 'io'];
  const k = E(raw);
  const c = {
    cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k), dof: lerp(a.dof || 0, b.dof || 0, k),
    rot: lerp(a.rot || 0, b.rot || 0, k), shake: lerp(a.shake || 0, b.shake || 0, k), whip: 0,
  };
  if (b.whip && span >= 0.01) c.whip = Math.sin(Math.PI * raw);                 // 甩镜：中段最模糊
  if (c.shake > 0) { const f = Math.floor(L * 30); c.cx += (rnd(f + 3) - 0.5) * c.shake; c.cy += (rnd(f + 7) - 0.5) * c.shake; }
  return drift(c, L * 1.3 + keys.length);
}
// 云一律用像素云精灵：pklib.js 的 driftClouds（pk_clouds），程序画的圆形云很假，已删
function worldT(g, cam) {
  const z = S * cam.z, r = (cam.rot || 0) * Math.PI / 180, co = Math.cos(r) * z, si = Math.sin(r) * z;
  return (px) => {
    const cx = cam.cx + (BW / 2 - cam.cx) * px, cy = cam.cy + (BH / 2 - cam.cy) * px;
    g.setTransform(co, si, -si, co, W / 2 - (co * cx - si * cy), H / 2 - (si * cx + co * cy));
  };
}
function dofF(cam, k) { return cam.dof > 0.05 ? `blur(${(cam.dof * cam.z * k).toFixed(2)}px)` : 'none'; }
// 以 headX 为锚画精灵；flip=true 水平镜像（朝左走）
function actor(g, sheet, f, x, bottom, flip = false, alpha = 1) {
  const im = IMG[`${sheet}_${f}`], m = META[sheet][f];
  if (!im) return;
  g.globalAlpha = alpha;
  if (!/walk|ex_umb|ex_adult/.test(sheet)) bottom += breath(curT, x);
  if (!flip) g.drawImage(im, Math.round(x - m.headX), Math.round(bottom - im.height));
  else {
    const left = Math.round(x - (im.width - m.headX));
    g.save(); g.translate(left + im.width, Math.round(bottom - im.height)); g.scale(-1, 1); g.drawImage(im, 0, 0); g.restore();
  }
  g.globalAlpha = 1;
}
const walkF = (L, fps = 1 / (BEAT / 8)) => Math.floor(Math.max(0, L) * fps) % 8;   // 一个走路循环 = 一拍

function postG(g, L, src, o = {}) {
  g.save();
  g.filter = `saturate(${o.sat ?? 0.92}) contrast(1.03) brightness(${o.bri ?? 1})`;
  g.drawImage(src, 0, 0); g.filter = 'none';
  if (o.tint) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = o.tint; g.fillRect(0, 0, W, H); }
  if (o.flash) { g.globalCompositeOperation = 'screen'; g.fillStyle = o.flash; g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = o.bloom ?? 0.25; g.filter = 'blur(24px) brightness(1.12)'; g.drawImage(src, 0, 0);
  g.filter = 'none'; g.globalAlpha = 1;
  if (o.rays) {
    for (let i = 0; i < 4; i++) {
      const x0 = W * (0.6 + i * 0.11) + Math.sin(L * 0.3 + i) * 30, w = 90 + i * 40;
      const gr = g.createLinearGradient(x0, 0, x0 - 520, H);
      gr.addColorStop(0, o.rays); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + w, 0); g.lineTo(x0 + w - 640, H); g.lineTo(x0 - 640, H); g.fill();
    }
  }
  g.globalCompositeOperation = 'source-over';
  if (o.dust) {
    g.fillStyle = o.dust;
    for (let i = 0; i < 26; i++) {
      const x = (rnd(i) * W + L * (14 + rnd(i + 3) * 18)) % W, y = (rnd(i + 7) * H - L * (6 + rnd(i + 1) * 10) + H * 4) % H;
      g.globalAlpha = 0.2 + 0.35 * Math.abs(Math.sin(L * 1.3 + i));
      g.fillRect(Math.round(x / 6) * 6, Math.round(y / 6) * 6, 6, 6);
    }
    g.globalAlpha = 1;
  }
  if (o.dark) { g.fillStyle = o.dark; g.fillRect(0, 0, W, H); }
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, o.vig || 'rgba(20,16,30,0.4)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const ox = Math.floor(rnd(Math.floor(L * 30) + 5) * 256), oy = Math.floor(rnd(Math.floor(L * 30) + 23) * 256);
  g.fillStyle = g.createPattern(grain, 'repeat');
  g.translate(-ox, -oy); g.fillRect(ox, oy, W, H);
  g.restore();
}

function worldBubble(g, x, y, text) {
  const im = pixText(text, '#3a3346', null), w = im.width + 6;
  const l = Math.round(x - w / 2), t = Math.round(y - 16);
  g.fillStyle = '#3a3346'; g.fillRect(l - 1, t - 1, w + 2, 17);
  g.fillStyle = '#fffaf0'; g.fillRect(l, t, w, 15);
  g.fillStyle = '#3a3346'; g.fillRect(Math.round(x) - 1, t + 16, 3, 1); g.fillRect(Math.round(x), t + 17, 1, 1);
  g.drawImage(im, l + 3, t + 1);
}

// 雨（屏幕外世界坐标，强度可调）
function rainLayer(g, L, layer, amount = 1, ground = GY) {
  const N = Math.round((layer === 0 ? 200 : 120) * amount);
  const speed = layer === 0 ? 150 : 230, len = layer === 0 ? 4 : 7;
  g.fillStyle = layer === 0 ? 'rgba(220,232,248,0.45)' : 'rgba(238,246,255,0.75)';
  for (let i = 0; i < N; i++) {
    const seed = i * 3.7 + layer * 1000, span = BH + 60, land = ground - 6 + rnd(seed + 5) * 30;
    const y = ((L * speed * (0.85 + rnd(seed + 2) * 0.3) + rnd(seed + 1) * span) % span) - 30;
    const x = Math.round(rnd(seed) * (BW + 160) - 80 + y * 0.12);
    if (y > land) {
      if ((y - land) / speed < 0.12 && layer === 1) { g.fillRect(x - 2, Math.round(land) - 1, 1, 1); g.fillRect(x + 2, Math.round(land) - 1, 1, 1); }
      continue;
    }
    g.fillRect(x, Math.round(y), 1, len);
  }
}

// ---------- 快照（回忆照片用）----------
const SNAP = new Map();
function snap(t) {
  if (!SNAP.has(t)) {
    SUPPRESS_LYR = true; renderRaw(t); SUPPRESS_LYR = false;
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    const g = c.getContext('2d'); g.drawImage(cv, 0, 0, 640, 360);
    SNAP.set(t, c);
  }
  return SNAP.get(t);
}
function polaroid(g, img, x, y, w, rot, caption, alpha = 1) {
  const h = w * 9 / 16, pad = w * 0.05, bottom = w * 0.17;
  g.save(); g.globalAlpha = alpha;
  g.translate(x, y); g.rotate(rot);
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  g.fillStyle = '#f7f5ef'; g.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad + bottom);
  g.shadowColor = 'transparent';
  g.drawImage(img, -w / 2, -h / 2, w, h);
  if (caption) {
    const im = pixText(caption, '#3a3f4a', null), sc = Math.max(2, Math.round(w / 220));
    g.imageSmoothingEnabled = false;
    g.drawImage(im, Math.round(-im.width * sc / 2), Math.round(h / 2 + bottom * 0.22), im.width * sc, im.height * sc);
  }
  g.restore();
}

// =====================================================================
// 调度 + 转场
// =====================================================================
function sceneIndex(t) { let i = 0; while (i < SCENES.length - 1 && t >= SCENES[i + 1][0]) i++; return i; }
function renderRaw(t) { const i = sceneIndex(t); SCENES[i][2](t); }

const caA = document.createElement('canvas'), caB = document.createElement('canvas');
caA.width = caB.width = W; caA.height = caB.height = H;
function chroma(d) {           // 红/青通道错位
  const a = caA.getContext('2d'), b = caB.getContext('2d');
  for (const [c, col] of [[a, '#ff0000'], [b, '#00ffff']]) {
    c.globalCompositeOperation = 'source-over'; c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = col; c.fillRect(0, 0, W, H);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(caA, -d, 0); ctx.drawImage(caB, d, 0);
  ctx.restore();
}
function vhs(t, k) {           // 录像带回闪：错位条带 + 扫描线
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const f = Math.floor(t * 30);
  for (let i = 0; i < 7; i++) {
    const y = Math.floor(rnd(f * 7 + i) * H), h = 16 + Math.floor(rnd(f * 3 + i) * 60), dx = Math.round((rnd(f * 5 + i) - 0.5) * 80 * k);
    ctx.drawImage(cv, 0, y, W, h, dx, y, W, h);
  }
  ctx.fillStyle = `rgba(0,0,0,${0.18 * k})`;
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  ctx.fillStyle = `rgba(255,255,255,${0.06 * k})`; ctx.fillRect(0, Math.floor(rnd(f) * H), W, 10);
  ctx.restore();
}

let NO_DATE = false, SCREEN_LYRICS = false;
function seek(t) {
  curT = t;
  const i = sceneIndex(t), [a, b, fn, outCol] = SCENES[i];
  LYR_QUEUE.length = 0; NO_DATE = false; SCREEN_LYRICS = false;
  fn(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  flushLyrics(ctx);                       // 歌词压在人物、配角、调色之上
  // 摄像机日期水印（场景可在本帧设 NO_DATE = true 隐藏）
  if (DATES[i] && !NO_DATE) dateStamp(ctx, DATES[i]);
  // 屏幕层歌词：没有环境物件的画面（相册、证件墙等）在本帧设 SCREEN_LYRICS = true
  if (typeof drawLyrics === 'function' && HAS_LYR && SCREEN_LYRICS) drawLyrics(ctx, t);
  const colOf = c => c === 'k' ? '8,8,14' : '255,252,244';
  if (outCol && i > 0) {
    const o = ease(seg(t, b - 0.45, b));
    if (o > 0) { ctx.fillStyle = `rgba(${colOf(outCol)},${o})`; ctx.fillRect(0, 0, W, H); }
  }
  if (i >= 2) {
    const prev = SCENES[i - 1][3];
    const o = 1 - ease(seg(t, a, a + 0.7));
    if (o > 0 && prev) { ctx.fillStyle = `rgba(${colOf(prev)},${o})`; ctx.fillRect(0, 0, W, H); }
  }
  // 转场色差：场景交界前后 0.3s
  let dmin = 9;
  for (let j = 1; j < SCENES.length; j++) dmin = Math.min(dmin, Math.abs(t - SCENES[j][0]));
  if (dmin < 0.3) chroma(Math.round(14 * (1 - dmin / 0.3)));
}



// =====================================================================
// 镜头语言工具（转场 / 时间重映射 / 甩镜模糊）
// =====================================================================
const fxC = document.createElement('canvas'); fxC.width = W; fxC.height = H;
// 甩镜/快速运镜的横向动态模糊：在 postG 之后调用
function camFX(c, cam) {
  if (!cam || !(cam.whip > 0.02)) return;
  const g = fxC.getContext('2d'); g.clearRect(0, 0, W, H); g.drawImage(cv, 0, 0);
  const n = 7, d = cam.whip * 90;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) { c.globalAlpha = 0.22; c.drawImage(fxC, (i / (n - 1) - 0.5) * d, 0); }
  c.restore();
}
// 时间重映射（升格慢动作 / 快进）：segs = [[开始, 结束, 速度], ...]，返回重映射后的局部时间
function ramp(L, segs) {
  let out = 0, last = 0;
  for (const [a, b, sp] of segs) {
    if (L <= a) break;
    out += (a - last); const e = Math.min(L, b); out += (e - a) * sp; last = b;
    if (L <= b) return out;
  }
  return out + (L - last);
}
// 光圈收放：k=0 全黑，k=1 全开；(x,y) 为圆心（屏幕像素）
function iris(c, k, x = W / 2, y = H / 2) {
  if (k >= 1) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#05060a';
  c.beginPath(); c.rect(0, 0, W, H); c.arc(x, y, Math.max(0, k) * Math.hypot(W, H) * 0.6, 0, Math.PI * 2, true); c.fill('evenodd');
  c.restore();
}
// 前景遮挡转场：一个深色剪影（柱子/树/人群）从右向左扫过，k 0..1
function fgWipe(c, k, col = '#0a0806', shape = 'pillar') {
  if (k <= 0 || k >= 1) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = col;
  const w = W * 0.9, x = W * 1.05 - (W * 2.1) * k;
  if (shape === 'palm') {
    c.fillRect(x + w * 0.42, 0, w * 0.16, H);
    for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(x + w * 0.5 + Math.cos(i) * w * 0.3, H * 0.12 + Math.sin(i * 2) * 60, w * 0.32, 70, i * 0.5, 0, Math.PI * 2); c.fill(); }
  } else c.fillRect(x, 0, w, H);
  c.restore();
}
function flashW(c, a, col = '255,250,240') { if (a > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(${col},${Math.min(1, a)})`; c.fillRect(0, 0, W, H); c.restore(); } }
// 电影遮幅（史诗段落用）：k 0..1
function letterbox(c, k) { if (k > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; const h = H * 0.12 * k; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h); c.restore(); } }
