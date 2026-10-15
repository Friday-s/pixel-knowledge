// pixel-knowledge 游戏 UI 库（屏幕坐标 1920×1080；世界里的小图标用 emote）
// 字幕 / 扩散光环 / 四角对焦框 / 面板 / 装备卡 / HUD / 章节栏 / 关卡框 / 勋章 / 数值标签 / 进度条 / 计数牌
// 任务栏 / 选择框+光标 / 状态图标 / 名言卡 / 因果卡 / 存档菜单 / 成就提示 / 夜晚计数 / 组队邀请 / 评论框 / 世界表情
// 所有文字走方舟像素字体：1x 渲染 → 去半透明 → 最近邻放大。整组淡出用 faded(ctx, a, fn)。
'use strict';

const UC = {
  gold: '#f2c14e', goldD: '#9a6a16', goldL: '#fff1a8', navy: '#121a30', navyL: '#1f2c4c', ink: '#07080d',
  red: '#b8282d', redD: '#6e1418', white: '#f6f1e4', grey: '#8d8f96', kw: '#ffbf3a', paper: '#efe3c4', paperD: '#c9b58a',
  green: '#5fbf6a', blue: '#6fa8ff',
};
const easeBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const easeOut = k => 1 - Math.pow(1 - k, 3);
const FA = g => g.__fade ?? 1;

// ---------- 像素字 ----------
const _olCache = new Map();
function richText(text, col = UC.white, kwCol = UC.kw, outline = UC.ink) {
  const key = text + col + kwCol + outline;
  if (_olCache.has(key)) return _olCache.get(key);
  const segs = []; let kw = false, buf = '';
  for (const ch of text) {
    if (ch === '[' || ch === ']') { if (buf) segs.push([buf, kw]); buf = ''; kw = ch === '['; continue; }
    buf += ch;
  }
  if (buf) segs.push([buf, kw]);
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = '12px Ark, ArkTW';
  const ws = segs.map(([s]) => g.measureText(s).width);
  c.width = Math.max(1, Math.ceil(ws.reduce((a, b) => a + b, 0)) + 4); c.height = 17;
  g.font = '12px Ark, ArkTW'; g.textBaseline = 'top';
  const pass = (fill) => {
    let x = 2;
    segs.forEach(([s, k], i) => {
      if (fill) { g.fillStyle = k ? kwCol : col; g.fillText(s, x, 2); }
      else if (outline) { g.fillStyle = outline; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillText(s, x + dx, 2 + dy); }
      x += ws[i];
    });
  };
  pass(false); pass(true);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
  _olCache.set(key, c);
  return c;
}
function blitPx(g, im, x, y, s, ax = 0.5, ay = 0, alpha = 1) {
  if (alpha <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = Math.min(1, alpha) * FA(g);
  g.drawImage(im, Math.round(x - im.width * s * ax), Math.round(y - im.height * s * ay), im.width * s, im.height * s);
  g.restore();
}
function label(g, str, x, y, s, col = UC.white, ax = 0.5, ay = 0, alpha = 1, outline = UC.ink) {
  blitPx(g, richText(str, col, UC.kw, outline), x, y, s, ax, ay, alpha);
}
const textW = (str, s) => (richText(str, UC.white, UC.kw, null).width) * s;
function faded(g, a, fn) { if (a <= 0) return; const prev = FA(g); g.__fade = prev * Math.min(1, a); try { fn(); } finally { g.__fade = prev; } }

// ---------- 字幕（底部居中，关键词高亮）----------
function subtitle(g, t) {
  for (let i = 0; i < NARR.length; i++) {
    const l = NARR[i], nx = NARR[i + 1];
    const end = Math.min(nx ? nx.t - 0.08 : 1e9, l.end + 0.7);
    if (t < l.t - 0.05 || t > end) continue;
    const k = seg(t, l.t - 0.05, l.t + 0.1), out = 1 - seg(t, end - 0.1, end);
    blitPx(g, richText(l.text), W / 2, H - 132 + (1 - k) * 8, 4, 0.5, 0, Math.min(k, out));
  }
}
function kwTime(i) {
  const l = NARR[i], plain = l.text.replace(/[\[\]]/g, ''), at = l.text.indexOf('[');
  return l.t + (l.end - l.t) * (at < 0 ? 0 : at / plain.length);
}

// ---------- 扩散光环 / 四角对焦框 ----------
function ping(g, x, y, k, r0 = 40, R = 220, col = '242,193,78') {
  if (k <= 0 || k >= 1) return;
  const e = easeOut(k), r = r0 + R * e, a = (1 - k) * FA(g);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = `rgba(${col},${0.9 * a})`; g.lineWidth = 3;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = `rgba(${col},${0.8 * a})`;
  const n = 36, r2 = r * 1.12 + 8;
  for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + k; g.fillRect(Math.round(x + Math.cos(an) * r2) - 2, Math.round(y + Math.sin(an) * r2) - 2, 4, 4); }
  g.restore();
}
function brackets(g, x, y, w, h, k, col = UC.gold, len = 34, th = 6) {
  if (k <= 0) return;
  const e = easeOut(clamp(k)), sc = lerp(1.6, 1, e) + Math.sin(curT * 6) * 0.015 * e;
  const cx = x + w / 2, cy = y + h / 2, hw = w * sc / 2, hh = h * sc / 2;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 3) * FA(g); g.fillStyle = col;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = Math.round(cx + sx * hw), py = Math.round(cy + sy * hh);
    g.fillRect(sx < 0 ? px : px - len, sy < 0 ? py : py - th, len, th);
    g.fillRect(sx < 0 ? px : px - th, sy < 0 ? py : py - len, th, len);
  }
  g.restore();
}

