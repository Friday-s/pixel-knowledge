// pixel-knowledge 场景工具库（模板层，跨集复用；每集只写 scenes/ep.js）
// 时间一律挂在旁白句子上：A(i) 句首 / E(i) 句尾 / K(i) 关键词时刻 —— 换配音、改文稿后画面自动跟着走。
'use strict';

const SP = n => IMG[n + '_0'];
const A = i => NARR[i].t, E = i => NARR[i].end, K = i => kwTime(i);
const KW = i => ((NARR[i] || {}).text || '').match(/\[(.*?)\]/)?.[1] || '';     // 第 i 句里 [] 包的第一个关键词
const CN = '一二三四五六七八九十';

// 文稿里的固定锚句（按句子内容自动找，写 episode.json 时保留这些句式）：
// book「…《书名》…」  levels「第一关/第二关/第三关：…」开头  hidden 含「隐藏关」  outro 含「回到开头」
// item 含「道具」（终章拿到的道具）  comment 含「评论区」  follow 最后一句（关注我…）
function pkMarks() {
  const T = NARR.map(l => l.text.replace(/[\[\]]/g, '')), n = T.length, find = (re, from = 0) => { for (let i = from; i < n; i++) if (re.test(T[i])) return i; return -1; };
  const levels = []; for (let i = 0; i < n; i++) if (/^第[一二三四五六七八九十]+[关招课步]/.test(T[i])) levels.push(i);
  const book = find(/《.+》/), last = levels.length ? levels[levels.length - 1] : book;
  const hidden = find(/隐藏关/, last + 1), comment = (() => { for (let i = n - 1; i >= 0; i--) if (/评论区/.test(T[i])) return i; return n - 2; })();
  let outro = find(/回到开头|回到最开始/, Math.max(hidden, last) + 1); if (outro < 0) outro = Math.max(Math.max(hidden, last) + 2, comment - 3);
  let item = find(/道具/, outro); if (item < 0 || item >= comment) item = comment - 1;
  const M = { book, levels, hidden, outro, item, comment, follow: n - 1 };
  const miss = Object.entries({ book, levels: levels.length || -1 }).filter(([, v]) => v < 0).map(([k]) => k);
  if (miss.length) throw new Error('pkMarks 找不到锚句：' + miss.join(',') + '（文稿要有「《书名》」那句和「第一关：…」开头的句子）');
  return M;
}

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hex(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
function lerpCol(a, b, k) { const A_ = hex(a), B_ = hex(b); return '#' + A_.map((v, i) => Math.round(lerp(v, B_[i], k)).toString(16).padStart(2, '0')).join(''); }
const smooth = k => k * k * (3 - 2 * k);
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 世界层：画到 octx（离屏），之后 postG 合到 ctx
function beginWorld(cam, fill = '#000') {
  octx.save(); octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = fill; octx.fillRect(0, 0, W, H);
  octx.imageSmoothingEnabled = false; const T = worldT(octx, cam); T(0); return T;
}
function endWorld() { octx.restore(); }
function sprRot(g, im, x, y, ax, ay, rot, alpha = 1) {
  if (alpha <= 0 || !im) return;
  g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); g.rotate(rot); g.drawImage(im, -ax, -ay); g.restore();
}
function bgCross(g, a, b, k) { g.drawImage(SP(a), 0, 0); if (k > 0) { g.globalAlpha = k; g.drawImage(SP(b), 0, 0); g.globalAlpha = 1; } }

// 头像：从精灵表某帧裁出头部（给 HUD / 组队邀请）
const _faces = {};
function faceOf(sheet, f = 0, size = 16) {
  const key = sheet + f + size; if (_faces[key]) return _faces[key];
  const m = META[sheet][f], im = IMG[`${sheet}_${f}`], c = cnv(size, size);
  c.getContext('2d').drawImage(im, Math.round(m.headX - size / 2), Math.round(m.headTop || 0), size, size, 0, 0, size, size);
  return (_faces[key] = c);
}
// 程序化小图标（装备卡用）
function iconCanvas(rows, pal) {
  const c = cnv(rows[0].length, rows.length), g = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(i, j, 1, 1); } }));
  return c;
}