// ---------- 像素面板 ----------
function panel(g, x, y, w, h, p = 4, fill = UC.navy, gold = UC.gold) {
  x = Math.round(x / p) * p; y = Math.round(y / p) * p; w = Math.round(w / p) * p; h = Math.round(h / p) * p;
  g.fillStyle = UC.ink; g.fillRect(x - p, y - p, w + 2 * p, h + 2 * p);
  g.fillStyle = gold; g.fillRect(x, y, w, h);
  g.fillStyle = UC.goldD; g.fillRect(x + 2 * p, y + 2 * p, w - 4 * p, h - 4 * p);
  g.fillStyle = fill; g.fillRect(x + 3 * p, y + 3 * p, w - 6 * p, h - 6 * p);
  g.fillStyle = UC.goldL; g.fillRect(x + p, y, w - 2 * p, p);
  for (const [cx, cy] of [[x, y], [x + w - 2 * p, y], [x, y + h - 2 * p], [x + w - 2 * p, y + h - 2 * p]]) {
    g.fillStyle = UC.goldL; g.fillRect(cx, cy, 2 * p, 2 * p); g.fillStyle = UC.goldD; g.fillRect(cx + p, cy + p, p, p);
  }
}
// 弹出：调用方已 save + setTransform(identity)；返回 {k, sc}
function popIn(g, cx, cy, L, dur = 0.3) {
  const k = clamp(L / dur), sc = easeBack(k) * (1 - 0.1 * (1 - k));
  g.globalAlpha = clamp(k * 2) * FA(g); g.translate(cx, cy); g.scale(sc, sc);
  return { k, sc };
}
function star(g, x, y, p, col) {
  g.fillStyle = col;
  for (const [i, j] of [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [3, 3], [0, 4], [4, 4]]) g.fillRect(x + i * p, y + j * p, p, p);
}
function glint(g, x, y, w, h, k) {
  if (k <= 0 || k >= 1) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = FA(g); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gx = x - w + (w * 2.4) * k;
  const gr = g.createLinearGradient(gx, y, gx + w * 0.35, y + h);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,240,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.globalCompositeOperation = 'screen'; g.fillRect(x, y, w, h);
  g.restore();
}

// ---------- 装备 / 技能卡：o = {head, kind, ribbon, iconRot, iconScale} ----------
function itemCard(g, cx, cy, L, name, rank, icon, o = {}) {
  if (L < 0) return;
  const w = 272, h = 360, rot = o.iconRot ?? -0.78, sIcon = o.iconScale ?? 2.4;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k, sc } = popIn(g, cx, cy, L, 0.32); g.translate(-w / 2, -h / 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  panel(g, 0, 0, w, h, 4); g.shadowColor = 'transparent';
  g.fillStyle = UC.ink; g.fillRect(-24, -20, w + 48, 64);
  g.fillStyle = o.ribbon || UC.red; g.fillRect(-20, -16, w + 40, 56);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-20, 32, w + 40, 8);
  g.fillStyle = UC.goldD; g.fillRect(36, 64, w - 72, 184);
  g.fillStyle = '#0a0f1f'; g.fillRect(40, 68, w - 80, 176);
  const gr = g.createRadialGradient(w / 2, 156, 4, w / 2, 156, 100);
  gr.addColorStop(0, 'rgba(255,214,120,0.45)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = gr; g.fillRect(40, 68, w - 80, 176);
  if (icon) { g.save(); g.translate(w / 2, 156); g.rotate(rot); g.imageSmoothingEnabled = false; g.drawImage(icon, -icon.width * sIcon / 2, -icon.height * sIcon / 2, icon.width * sIcon, icon.height * sIcon); g.restore(); }
  for (let i = 0; i < 5; i++) {
    const sk = clamp((L - 0.32 - i * 0.08) / 0.12); if (sk <= 0) continue;
    g.save(); g.globalAlpha *= sk; star(g, 52 + i * 36, 266 - (1 - sk) * 10, 5, i < rank ? UC.gold : '#3a3a48'); g.restore();
  }
  g.fillStyle = '#0a0f1f'; g.fillRect(32, 306, w - 64, 36);
  g.restore();
  const a = clamp(k * 2);
  if (o.head) label(g, o.head, cx, cy - (h / 2 + 52) * sc, 2 * sc, UC.goldL, 0.5, 0, a, UC.ink);
  label(g, name, cx, cy - (h / 2 + 4) * sc, 3 * sc, UC.white, 0.5, 0, a);
  label(g, o.kind || '神级装备', cx, cy + (h / 2 - 50) * sc, 2 * sc, UC.goldL, 0.5, 0, a);
  glint(g, cx - w / 2 * sc, cy - h / 2 * sc, w * sc, h * sc, (L - 0.75) / 0.6);
}

// ---------- 玩家 HUD（左上）：o = {name, lv, bar, barCol, line2, face, x, y} ----------
function hud(g, k, o) {
  if (k <= 0) return;
  const x0 = o.x ?? 44, y0 = o.y ?? 40, e = easeOut(clamp(k)), X = x0 + (1 - e) * -420, a = clamp(k * 2);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a * FA(g); g.translate(X, y0);
  panel(g, 0, 0, 112, 112, 4);
  if (o.face) { g.imageSmoothingEnabled = false; g.drawImage(o.face, 0, 0, o.face.width, o.face.height, 16, 16, 80, 80); }
  g.fillStyle = 'rgba(8,10,18,0.78)'; g.fillRect(128, 6, 440, 100);
  if (o.lv) { g.fillStyle = UC.gold; g.fillRect(332, 14, 92, 36); g.fillStyle = UC.ink; g.fillRect(336, 18, 84, 28); }
  g.fillStyle = UC.ink; g.fillRect(140, 60, 412, 16);
  g.fillStyle = o.barBg || '#3b2a0c'; g.fillRect(144, 64, 404, 8);
  const f = Math.round(404 * clamp(o.bar ?? 1));
  g.fillStyle = o.barCol || UC.gold; g.fillRect(144, 64, f, 8);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(144, 64, f, 2);
  if (o.flash) { g.fillStyle = `rgba(255,60,40,${o.flash})`; g.fillRect(140, 60, 412, 16); }
  g.restore();
  label(g, o.name, X + 140, y0 + 12, 3, UC.white, 0, 0, a);
  if (o.lv) label(g, o.lv, X + 378, y0 + 18, 2, UC.goldL, 0.5, 0, a);
  if (o.line2) label(g, o.line2, X + 140, y0 + 80, 2, '#d8d4c8', 0, 0, a);
}

// ---------- 顶部章节栏（EPISODE.chapters）----------
function chapterBar(g, k, active, actK = 1) {
  if (k <= 0) return;
  const CH = EPISODE.chapters, h = 52, y = Math.round(-h * (1 - easeOut(clamp(k)))), tw = W / CH.length;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = 'rgba(28,28,30,0.94)'; g.fillRect(0, y, W, h);
  if (active >= 0) { g.fillStyle = `rgba(6,6,8,${0.95 * actK})`; g.fillRect(active * tw, y, tw, h); }
  g.fillStyle = '#4a4a4e';
  for (let i = 1; i < CH.length; i++) g.fillRect(Math.round(i * tw), y + 14, 2, h - 28);
  g.restore();
  CH.forEach((c, i) => label(g, c, i * tw + tw / 2, y + 12, 2, i === active && actK > 0.5 ? '#ffffff' : UC.grey, 0.5, 0, 1, null));
}

// ---------- 关卡对话框 ----------
function levelDialog(g, cx, cy, L, head, title, fade = 1) {
  if (L < 0 || fade <= 0) return;
  const k = clamp(L / 0.25), sc = easeBack(k), tw = Math.max(560, textW(title, 4) + 90);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * fade;
  g.translate(cx, cy); g.scale(sc, 1);
  g.fillStyle = UC.ink; g.fillRect(-196, -84, 392, 56); g.fillStyle = '#efe9da'; g.fillRect(-192, -80, 384, 48);
  g.fillStyle = UC.ink; g.fillRect(-tw / 2 - 8, -24, tw + 16, 112); g.fillStyle = '#e9e2cf'; g.fillRect(-tw / 2 - 4, -20, tw + 8, 104);
  g.fillStyle = UC.navyL; g.fillRect(-tw / 2 + 4, -12, tw - 8, 88); g.fillStyle = '#c0392b'; g.fillRect(-tw / 2 + 4, -12, 8, 88);
  g.restore();
  if (k >= 1) {
    label(g, head, cx, cy - 74, 3, '#1b2238', 0.5, 0, fade, null);
    const n = Math.floor(clamp((L - 0.2) / 0.6) * title.length);
    if (n > 0) label(g, title.slice(0, n), cx - tw / 2 + 36, cy + 2, 4, '#ffffff', 0, 0, fade, null);
  }
}
function pxDisc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
function medal(g, cx, cy, r, lit) {
  const on = lit > 0.5;
  pxDisc(g, cx, cy, r + 1, '#0a0806');
  pxDisc(g, cx, cy, r, on ? '#f2c14e' : '#5b4524');
  pxDisc(g, cx, cy, r - 2, on ? '#b07a1c' : '#2e2414');
  pxDisc(g, cx, cy, r - 3, on ? '#2a1d08' : '#16120c');
  g.fillStyle = on ? '#ffe9a0' : '#5b4a2e';
  for (let i = -r + 4; i <= r - 4; i++) g.fillRect(cx + i, cy - i, 1, 1);
  g.fillRect(cx - 3, cy + 1, 3, 1); g.fillRect(cx - 1, cy + 1, 1, 3);
  g.fillStyle = on ? '#f2c14e' : '#4a3a20'; g.fillRect(cx - 3, cy + r + 3, 7, 3);
}

// ---------- 数值标签 / 进度条 / 计数牌 ----------
function valueTag(g, text, x, y, L, s = 3, col = UC.gold) {
  if (L < 0) return;
  const k = clamp(L / 0.22), im = richText(text, '#ffffff', UC.kw, null);
  const w = im.width * s + 40, h = im.height * s + 20, sc = easeBack(k);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(x, y); g.scale(sc, sc);
  g.fillStyle = UC.ink; g.fillRect(-w / 2 - 4, -h - 4, w + 8, h + 8);
  g.fillStyle = col; g.fillRect(-w / 2, -h, w, h);
  g.fillStyle = UC.navy; g.fillRect(-w / 2 + 4, -h + 4, w - 8, h - 8);
  g.fillStyle = col; g.fillRect(-8, 4, 16, 4); g.fillRect(-4, 8, 8, 4);
  g.restore();
  if (k > 0.6) blitPx(g, im, x, y - h * sc + 10 * sc, s * sc, 0.5, 0, 1);
}
function progressBar(g, cx, cy, w, frac, text, L) {
  if (L < 0) return;
  const k = clamp(L / 0.25);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(cx, cy); g.scale(lerp(0.85, 1, easeOut(k)), 1);
  g.fillStyle = UC.ink; g.fillRect(-w / 2 - 6, -42, w + 12, 84);
  g.fillStyle = UC.gold; g.fillRect(-w / 2 - 2, -38, w + 4, 76);
  g.fillStyle = '#0e1426'; g.fillRect(-w / 2 + 2, -34, w - 4, 68);
  const bx = -w / 2 + 150, bw = w - 180;
  g.fillStyle = '#1b2440'; g.fillRect(bx, -14, bw, 28);
  const f = Math.max(6, Math.round(bw * frac * easeOut(clamp((L - 0.3) / 0.5))));
  g.fillStyle = UC.gold; g.fillRect(bx, -14, f, 28); g.fillStyle = UC.goldL; g.fillRect(bx, -14, f, 6);
  g.restore();
  label(g, text, cx - w / 2 + 30, cy - 22, 3, '#ffffff', 0, 0, clamp(k * 2), null);
}
function counterTag(g, text, x, y, a) {
  if (a <= 0) return;
  const im = richText(text, UC.goldL, UC.kw, null), s = 3, w = im.width * s + 40, h = im.height * s + 16;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a * FA(g);
  g.fillStyle = UC.ink; g.fillRect(x - w / 2 - 3, y - 3, w + 6, h + 6);
  g.fillStyle = UC.goldD; g.fillRect(x - w / 2, y, w, h);
  g.fillStyle = '#10131c'; g.fillRect(x - w / 2 + 3, y + 3, w - 6, h - 6);
  g.restore();
  blitPx(g, im, x, y + 8, s, 0.5, 0, a);
}