// 背上的卷轴堆（任务越多越高、会晃）
function scrollPile(g, x, y, n, t, sway = 1) {
  const im = SP('ck_scroll'); if (!im) return;
  for (let i = 0; i < Math.floor(n); i++) {
    const dx = Math.round((rnd(i * 3 + 1) - 0.5) * 6 + Math.sin(t * 3 + i * 0.6) * sway * (i / 4));
    g.drawImage(im, Math.round(x - im.width / 2 + dx), Math.round(y - 7 - i * 4));
  }
}

// 背着东西的主角（硬规则：背的东西多 → 驼背 + 木背架 + 卷轴堆；少 → 直立 + 身后小背包竖插卷轴；别正面站着把东西堆在头后面）
// ck_hero 第 2/3 帧（驼背）原图朝左，往右走要 flip —— 这里已经处理好；x 是脚底中心，bottom 是脚底线，n 是背的数量
const carryAnchor = (x, bottom, n) => n >= 4 ? [x - 12, bottom - 24] : [x - 12, bottom - 21];
function carryHero(g, x, bottom, n, t, moving, speed = 3) {
  const step = moving ? (Math.floor(t * speed) & 1) : 0;
  if (n >= 4) {
    actor(g, 'ck_hero', 2 + step, x, bottom, true);
    const [bx, by0] = carryAnchor(x, bottom, n), by = by0 + step, ph = Math.floor(n) * 4 + 5;
    g.fillStyle = '#4a2c12'; g.fillRect(bx - 12, by - ph, 2, ph + 4); g.fillRect(bx + 9, by - ph, 2, ph + 4);
    g.fillStyle = '#7a4e24'; for (let y = by + 1; y > by - ph; y -= 7) g.fillRect(bx - 12, y, 23, 1);
    scrollPile(g, bx, by, n, t, moving ? 0.8 : 0.25);
    g.fillStyle = '#3a2410'; g.fillRect(bx + 9, by + 2, 6, 1); g.fillRect(bx + 13, by + 3, 2, 3);
  } else {
    const [bx, by] = carryAnchor(x, bottom, n);
    if (n > 0) {
      for (let i = 0; i < n; i++) sprRot(g, SP('ck_scroll'), bx - 3 + i * 2, by - 6 - (i & 1) * 2, 11, 3, Math.PI / 2 - 0.35 + i * 0.18);
      g.fillStyle = UC.ink; g.fillRect(bx - 4, by - 4, 9, 12); g.fillStyle = '#8a5a2b'; g.fillRect(bx - 3, by - 3, 7, 10); g.fillStyle = '#6a4220'; g.fillRect(bx - 3, by + 1, 7, 2);
    }
    actor(g, 'ck_hero', moving ? (Math.floor(t * 6) & 1) : 0, x, bottom);
  }
}
// 常用小工具：整屏压暗 / 镜头不出画 / 屏幕坐标里按整数倍画精灵
const darken = a => { if (a > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
const fitCam = c => { const hw = BW / 2 / c.z, hh = BH / 2 / c.z; return { ...c, cx: clamp(c.cx, hw, BW - hw), cy: clamp(c.cy, hh, BH - hh) }; };
function spr(g, im, x, y, s, ax = 0.5, ay = 1, a = 1, flip = false) {
  if (!im || a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = a * FA(g);
  g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1);
  g.drawImage(im, -im.width * s * ax, -im.height * s * ay, im.width * s, im.height * s); g.restore();
}

// ---------- 像素云（精灵 pk_clouds + 滤镜调色）----------
const PUFFS = Array.from({ length: 22 }, (_, i) => ({ d: 0.7 + rnd(i * 3 + 1) * 1.1, x: rnd(i * 11 + 2), y: rnd(i * 7 + 3), n: Math.floor(rnd(i * 13 + 5) * 4), f: rnd(i * 17) < 0.5 })).sort((a, b) => a.d - b.d);
const CLOUD = { warm: [1, 1, 0], dark: [0.38, 0.5, 0], storm: [0.42, 0.22, -15], night: [0.34, 0.65, 15] };
const cloudF = (a, b, k) => { const v = a.map((x, i) => lerp(x, b[i], k)); return `brightness(${v[0].toFixed(3)}) saturate(${v[1].toFixed(3)}) hue-rotate(${v[2].toFixed(1)}deg)`; };
function driftClouds(g, t, yMax = 70, speed = 4, filter = 'none', alpha = 0.9) {
  g.save(); g.filter = filter; g.globalAlpha = alpha; g.imageSmoothingEnabled = false;
  for (let i = 0; i < 6; i++) {
    const im = IMG['pk_clouds_' + (i % 4)]; if (!im) continue;
    const x = ((rnd(i * 5) * (BW + 120) + t * speed * (0.6 + rnd(i) * 0.8)) % (BW + 120)) - 100, y = Math.round(rnd(i * 9) * yMax) - 10;
    g.drawImage(im, Math.round(x), y);
  }
  g.restore();
}

// ---------- 大厅展板 + 关卡卡（模板场景）----------
const BOARD = { x0: 63, y0: 21, x1: 257, y1: 157 };
function drawBoardFrame(g) {
  const { x0, y0, x1, y1 } = BOARD;
  g.fillStyle = '#080605'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = '#c8962e'; g.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
  g.fillStyle = '#6e4a12'; g.fillRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6);
  g.fillStyle = '#0e1426'; g.fillRect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8);
  g.fillStyle = '#ffe9a0'; for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 3, y0 + 1], [x0 + 1, y1 - 3], [x1 - 3, y1 - 3]]) g.fillRect(x, y, 2, 2);
  g.fillStyle = '#141c33'; for (let y = y0 + 12; y < y1 - 8; y += 10) g.fillRect(x0 + 6, y, x1 - x0 - 12, 1);
}
function studyGlow(cam, t) {
  for (const [x, y, i] of [[41, 59, 0], [279, 59, 1]]) { const [sx, sy] = w2s(cam, x, y); glowDot(ctx, sx, sy, 160 * cam.z, 0.5 + 0.06 * Math.sin(t * 13 + i * 2)); }
}
function studyPost(L) { postG(ctx, L, off, { bloom: 0.3, sat: 0.98, tint: 'rgba(255,170,90,0.16)', dust: 'rgba(255,214,140,0.9)', vig: 'rgba(5,4,10,0.6)' }); }
// ch：第几关（0 起）；li：「第N关」那句的序号
function sceneLevel(t, ch, li) {
  const L = t - (A(li) - 0.4), cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 5, cx: 160, cy: 90, z: 1.07 }], L);
  const n = EPISODE.chapters.length - 1, litT = K(li) + 0.35;
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); drawBoardFrame(octx);
  const mx = i => Math.round(BOARD.x0 + (i + 1) * (BOARD.x1 - BOARD.x0) / (n + 1));
  for (let i = 0; i < n; i++) medal(octx, mx(i), 40, 9, i < ch || (i === ch && t >= litT) ? 1 : 0);
  endWorld();
  studyPost(L); studyGlow(cam, t);
  levelDialog(ctx, W / 2, H / 2 + 40, t - A(li), `第${CN[ch]}关`, EPISODE.chapters[ch]);
  const [px, py] = w2s(cam, mx(ch), 40);
  ping(ctx, px, py, seg(t, litT, litT + 0.7), 30, 160); glowDot(ctx, px, py, 150, 0.6 * seg(t, litT, litT + 0.15));
}