// ---------- 任务栏：rows = [{text, owner:'me'|'other', col:0..1(两栏时从左移到右), a, done, tag, tagK, lock}] ----------
function scrollIcon(g, x, y, p, col = UC.paper) {
  g.fillStyle = UC.ink; g.fillRect(x - p, y, 10 * p, 6 * p);
  g.fillStyle = col; g.fillRect(x, y + p, 8 * p, 4 * p);
  g.fillStyle = '#7a4a1e'; g.fillRect(x - p, y, 2 * p, 6 * p); g.fillRect(x + 7 * p, y, 2 * p, 6 * p);
  g.fillStyle = UC.red; g.fillRect(x + 3 * p, y + p, 2 * p, 4 * p);
}
function questLog(g, x, y, w, rows, o = {}) {
  const L = o.L ?? 1; if (L < 0) return;
  const two = !!o.twoCols, rowH = o.rowH ?? 60, top = two ? 136 : 100, h = top + rows.length * rowH + 20;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, x + w / 2, y + h / 2, L, 0.28); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.95)');
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(16, 76, w - 32, 4);
  if (two) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(w / 2 - 2, 90, 4, h - 110); }
  g.restore();
  if (k < 1) return;
  const a = FA(g);
  label(g, o.title || '任务栏', x + 32, y + 22, 3, UC.goldL, 0, 0, a, null);
  if (o.count != null) label(g, String(o.count), x + w - 36, y + 26, 3, o.countCol || UC.kw, 1, 0, a, null);
  if (two) { label(g, o.left || '我的任务', x + w / 4, y + 92, 2, UC.goldL, 0.5, 0, a, null); label(g, o.right || '别人的任务', x + w * 3 / 4, y + 92, 2, '#9aa3b8', 0.5, 0, a, null); }
  rows.forEach((r, i) => {
    const ra = clamp(r.a ?? 1) * a; if (ra <= 0) return;
    const colX = two ? lerp(x + 28, x + w / 2 + 20, easeOut(clamp(r.col ?? 0))) : x + 28;
    const ry = y + top + i * rowH;
    const other = r.owner === 'other', dim = other ? 0.6 : 1;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ra * dim; scrollIcon(g, colX, ry + 6, 4, other ? '#b9b2a2' : UC.paper); g.restore();
    label(g, r.text, colX + 56, ry, 3, other ? '#c6c3bb' : '#ffffff', 0, 0, ra * dim, null);
    const endX = colX + 56 + textW(r.text, 3);
    if (r.done) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ra * clamp(r.done); g.fillStyle = UC.green; g.fillRect(endX + 16, ry + 10, 28, 28); g.fillStyle = UC.ink; g.fillRect(endX + 22, ry + 22, 6, 6); g.fillRect(endX + 28, ry + 26, 6, 6); g.fillRect(endX + 34, ry + 16, 6, 12); g.restore(); }
    if (r.tag) {
      const tw = textW(r.tag, 2) + 24, tx = two ? endX + 16 : x + w - 40 - tw, tk = clamp(r.tagK ?? 1);
      if (tk > 0) {
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ra * clamp(tk * 3);
        g.translate(tx + tw / 2, ry + 22); const z = lerp(2.2, 1, easeOut(tk)); g.scale(z, z); g.rotate(-0.08);
        g.fillStyle = r.owner === 'me' ? UC.gold : '#8a8f9e'; g.fillRect(-tw / 2, -18, tw, 36); g.fillStyle = UC.ink; g.fillRect(-tw / 2 + 3, -15, tw - 6, 30);
        g.restore();
        if (tk > 0.7) label(g, r.tag, tx + tw / 2, ry + 10, 2, r.owner === 'me' ? UC.gold : '#c6c9d4', 0.5, 0, ra, null);
      }
    }
    if (r.lock) {
      const lx = colX - 18, lk = clamp(r.lock);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ra * lk; g.translate(lx, ry + 22); g.scale(lerp(2, 1, easeOut(lk)), lerp(2, 1, easeOut(lk)));
      g.fillStyle = UC.gold; g.fillRect(-10, -4, 20, 16); g.strokeStyle = UC.gold; g.lineWidth = 4; g.beginPath(); g.arc(0, -4, 7, Math.PI, 0); g.stroke(); g.restore();
    }
  });
}

// ---------- 选择框 + 光标 ----------
function cursorPx(g, x, y, press = 0) {
  const p = 4, pts = ['1', '11', '121', '1221', '12221', '122221', '1222221', '12222221', '122221111', '1211221', '11 1221', '1   122', '     11'];
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = FA(g);
  const s = 1 - 0.15 * press; g.translate(x, y); g.scale(s, s);
  pts.forEach((row, j) => [...row].forEach((c, i) => { if (c === ' ') return; g.fillStyle = c === '1' ? UC.ink : '#ffffff'; g.fillRect(i * p, j * p, p, p); }));
  g.restore();
}
function choiceDialog(g, cx, cy, q, opts, sel, L, o = {}) {
  if (L < 0) return null;
  const w = o.w ?? 680, h = 300, n = opts.length, gap = 40, bw = (w - 80 - gap * (n - 1)) / n, boxes = [];
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.25); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.96)');
  opts.forEach((op, i) => {
    const bx = 40 + i * (bw + gap), by = 170, on = sel === i;
    g.fillStyle = on ? UC.gold : '#3a4260'; g.fillRect(bx, by, bw, 84);
    g.fillStyle = on ? '#4a3510' : '#151b30'; g.fillRect(bx + 4, by + 4, bw - 8, 76);
    boxes.push([cx - w / 2 + bx + bw / 2, cy - h / 2 + by + 42]);
  });
  g.restore();
  if (k >= 1) {
    label(g, q, cx, cy - h / 2 + 52, 4, '#ffffff', 0.5, 0, FA(g), null);
    opts.forEach((op, i) => label(g, op, boxes[i][0], boxes[i][1] - 24, 4, sel === i ? UC.goldL : '#c9cfdf', 0.5, 0, FA(g), null));
  }
  return boxes;
}

// ---------- 状态图标（buff / debuff）：o = {bad, sub, subK} ----------
function statusTag(g, x, y, name, L, o = {}) {
  if (L < 0) return;
  const bad = o.bad ?? true, col = bad ? '#d8443a' : UC.green, k = clamp(L / 0.25), tw = textW(name, 3) + 90;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(x, y); const z = easeBack(k); g.scale(z, z);
  g.fillStyle = UC.ink; g.fillRect(-tw / 2 - 4, -32, tw + 8, 64);
  g.fillStyle = col; g.fillRect(-tw / 2, -28, tw, 56);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-tw / 2 + 4, -24, tw - 8, 48);
  g.fillStyle = col; g.fillRect(-tw / 2 + 14, -14, 28, 28);
  g.fillStyle = '#ffffff';
  if (bad) { g.fillRect(-tw / 2 + 25, -10, 6, 12); g.fillRect(-tw / 2 + 25, 6, 6, 6); }
  else { g.fillRect(-tw / 2 + 25, -10, 6, 20); g.fillRect(-tw / 2 + 18, -4, 20, 6); }
  g.restore();
  if (k > 0.6) label(g, name, x - tw / 2 + 56, y - 20, 3, '#ffffff', 0, 0, 1, null);
  if (o.sub) label(g, o.sub, x, y + 40, 2, bad ? '#ffb4a8' : '#b9f0bf', 0.5, 0, clamp(o.subK ?? 1));
}

// ---------- 名言卡（羊皮纸，逐字打出）----------
function quoteCard(g, cx, cy, lines, src, L, o = {}) {
  if (L < 0) return;
  const s = o.s ?? 4, lw = Math.max(...lines.map(l => textW(l, s))), w = Math.max(lw + 140, 640), h = 90 + lines.length * 17 * s + (src ? 64 : 10);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.3); g.translate(-w / 2, -h / 2);
  g.fillStyle = UC.ink; g.fillRect(-6, -6, w + 12, h + 12);
  g.fillStyle = UC.paper; g.fillRect(0, 0, w, h);
  g.fillStyle = UC.paperD; for (let i = 0; i < 9; i++) g.fillRect(Math.floor(rnd(i * 7) * (w - 80)) + 20, Math.floor(rnd(i * 3) * (h - 20)) + 10, 24 + Math.floor(rnd(i) * 40), 4);
  g.fillStyle = '#7a4a1e'; g.fillRect(-16, -12, w + 32, 18); g.fillRect(-16, h - 6, w + 32, 18);
  g.fillStyle = '#4a2a10'; g.fillRect(-16, -12, 10, 18); g.fillRect(w + 6, -12, 10, 18); g.fillRect(-16, h - 6, 10, 18); g.fillRect(w + 6, h - 6, 10, 18);
  g.restore();
  if (k < 1) return;
  const all = lines.join(''), n = Math.ceil(clamp((L - 0.2) / Math.max(0.5, all.length * 0.05)) * all.length);
  let used = 0;
  lines.forEach((l, i) => { const take = Math.max(0, Math.min(l.length, n - used)); used += l.length; if (take > 0) label(g, l.slice(0, take), cx - lw / 2, cy - h / 2 + 44 + i * 17 * s, s, '#3a2410', 0, 0, 1, null); });
  if (src) label(g, src, cx + lw / 2, cy + h / 2 - 58, 2, '#7a5a30', 1, 0, clamp((L - 0.4 - all.length * 0.05) / 0.3), null);
}

// ---------- 因果卡：A → B；o.flip 0..1 两个格子交换位置；o.cross 打叉 ----------
function flowCard(g, cx, cy, A, B, L, o = {}) {
  if (L < 0) return;
  const w = 960, h = 240, sw = easeOut(clamp(o.flip ?? 0)), ay = 136;
  const posA = lerp(190, 770, sw), posB = lerp(770, 190, sw);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.28); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.95)');
  for (const [px, col] of [[posA, o.colA || '#d8443a'], [posB, o.colB || '#6fa8ff']]) {
    g.fillStyle = UC.ink; g.fillRect(px - 140, ay - 50, 280, 100); g.fillStyle = col; g.fillRect(px - 136, ay - 46, 272, 92); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(px - 130, ay - 40, 260, 80);
  }
  g.fillStyle = UC.gold; g.fillRect(350, ay - 6, 230, 12);
  g.beginPath(); g.moveTo(612, ay); g.lineTo(576, ay - 30); g.lineTo(576, ay + 30); g.fill();
  g.restore();
  if (k < 1) return;
  if (o.title) label(g, o.title, cx, cy - h / 2 + 22, 3, UC.goldL, 0.5, 0, 1, null);
  label(g, A, cx - w / 2 + posA, cy - h / 2 + ay - 26, 4, '#ffffff', 0.5, 0, 1, null);
  label(g, B, cx - w / 2 + posB, cy - h / 2 + ay - 26, 4, '#ffffff', 0.5, 0, 1, null);
}

// ---------- 存档菜单：返回每个槽位的屏幕坐标（给光标用）----------
function saveMenu(g, cx, cy, slots, sel, L) {
  if (L < 0) return null;
  const w = 780, rowH = 92, h = 120 + slots.length * rowH;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.25); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.96)');
  slots.forEach((s, i) => { const y = 96 + i * rowH, on = sel === i; g.fillStyle = on ? UC.gold : '#2c3452'; g.fillRect(28, y, w - 56, rowH - 16); g.fillStyle = on ? '#3a2a0c' : '#141a2e'; g.fillRect(32, y + 4, w - 64, rowH - 24); });
  g.restore();
  if (k < 1) return null;
  label(g, '读取存档', cx, cy - h / 2 + 30, 3, UC.goldL, 0.5, 0, 1, null);
  slots.forEach((s, i) => label(g, s, cx - w / 2 + 64, cy - h / 2 + 112 + i * rowH, 3, sel === i ? UC.goldL : '#aab2c8', 0, 0, 1, null));
  return slots.map((_, i) => [cx + w / 2 - 140, cy - h / 2 + 126 + i * rowH]);
}

// ---------- 成就提示（顶部横条）----------
function toast(g, head, text, L, out = 0) {
  if (L < 0 || out >= 1) return;
  const k = clamp(L / 0.3), w = Math.max(520, textW(text, 3) + 180), x = W / 2 - w / 2, y = lerp(-140, 76, easeOut(k)) - 220 * easeOut(clamp(out));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = FA(g);
  g.fillStyle = UC.ink; g.fillRect(x - 4, y - 4, w + 8, 108); g.fillStyle = UC.gold; g.fillRect(x, y, w, 100); g.fillStyle = '#141a2e'; g.fillRect(x + 4, y + 4, w - 8, 92);
  g.fillStyle = UC.gold; g.fillRect(x + 28, y + 22, 44, 32); g.fillRect(x + 42, y + 54, 16, 12); g.fillRect(x + 34, y + 66, 32, 8); g.fillStyle = UC.goldL; g.fillRect(x + 32, y + 26, 8, 8);
  g.restore();
  label(g, head, x + 100, y + 14, 2, UC.goldL, 0, 0, 1, null);
  label(g, text, x + 100, y + 44, 3, '#ffffff', 0, 0, 1, null);
  glint(g, x, y, w, 100, (L - 0.4) / 0.6);
}