// ---------- 全局：场景表调度 + 转场黑场 + 章节栏 + 字幕 ----------
// SCENES = [[起点, 终点, fn, {dip:true}]...]；CHAPTER_AT = [[时刻, 第几章]...]；BAR_FROM = 章节栏出现时刻
function pkSeek(t, opts = {}) {
  curT = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.__fade = 1;
  const i = sceneIndex(t); SCENES[i][2](t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.__fade = 1;
  let blk = Math.max(1 - seg(t, 0, 0.6), seg(t, DUR - 1.2, DUR - 0.2));
  for (let j = 1; j < SCENES.length; j++) if (SCENES[j][3] !== 'cut') blk = Math.max(blk, 1 - Math.abs(t - SCENES[j][0]) / 0.2);
  if (blk > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(blk)})`; ctx.fillRect(0, 0, W, H); }
  if (opts.barFrom != null && t >= opts.barFrom) {
    let ch = -1, chT = 0; for (const [tt, c] of opts.chapterAt) if (t >= tt) { ch = c; chT = tt; }
    chapterBar(ctx, seg(t, opts.barFrom, opts.barFrom + 0.4) * (1 - seg(t, DUR - 1.2, DUR - 0.2)), ch, ch < 0 ? 0 : seg(t, chT, chT + 0.25));
  }
  subtitle(ctx, t);
}