// ---------- 夜晚计数（月亮）----------
function lerpC(a, b, k) { const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); }
function moons(g, cx, cy, n, lit, L) {
  if (L < 0) return;
  const a = clamp(L / 0.3);
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * 170, kk = clamp((lit - i) * 2);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a * FA(g);
    g.fillStyle = UC.ink; g.beginPath(); g.arc(x, cy, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = lerpC('#3a3f55', '#ffe9a0', kk); g.beginPath(); g.arc(x, cy, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d1020'; g.beginPath(); g.arc(x + 22, cy - 14, 40, 0, Math.PI * 2); g.fill();
    g.restore();
    label(g, `第${'一二三四五六七'[i]}夜`, x, cy + 68, 2, kk > 0.5 ? UC.goldL : '#7b8196', 0.5, 0, a);
    if (kk > 0) glowDot(g, x, cy, 130, 0.3 * kk * FA(g));
  }
}

// ---------- 组队邀请 / 评论框 ----------
function inviteDialog(g, cx, cy, name, L, press = 0, face = null) {
  if (L < 0) return null;
  const w = 620, h = 220;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.25); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.96)');
  g.fillStyle = UC.ink; g.fillRect(28, 44, 124, 124); g.fillStyle = '#2c3452'; g.fillRect(32, 48, 116, 116);
  if (face) { g.imageSmoothingEnabled = false; g.drawImage(face, 0, 0, face.width, face.height, 38, 54, 104, 104); }
  g.fillStyle = press > 0.5 ? '#3f9a4a' : UC.green; g.fillRect(190, 130, 280, 56); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(190, 178, 280, 8);
  g.restore();
  if (k < 1) return null;
  label(g, name, cx - w / 2 + 190, cy - h / 2 + 38, 3, '#ffffff', 0, 0, 1, null);
  label(g, '邀请你组队', cx - w / 2 + 190, cy - h / 2 + 82, 2, UC.goldL, 0, 0, 1, null);
  label(g, press > 0.5 ? '已组队' : '接受组队', cx - w / 2 + 330, cy - h / 2 + 142, 2, '#ffffff', 0.5, 0, 1, null);
  return [cx - w / 2 + 330, cy - h / 2 + 158];
}
function commentBox(g, cx, cy, hint, typed, L) {
  if (L < 0) return;
  const w = 900, h = 96;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.22); g.translate(-w / 2, -h / 2);
  g.fillStyle = UC.ink; g.fillRect(-4, -4, w + 8, h + 8); g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e04a3a'; g.fillRect(w - 110, 18, 86, 60); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w - 80, 32); g.lineTo(w - 50, 48); g.lineTo(w - 80, 64); g.fill();
  g.restore();
  if (k < 1) return;
  const caret = Math.floor(curT * 2.5) % 2 ? '|' : '';
  label(g, typed ? typed + caret : hint, cx - w / 2 + 28, cy - 24, 3, typed ? '#202430' : '#9a9aa0', 0, 0, 1, null);
}

// ---------- 聊天气泡（手机消息样式）：side 'l' 左侧白泡 / 'r' 右侧绿泡 ----------
function chatBubble(g, x, y, text, L, side = 'l', o = {}) {
  if (L < 0) return;
  const s = o.s ?? 3, tw = textW(text, s), w = tw + 56, h = 17 * s + 36, k = clamp(L / 0.22), z = easeBack(k);
  const bx = side === 'l' ? x : x - w;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(side === 'l' ? bx : bx + w, y); g.scale(z, z); g.translate(side === 'l' ? 0 : -w, 0);
  g.fillStyle = UC.ink; g.fillRect(-4, -4, w + 8, h + 8);
  g.fillStyle = side === 'l' ? '#f4f1e8' : '#8fd36a'; g.fillRect(0, 0, w, h);
  if (side === 'l') { g.fillStyle = UC.ink; g.fillRect(-16, 18, 12, 16); g.fillStyle = '#f4f1e8'; g.fillRect(-12, 22, 12, 8); }
  else { g.fillStyle = UC.ink; g.fillRect(w + 4, 18, 12, 16); g.fillStyle = '#8fd36a'; g.fillRect(w, 22, 12, 8); }
  g.restore();
  if (k > 0.6) label(g, text, bx + 28, y + 16, s, '#1e2430', 0, 0, 1, null);
}

// ---------- 论证桥：左崖「理由」→ 右崖「结论」，o.crack 0..1 裂开，o.walk 0..1 小人走上桥 ----------
function bridgeCard(g, cx, cy, left, right, L, o = {}) {
  if (L < 0) return;
  const w = 1240, h = 420, k = clamp(L / 0.3), crack = clamp(o.crack ?? 0), p = 6;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(cx - w / 2, cy - h / 2 + (1 - easeOut(k)) * 40);
  g.fillStyle = 'rgba(8,10,20,0.88)'; g.fillRect(0, 0, w, h);
  const cliff = (x0, x1) => { g.fillStyle = '#4a4036'; g.fillRect(x0, 200, x1 - x0, 220); g.fillStyle = '#6b5c4a'; g.fillRect(x0, 200, x1 - x0, 18); g.fillStyle = '#5fbf6a'; g.fillRect(x0, 194, x1 - x0, 8);
    g.fillStyle = '#3a3128'; for (let y = 230; y < 410; y += 30) for (let x = x0 + ((y / 30) % 2) * 20; x < x1 - 10; x += 44) g.fillRect(x, y, 26, 6); };
  cliff(0, 300); cliff(w - 300, w);
  const n = 16, pw = (w - 600) / n;
  for (let i = 0; i < n; i++) {
    const bad = crack > 0 && [4, 5, 9, 12].includes(i), sag = Math.sin((i + 0.5) / n * Math.PI) * 30, wob = bad ? Math.sin(curT * 18 + i) * 4 * crack : 0;
    const x = 300 + i * pw, y = 196 + sag + wob + (bad ? crack * 10 : 0);
    g.fillStyle = UC.ink; g.fillRect(x + 1, y - 1, pw - 2, 18);
    g.fillStyle = bad ? lerpC('#a0703c', '#d8443a', crack) : '#a0703c'; g.fillRect(x + 3, y + 1, pw - 6, 14);
    if (bad && crack > 0.3) { g.fillStyle = UC.ink; g.fillRect(x + pw / 2 - 2, y + 2, 4, 12); }
  }
  g.strokeStyle = '#d8c79a'; g.lineWidth = 4; g.beginPath(); g.moveTo(300, 160); g.quadraticCurveTo(w / 2, 230, w - 300, 160); g.stroke();
  for (let i = 0; i <= n; i += 2) { const x = 300 + i * pw, sag = Math.sin(i / n * Math.PI) * 30; g.fillRect(x - 1, 160 + sag * 0.7, 2, 40); }
  g.restore();
  if (k < 1) return;
  label(g, '理由', cx - w / 2 + 150, cy - h / 2 + 34, 2, UC.goldL, 0.5, 0, 1, null);
  label(g, left, cx - w / 2 + 150, cy - h / 2 + 76, 3, '#ffffff', 0.5, 0, 1, null);
  label(g, '结论', cx + w / 2 - 150, cy - h / 2 + 34, 2, UC.goldL, 0.5, 0, 1, null);
  label(g, right, cx + w / 2 - 150, cy - h / 2 + 76, 3, '#ffffff', 0.5, 0, 1, null);
  if (o.walker && o.walk != null) {
    const wx = cx - w / 2 + lerp(220, w / 2, clamp(o.walk)), wy = cy - h / 2 + 196 + Math.sin(clamp(o.walk) * Math.PI * 0.9) * 22 - o.walker.height * 5;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = FA(g); g.imageSmoothingEnabled = false;
    g.drawImage(o.walker, Math.round(wx - o.walker.width * 2.5), Math.round(wy), o.walker.width * 5, o.walker.height * 5); g.restore();
  }
}

// ---------- 替代原因三角图：A → B 的箭头；上方冒出 C 同时指向 A 和 B；o.cK 出现进度，o.cross 在 A→B 上打叉 ----------
function causeTri(g, cx, cy, A_, B_, C_, L, o = {}) {
  if (L < 0) return;
  const w = 1000, h = 480, k = clamp(L / 0.28), cK = clamp(o.cK ?? 0), cross = clamp(o.cross ?? 0);
  const ax = 230, bx = 770, by = 360, cyy = 120, box = (x, y, col, t) => { g.fillStyle = UC.ink; g.fillRect(x - 150, y - 50, 300, 100); g.fillStyle = col; g.fillRect(x - 146, y - 46, 292, 92); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - 140, y - 40, 280, 80); };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const pk = popIn(g, cx, cy, L, 0.28); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.95)');
  box(ax, by, '#6fa8ff'); box(bx, by, '#5fbf6a');
  g.fillStyle = lerpC('#f2c14e', '#7a7f8e', cross); g.fillRect(ax + 160, by - 6, bx - ax - 360, 12);
  g.beginPath(); g.moveTo(bx - 168, by); g.lineTo(bx - 200, by - 26); g.lineTo(bx - 200, by + 26); g.fill();
  if (cross > 0) { g.strokeStyle = `rgba(255,74,58,${cross})`; g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2 - 40, by - 40); g.lineTo(w / 2 + 40, by + 40); g.moveTo(w / 2 + 40, by - 40); g.lineTo(w / 2 - 40, by + 40); g.stroke(); }
  if (cK > 0) {
    g.globalAlpha *= cK; const yy = cyy - (1 - easeOut(cK)) * 60;
    box(w / 2, yy, '#d8a03a');
    g.fillStyle = '#d8a03a'; for (const [tx, ty] of [[ax + 60, by - 60], [bx - 60, by - 60]]) { const sx = w / 2 + (tx - w / 2) * 0.25, sy = yy + 56; for (let i = 0; i <= 20; i++) { const q = i / 20; g.fillRect(Math.round(lerp(sx, tx, q)) - 3, Math.round(lerp(sy, ty, q)) - 3, 8, 8); } }
  }
  g.restore();
  if (pk.k < 1) return;
  if (o.title) label(g, o.title, cx, cy - h / 2 + 20, 2, UC.goldL, 0.5, 0, 1, null);
  label(g, A_, cx - w / 2 + ax, cy - h / 2 + by - 24, 3, '#ffffff', 0.5, 0, 1, null);
  label(g, B_, cx - w / 2 + bx, cy - h / 2 + by - 24, 3, '#ffffff', 0.5, 0, 1, null);
  if (cK > 0.5) label(g, C_, cx, cy - h / 2 + cyy - 24, 3, '#ffffff', 0.5, 0, cK, null);
  if (cross > 0.5) label(g, '不等于因果', cx, cy - h / 2 + by + 56, 2, '#ff8a7a', 0.5, 0, cross, null);
}

// ---------- 鉴定面板：rows = [[字段, 内容, 揭示进度0..1]] ----------
function idPanel(g, cx, cy, title, rows, L) {
  if (L < 0) return;
  const w = 720, rowH = 96, h = 100 + rows.length * rowH;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.25); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.96)');
  rows.forEach((r, i) => { const y = 84 + i * rowH; g.fillStyle = '#1b2440'; g.fillRect(28, y, w - 56, rowH - 18); g.fillStyle = UC.gold; g.fillRect(28, y, 8, rowH - 18); });
  g.restore();
  if (k < 1) return;
  label(g, title, cx - w / 2 + 32, cy - h / 2 + 24, 3, UC.goldL, 0, 0, 1, null);
  rows.forEach(([f, v, rk], i) => {
    const y = cy - h / 2 + 84 + i * rowH;
    label(g, f, cx - w / 2 + 56, y + 20, 3, UC.kw, 0, 0, 1, null);
    const n = Math.floor(clamp(rk) * v.length);
    label(g, n > 0 ? v.slice(0, n) : '？？？', cx - w / 2 + 196, y + 20, 3, n > 0 ? '#ffffff' : '#6a7088', 0, 0, 1, null);
  });
}

// ---------- 对比卡：左右两栏标题 + 一句说明，hi 0..1 高亮右栏 ----------
function compareCard(g, cx, cy, left, right, L, o = {}) {
  if (L < 0) return;
  const w = 1100, h = 300, hi = clamp(o.hi ?? 0), lk = clamp(o.lk ?? 1), rk = clamp(o.rk ?? 1);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const { k } = popIn(g, cx, cy, L, 0.28); g.translate(-w / 2, -h / 2);
  panel(g, 0, 0, w, h, 4, 'rgba(14,18,34,0.96)');
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w / 2 - 2, 40, 4, h - 80);
  if (hi > 0) { g.fillStyle = `rgba(242,193,78,${0.18 * hi})`; g.fillRect(w / 2 + 12, 24, w / 2 - 36, h - 48); }
  g.restore();
  if (k < 1) return;
  label(g, left[0], cx - w / 4, cy - h / 2 + 48, 4, '#9aa3b8', 0.5, 0, lk, null);
  label(g, left[1], cx - w / 4, cy - h / 2 + 160, 3, '#c6c3bb', 0.5, 0, lk, null);
  label(g, right[0], cx + w / 4, cy - h / 2 + 48, 4, hi > 0.5 ? UC.kw : '#ffffff', 0.5, 0, rk, null);
  label(g, right[1], cx + w / 4, cy - h / 2 + 160, 3, '#ffffff', 0.5, 0, rk, null);
}

// ---------- 世界坐标里的像素表情：'heart' 'angry' 'dots' 'q' 'x' 'bang' ----------
const EMO = {
  heart: ['0110110', '1221221', '1222221', '1222221', '0122210', '0012100', '0001000'],
  angry: ['1001001', '0101010', '0011100', '1110111', '0011100', '0101010', '1001001'],
  dots: ['0000000', '0000000', '0000000', '1101011', '1101011', '0000000', '0000000'],
  q: ['0111110', '1100011', '0000110', '0001100', '0001100', '0000000', '0001100'],
  x: ['1100011', '0110110', '0011100', '0011100', '0110110', '1100011', '0000000'],
  bang: ['0001000', '0001000', '0001000', '0001000', '0001000', '0000000', '0001000'],
  ok: ['0000001', '0000011', '0000110', '1001100', '1111000', '0110000', '0000000'],
};
function emote(g, kind, x, y, a = 1) {
  if (a <= 0) return;
  const m = EMO[kind], col = { heart: '#e8475a', angry: '#e23b2e', dots: '#3a3346', q: '#3a3346', x: '#e23b2e', bang: '#e23b2e', ok: '#3f9a4a' }[kind];
  g.save(); g.globalAlpha = a;
  const X = Math.round(x - 6), Y = Math.round(y - 13);
  g.fillStyle = '#3a3346'; g.fillRect(X - 1, Y - 1, 13, 13); g.fillStyle = '#fffaf0'; g.fillRect(X, Y, 11, 11); g.fillRect(X + 4, Y + 11, 3, 1); g.fillStyle = '#3a3346'; g.fillRect(X + 5, Y + 12, 1, 2);
  m.forEach((row, j) => [...row].forEach((c, i) => { if (c === '0') return; g.fillStyle = c === '2' ? '#ff9aa8' : col; g.fillRect(X + 2 + i, Y + 2 + j, 1, 1); }));
  g.restore();
}

// ---------- 真书展示：真实封面像素化（img）+ 书页厚度 + 右侧道具详情 ----------
// o = {scale, head, name, rank, kind, sub}
function bookReveal(g, cx, cy, img, L, o = {}) {
  if (L < 0 || !img) return;
  const s = o.scale ?? 4, w = img.width * s, h = img.height * s, k = clamp(L / 0.45), z = lerp(0.8, 1, easeOut(k)), fl = Math.sin(curT * 1.6) * 6;
  glowDot(g, cx, cy, Math.max(w, h) * 0.9, 0.35 * clamp(k * 2) * FA(g));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(k * 2) * FA(g);
  g.translate(cx, cy + fl + (1 - easeOut(k)) * 60); g.scale(z, z); g.rotate(-0.025);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-w / 2 + 30, -h / 2 + 34, w + 16, h + 12);
  g.fillStyle = UC.ink; g.fillRect(-w / 2 - 4, -h / 2 - 4, w + 28, h + 24);
  g.fillStyle = '#ece6d4'; g.fillRect(w / 2, -h / 2 + 8, 20, h + 4); g.fillRect(-w / 2 + 8, h / 2, w + 12, 16);
  g.fillStyle = '#c8bea4'; for (let y = -h / 2 + 12; y < h / 2 + 8; y += 8) g.fillRect(w / 2 + 2, y, 16, 4); for (let x = -w / 2 + 12; x < w / 2 + 16; x += 8) g.fillRect(x, h / 2 + 2, 4, 12);
  g.imageSmoothingEnabled = false; g.drawImage(img, -w / 2, -h / 2, w, h);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(-w / 2, -h / 2, 10, h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-w / 2 + 10, -h / 2, 4, h);
  g.restore();
  glint(g, cx - w / 2 * z, cy - h / 2 * z + fl, w * z, h * z, (L - 0.8) / 0.7);
  if (!o.name) return;
  const px = cx + w / 2 * z + 90, pk = clamp((L - 0.35) / 0.3), pw = 600, ph = 380, py = cy - ph / 2;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = pk * FA(g); g.translate((1 - easeOut(pk)) * 60, 0);
  panel(g, px, py, pw, ph, 4, 'rgba(14,18,34,0.95)');
  for (let i = 0; i < 5; i++) { const sk = clamp((L - 0.7 - i * 0.08) / 0.12); if (sk > 0) { g.save(); g.globalAlpha *= sk; star(g, px + 40 + i * 44, py + 196 - (1 - sk) * 10, 6, i < (o.rank ?? 5) ? UC.gold : '#3a3a48'); g.restore(); } }
  g.restore();
  const a = pk, dx = (1 - easeOut(pk)) * 60;
  if (o.head) label(g, o.head, px + 40 + dx, py + 36, 2, UC.goldL, 0, 0, a, null);
  label(g, o.name, px + 40 + dx, py + 84, 4, '#ffffff', 0, 0, a, null);
  if (o.kind) label(g, o.kind, px + 40 + dx, py + 250, 3, UC.kw, 0, 0, a, null);
  if (o.sub) label(g, o.sub, px + 40 + dx, py + 304, 2, '#aab2c8', 0, 0, a, null);
}

// ---------- 坐标 / 光晕 ----------
function w2s(cam, x, y, px = 0) {
  const z = S * cam.z, cx = cam.cx + (BW / 2 - cam.cx) * px, cy = cam.cy + (BH / 2 - cam.cy) * px;
  return [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
}
function glowDot(g, x, y, r, a, col = '255,205,110') {
  if (a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.35, `rgba(${col},${a * 0.35})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}
