// 《学会提问》本集场景 —— 世界观：刷到的每条信息都是「未鉴定道具」，提问就是「鉴定术」。时间全部挂在旁白句子上（A/E/K）。
// 序章 小镇捡道具 → 海绵 → 淘金 → 技能书 + 关键问题 → 第一关 拆开（咖啡、鉴定、论证桥）→ 第二关 证据（分量、个人经历、替代原因）
// → 第三关 地牢里的谬误陷阱 → 隐藏关 镜子（强势/弱势）→ 河里不被冲走 → 终章 道具全部鉴定 + 鉴定卷轴 + 评论/组队
'use strict';

const TOWN_Y = 160;
const ITEMS = Array.from({ length: 12 }, (_, i) => ({ p: [5, 6, 3][i % 3], x: 64 + i * 18, td: 0.5 + i * 0.5, real: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0][i] }));
const LABELED = [[2, '爆款标题'], [5, '专家建议'], [8, '吓人数据']];
const townPost = L => postG(ctx, L, off, { bloom: 0.22, sat: 1.0, vig: 'rgba(30,20,10,0.35)' });
const PROP = i => IMG['q_props_' + i];
function itemY(it, t) {                                      // 从天上掉下来、落地弹一下
  const k = seg(t, it.td, it.td + 0.45); if (k <= 0) return null;
  return k < 1 ? lerp(-30, 156, k * k) : 156 - Math.abs(Math.sin(seg(t, it.td + 0.45, it.td + 0.75) * Math.PI)) * 6 * (1 - seg(t, it.td + 0.45, it.td + 0.75));
}
function drawItems(g, t, emoteMode, now = t) {
  ITEMS.forEach((it, i) => {
    const y = itemY(it, t); if (y == null) return;
    const im = PROP(it.p); g.drawImage(im, Math.round(it.x - im.width / 2), Math.round(y - im.height));
    if (y >= 150) {
      if (emoteMode === 'id' && now > K(32) + i * 0.08) emote(g, it.real ? 'ok' : 'x', it.x, y - im.height - 3);
      else if (emoteMode !== 'none') emote(g, 'q', it.x, y - im.height - 3);
    }
  });
}

// ---------- 序章：小镇里不停掉「未鉴定道具」 ----------
function sTown(t) {
  const hx = 30 + 12 * t, cam = drift({ cx: clamp(hx + 30, 123, 197), cy: 112, z: 1.3 }, t);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  drawItems(octx, t, 'q');
  actor(octx, 'q_hero', Math.floor(t * 4) & 1, hx, TOWN_Y);
  endWorld(); townPost(t);
  LABELED.forEach(([i, txt], j) => {
    const it = ITEMS[i], [sx, sy] = w2s(cam, it.x, 128), at = [A(1) + 0.3, A(1) + 1.4, K(1)][j];
    if (t > K(2) - 0.1) valueTag(ctx, '未鉴定', sx, sy - 30, t - (K(2) - 0.1 + j * 0.12), 3, '#8a8f9e');
    else valueTag(ctx, txt, sx, sy - 30, t - at);
  });
  const got = ITEMS.filter(it => t > it.td + 0.45).length;
  counterTag(ctx, `道具  [${got}]  ·  已鉴定  [0]`, W / 2, 76, seg(t, 0.8, 1.2));
  if (t > K(2)) ping(ctx, W / 2, 104, seg(t, K(2), K(2) + 0.7), 60, 200, '200,200,210');
}

// ---------- 海绵：捡到什么吸什么 ----------
function sSponge(t) {
  const t0 = A(3) - 0.2, L = t - t0, cam = drift({ cx: 197, cy: 112, z: 1.3 }, L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0); drawItems(octx, 99, 'none'); endWorld(); townPost(L);
  darken(0.72);
  const n = 16, sp = PROP(0), grow = 1 + 0.35 * seg(t, t0, E(3) + 0.2), squish = 1 + 0.06 * Math.sin(L * 9);
  for (let i = 0; i < n; i++) {                                // 信息从四面八方飞进海绵
    const t1 = t0 + 0.3 + i * 0.22, k = seg(t, t1, t1 + 0.5); if (k <= 0 || k >= 1) continue;
    const an = rnd(i * 7) * Math.PI * 2, r = 900 * (1 - easeOut(k)), im = PROP([5, 6, 3, 4][i % 4]), s = 6 * (1 - k * 0.7);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1 - k * 0.3;
    ctx.drawImage(im, W / 2 + Math.cos(an) * r - im.width * s / 2, 470 + Math.sin(an) * r * 0.6 - im.height * s / 2, im.width * s, im.height * s); ctx.restore();
  }
  ctx.save(); ctx.imageSmoothingEnabled = false; const sw = sp.width * 14 * grow, sh = sp.height * 14 * grow / squish;
  ctx.drawImage(sp, W / 2 - sw / 2, 470 - sh / 2, sw, sh); ctx.restore();
  glowDot(ctx, W / 2, 470, 360, 0.18);
  const absorbed = Math.floor(999 * Math.pow(seg(t, t0 + 0.3, E(3)), 1.6));
  counterTag(ctx, `吸收  [${absorbed}]`, W / 2, 76, seg(t, t0, t0 + 0.3));
  valueTag(ctx, '海绵式思维', W / 2, 250, t - (K(3) - 0.1), 3, '#8a8f9e');
}

// ---------- 淘金：自己晃盘子，把金子留下 ----------
function sGold(t) {
  const t0 = A(4) - 0.2, L = t - t0, cam = camKeys([{ t: 0, cx: 150, cy: 120, z: 1.6 }, { t: 4, cx: 158, cy: 124, z: 1.9 }], L);
  beginWorld(cam); octx.drawImage(SP('ck_river'), 0, 0);
  actor(octx, 'q_hero', 2 + (Math.floor(L * 4) & 1), 150, 158);
  endWorld();
  postG(ctx, L, off, { bloom: 0.32, sat: 1.04, tint: 'rgba(255,190,150,0.12)', vig: 'rgba(30,20,40,0.35)' });
  const [px, py] = w2s(cam, 166, 146);
  glowDot(ctx, px, py, 200, 0.55 * seg(t, K(4) - 0.1, K(4) + 0.2), '255,214,90');
  ping(ctx, px, py, seg(t, K(4), K(4) + 0.7), 30, 180);
  const [hx, hy] = w2s(cam, 150, 116);
  if (t > K(4)) statusTag(ctx, hx, hy - 50, '淘金式思维', t - K(4), { bad: false, sub: '只留下金子' });
}

// ---------- 技能书 + 关键问题 + 三招 ----------
function triCard(g, cx, cy, L, i, title) {
  if (L < 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); popIn(g, cx, cy, L, 0.25); g.translate(-190, -110);
  panel(g, 0, 0, 380, 220, 4, 'rgba(14,18,34,0.96)'); g.restore();
  if (L > 0.25) { label(g, `第${CN[i]}招`, cx, cy - 76, 3, UC.goldL, 0.5, 0, 1, null); label(g, title, cx, cy - 4, 4, '#ffffff', 0.5, 0, 1, null); }
}
const KEYQ = ['结论是什么？', '理由是什么？', '证据够不够硬？', '有没有替代原因？', '推理有没有谬误？'];
function sBook(t) {
  const t0 = A(5) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 12, cx: 160, cy: 88, z: 1.08 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  const tc = K(5) - 0.05;
  const slide = easeOut(seg(t, A(6) - 0.2, A(6) + 0.4));          // 念「两位作者」时，书挪到左边、关键问题出在右边
  faded(ctx, 1 - seg(t, A(7) - 0.1, A(7) + 0.25), () => {
    bookReveal(ctx, lerp(690, 520, slide), 468, SP('book_real'), t - tc, t < A(6) - 0.2 ? { head: '获得技能书', name: '学会提问', rank: 5, kind: '传说 · 批判性思维', sub: '尼尔·布朗 / 斯图尔特·基利' } : {});
    ping(ctx, 690, 468, seg(t, tc, tc + 0.8), 220, 300);
    const rows = KEYQ.map((q, i) => ({ text: q, owner: 'me', a: seg(t, A(6) + 0.3 + i * 0.55, A(6) + 0.5 + i * 0.55) }));
    questLog(ctx, 1000, 190, 740, rows, { L: t - (A(6) + 0.1), title: '书里的关键问题（节选）', count: '?' });
  });
  for (let i = 0; i < 3; i++) triCard(ctx, W / 2 + (i - 1) * 440, 470, t - (K(7) + i * 0.22), i, EPISODE.chapters[i]);
}

// ---------- 第一关：长寿咖啡 → 鉴定 → 论证桥 ----------
function sCoffee(t) {
  const t0 = A(9) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 168, cy: 112, z: 1.45 }, { t: 22, cx: 172, cy: 114, z: 1.6 }], L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  actor(octx, 'ck_npcs', 8, 204, 152); actor(octx, 'ck_hero', 0, 146, TOWN_Y);
  const cup = PROP(2), bob = Math.sin(L * 3) * 2; octx.drawImage(cup, Math.round(186 - cup.width / 2), Math.round(126 + bob));
  emote(octx, t > K(11) + 0.8 ? 'bang' : 'q', 186, 120 + bob);
  endWorld(); townPost(L);
  darken(0.5 * seg(t, A(9) + 0.3, A(9) + 0.7));
  faded(ctx, 1 - seg(t, A(12) - 0.2, A(12) + 0.1), () => {
    const named = t > K(11) + 0.8;
    itemCard(ctx, 560, 480, t - (A(9) + 0.4), '长寿咖啡', 0, cup, { iconRot: 0, iconScale: 6, kind: named ? '鉴定完成' : '效果：？？？', head: '未鉴定道具', ribbon: named ? '#2f7a4a' : '#5a5f6e' });
    idPanel(ctx, 1300, 470, '鉴定中……', [['结论', '你也该每天喝一杯', seg(t, K(10), K(10) + 0.7)], ['理由', '喝咖啡的人更长寿', seg(t, K(11), K(11) + 0.7)]], t - (A(10) - 0.1));
  });
  bridgeCard(ctx, W / 2, 440, '喝咖啡的人更长寿', '你也该喝', t - A(12), { crack: seg(t, K(13) - 0.2, K(13) + 0.5), walk: seg(t, A(13) + 0.3, K(13) - 0.1), walker: IMG.ck_hero_0 });
  if (t > K(13) + 0.3) valueTag(ctx, '结实吗？', W / 2, 300, t - (K(13) + 0.3), 3, '#d8443a');
}

// ---------- 第二关：证据的分量 → 个人经历 → 替代原因 ----------
function sEvidence(t) {
  const t0 = A(15) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 24, cx: 160, cy: 90, z: 1.08 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  faded(ctx, 1 - seg(t, A(16) - 0.15, A(16) + 0.1), () => {
    const rows = [['个人经历', '分量 · 轻'], ['专家意见', '分量 · 中'], ['研究报告', '分量 · 重']].map(([txt, tag], i) => ({ text: txt, owner: 'me', tag, tagK: seg(t, A(15) + 0.5 + i * 0.6, A(15) + 0.8 + i * 0.6) }));
    questLog(ctx, W / 2 - 380, 230, 760, rows, { L: t - (A(15) + 0.1), title: '证据的分量', rowH: 76 });
  });
  faded(ctx, 1 - seg(t, A(17) - 0.15, A(17) + 0.1), () => {
    chatBubble(ctx, 520, 360, '我朋友喝了，精神特别好！', t - (A(16) + 0.1), 'l', { s: 4 });
    if (t > K(16) - 0.1) valueTag(ctx, '只是一个人的经历', 1280, 360, t - (K(16) - 0.1), 3, '#d8443a');
  });
  causeTri(ctx, W / 2, 470, '喝咖啡', '活得更久', '更有钱 · 会保养', t - (A(17) + 0.2), { title: '研究发现：两件事常常一起出现', cK: seg(t, K(19) - 0.3, K(19) + 0.3), cross: seg(t, K(20), K(20) + 0.3) });
  if (t > K(18) - 0.1 && t < K(19) + 0.2) valueTag(ctx, '替代原因？', W / 2, 220, t - (K(18) - 0.1), 3, UC.gold);
}

// ---------- 第三关：地牢里的谬误陷阱 ----------
const T1 = 104, T2 = 184, T3 = 262;
function heroPath(t) {
  const P = [[A(22) - 0.3, 26], [A(23) + 0.1, T1 - 30], [A(24) + 0.1, T2 - 36], [A(25) + 0.1, T3 - 44], [A(26) + 0.4, T3 - 44]];
  for (let i = 0; i < P.length - 1; i++) if (t < P[i + 1][0]) { const k = seg(t, P[i][0], P[i][0] + Math.min(1.8, P[i + 1][0] - P[i][0])); return [lerp(P[i][1], P[i + 1][1], easeOut(k)), k > 0 && k < 1]; }
  return [P[P.length - 1][1], false];
}
function spikes(g, cx, base, h, col) {
  if (h <= 0.5) return;
  for (let i = -3; i <= 3; i++) for (let r = 0; r < h; r++) { const w = Math.max(1, Math.round((h - r) / h * 3)); g.fillStyle = r === Math.floor(h) - 1 ? '#e8e8f0' : col; g.fillRect(cx + i * 5 - Math.floor(w / 2), Math.round(base - r), w, 1); }
}
function door(g, x, top, glow) {
  g.fillStyle = '#1a120c'; g.fillRect(x - 9, top - 1, 18, 30);
  g.fillStyle = glow ? '#3f9a4a' : '#6b4220'; g.fillRect(x - 8, top, 16, 28);
  g.fillStyle = glow ? '#8fe39a' : '#8a5a2b'; g.fillRect(x - 6, top + 2, 12, 24);
  g.fillStyle = '#f2c14e'; g.fillRect(x + 3, top + 14, 2, 2);
}
function sDungeon(t) {
  const t0 = A(22) - 0.3, L = t - t0, [hx, moving] = heroPath(t), done = seg(t, K(26), K(26) + 0.4);
  const cam = drift({ cx: clamp(hx + 34, 119, 201), cy: 110, z: 1.35 }, L);
  beginWorld(cam); octx.drawImage(SP('q_dungeon'), 0, 0);
  octx.fillStyle = 'rgba(0,0,0,0.35)'; for (const x of [T1, T2, T3]) octx.fillRect(x - 18, 151, 36, 3);
  const up1 = seg(t, A(23) + 0.4, A(23) + 0.65); spikes(octx, T1, 152, 10 * up1 * (1 - 0.6 * done), done > 0.5 ? '#6a6f7e' : '#b8bccb');
  const gh = seg(t, A(24) + 0.2, A(24) + 0.6) * (1 - 0.8 * done);
  if (gh > 0) {
    octx.save(); octx.filter = 'brightness(1.5) saturate(0.25) hue-rotate(180deg)';
    [0, 1, 4, 6, 7, 9].forEach((ni, j) => { octx.globalAlpha = gh * 0.45; actor(octx, 'ck_npcs', ni, T2 - 30 + j * 12, 150 - (j & 1) * 3); });
    octx.restore(); octx.globalAlpha = 1;
    [0, 2, 4].forEach(j => emote(octx, 'heart', T2 - 30 + j * 12, 108 - (j & 1) * 3, gh * 0.8));
  }
  const dk = seg(t, A(25) + 0.2, A(25) + 0.5);
  if (dk > 0) { octx.globalAlpha = dk; door(octx, T3 - 14, 123, false); door(octx, T3 + 14, 123, false); octx.globalAlpha = 1; }
  const third = seg(t, K(25) + 0.6, K(25) + 1.0);
  if (third > 0) { octx.globalAlpha = third; door(octx, T3 + 42, 123, true); octx.globalAlpha = 1; }
  actor(octx, 'q_hero', moving ? 4 + (Math.floor(t * 5) & 1) : 4, hx, 152);
  endWorld();
  postG(ctx, L, off, { bloom: 0.32, sat: 1.0, tint: 'rgba(120,140,200,0.15)', vig: 'rgba(0,0,0,0.6)' });
  for (const [x, y] of [[33, 54], [131, 54], [229, 54], [314, 54]]) { const [sx, sy] = w2s(cam, x, y); glowDot(ctx, sx, sy, 200 * cam.z, 0.35 + 0.08 * Math.sin(t * 11 + x)); }
  const [mx, my] = w2s(cam, hx + 10, 126); glowDot(ctx, mx, my, 120, 0.3 + 0.1 * Math.sin(t * 6), '200,230,255');
  const found = [K(23), K(24), K(25)].filter(k => t > k).length;
  counterTag(ctx, `识破陷阱  [${found}] / 3`, W / 2, 76, seg(t, K(22) - 0.2, K(22) + 0.2));
  const tag = (x, name, at) => { const [sx, sy] = w2s(cam, x, 104); if (t > at) statusTag(ctx, sx, sy - 60, t > K(26) ? '已识破' : name, t > K(26) ? t - K(26) : t - at, { bad: t <= K(26), sub: t > K(26) ? name : null }); };
  tag(T1, '人身攻击', K(23)); tag(T2, '诉诸大众', K(24)); tag(T3, '非此即彼', K(25));
  if (t > A(23) && t < K(23) + 0.2) { const [sx, sy] = w2s(cam, T1 + 10, 112); chatBubble(ctx, sx, sy - 40, '他学历那么低，不用听', t - A(23), 'l', { s: 3 }); }
  if (t > A(24) && t < K(24) + 0.2) { const [sx, sy] = w2s(cam, T2 + 30, 104); chatBubble(ctx, sx, sy - 60, '几百万人都在用！', t - A(24), 'l', { s: 3 }); }
  if (dk > 0) {
    const [d1x, d1y] = w2s(cam, T3 - 14, 120), [d2x] = w2s(cam, T3 + 14, 120), [d3x] = w2s(cam, T3 + 42, 120);
    valueTag(ctx, '全听我的', d1x, d1y - 8, t - (A(25) + 0.4), 2); valueTag(ctx, '你就完了', d2x, d1y - 8, t - (A(25) + 0.7), 2, '#d8443a');
    if (third > 0) valueTag(ctx, '还有别的选项', d3x, d1y - 8, t - (K(25) + 0.7), 2, UC.green);
  }
}

// ---------- 隐藏关：镜子里问自己 → 弱势 / 强势 ----------
function sMirror(t) {
  const t0 = A(27) - 0.4, L = t - t0, cam = camKeys([{ t: 0, cx: 196, cy: 112, z: 1.5 }, { t: 4.5, cx: 190, cy: 110, z: 1.6 }, { t: 12, cx: 180, cy: 100, z: 1.25 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0);
  const mx0 = 206, mx1 = 244, my0 = 84, my1 = 152;
  octx.fillStyle = '#1a120c'; octx.fillRect(mx0 - 3, my0 - 3, mx1 - mx0 + 6, my1 - my0 + 4);
  octx.fillStyle = '#c8962e'; octx.fillRect(mx0 - 2, my0 - 2, mx1 - mx0 + 4, my1 - my0 + 2);
  octx.fillStyle = '#9fb6d8'; octx.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
  octx.save(); octx.beginPath(); octx.rect(mx0, my0, mx1 - mx0, my1 - my0); octx.clip();
  octx.globalAlpha = 0.85; octx.filter = 'brightness(0.95) saturate(0.85)'; actor(octx, 'q_hero', 4, 236, 152, true); octx.filter = 'none'; octx.globalAlpha = 1;
  octx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 3; i++) octx.fillRect(mx0 + 4 + i * 9, my0 + 4, 3, 30);
  octx.restore();
  actor(octx, 'q_hero', 4, 184, 152);
  if (t > K(27) + 0.2) emote(octx, 'q', 232, 108);
  endWorld(); studyPost(L); studyGlow(cam, t);
  darken(0.4 * seg(t, A(28) - 0.2, A(28) + 0.2));
  compareCard(ctx, W / 2, 330, ['弱势', '只拿来驳倒别人'], ['强势', '连自己也一起检查'], t - (A(28) - 0.1), { rk: seg(t, A(29) - 0.1, A(29) + 0.3), hi: seg(t, K(29), K(29) + 0.3) });
}

// ---------- 信息的河：东西漂走，人站稳 ----------
function sRiver(t) {
  const t0 = A(30) - 0.2, L = t - t0, cam = drift({ cx: 176, cy: 110, z: 1.3 }, L);
  beginWorld(cam); octx.drawImage(SP('ck_river'), 0, 0);
  for (let i = 0; i < 12; i++) {
    const ph = ((L * 0.16 + rnd(i * 3)) % 1), x = lerp(196, 340, ph) + rnd(i) * 30, y = lerp(96, 176, ph) + Math.sin(L * 2 + i) * 2, im = PROP([5, 6, 3, 2][i % 4]);
    octx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height)); emote(octx, 'q', x, y - im.height - 2);
  }
  actor(octx, 'ck_hero', 0, 150, 158);
  endWorld();
  postG(ctx, L, off, { bloom: 0.3, sat: 1.02, tint: 'rgba(255,190,150,0.12)', vig: 'rgba(30,20,40,0.35)' });
  const [hx, hy] = w2s(cam, 150, 118);
  if (t > K(31)) statusTag(ctx, hx, hy - 40, '不被冲走', t - K(31), { bad: false, sub: '先提问，再决定' });
}

// ---------- 终章：道具全部鉴定 → 鉴定卷轴 → 评论 / 组队 ----------
function sEnd(t) {
  const t0 = A(32) - 0.2, L = t - t0, cam = drift({ cx: 166, cy: 112, z: 1.3 + 0.04 * seg(t, t0, DUR) }, L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0); drawItems(octx, 99, 'id', t); actor(octx, 'ck_hero', 0, 46, TOWN_Y); endWorld(); townPost(L);
  const idd = ITEMS.filter((_, i) => t > K(32) + i * 0.08).length;
  counterTag(ctx, `道具  [12]  ·  已鉴定  [${idd}]`, W / 2, 76, seg(t, t0 + 0.2, t0 + 0.5) * (1 - seg(t, A(34) - 0.2, A(34) + 0.1)));
  darken(0.45 * seg(t, K(33) - 0.2, K(33) + 0.2));
  faded(ctx, 1 - seg(t, A(34) - 0.2, A(34) + 0.1), () => {
    itemCard(ctx, W / 2, 500, t - (K(33) - 0.05), '鉴定卷轴', 5, SP('ck_scroll'), { iconRot: 0, iconScale: 7, kind: '用法：先提问', head: '获得道具', ribbon: '#2f7a4a' });
    ping(ctx, W / 2, 500, seg(t, K(33) - 0.05, K(33) + 0.7), 140, 260);
  });
  faded(ctx, 1 - seg(t, A(35) - 0.1, A(35) + 0.2), () => {
    const typed = '喝 XX 能让记忆力翻倍'.slice(0, Math.floor(seg(t, K(34) + 0.2, K(34) + 1.8) * 12));
    commentBox(ctx, W / 2, 560, '写下你信过、后来发现不对的一句话……', typed, t - A(34));
  });
  const pr = A(35) + 1.2, btn = inviteDialog(ctx, W / 2, 520, EPISODE.channel, t - A(35), t > pr ? 1 : 0, faceOf('pk_guy', 0, 16));
  if (btn) { const k = ease(seg(t, A(35) + 0.4, pr - 0.1)); cursorPx(ctx, lerp(W / 2 + 420, btn[0], k), lerp(820, btn[1], k), t > pr && t < pr + 0.15 ? 1 : 0); }
}

const SCENES = [
  [0, A(3) - 0.2, sTown], [A(3) - 0.2, A(4) - 0.2, sSponge], [A(4) - 0.2, A(5) - 0.3, sGold], [A(5) - 0.3, A(8) - 0.4, sBook],
  [A(8) - 0.4, A(9) - 0.3, t => sceneLevel(t, 0, 8)], [A(9) - 0.3, A(14) - 0.4, sCoffee],
  [A(14) - 0.4, A(15) - 0.3, t => sceneLevel(t, 1, 14)], [A(15) - 0.3, A(21) - 0.4, sEvidence],
  [A(21) - 0.4, A(22) - 0.3, t => sceneLevel(t, 2, 21)], [A(22) - 0.3, A(27) - 0.4, sDungeon],
  [A(27) - 0.4, A(30) - 0.2, sMirror], [A(30) - 0.2, A(32) - 0.2, sRiver], [A(32) - 0.2, DUR + 1, sEnd],
];
const PK_OPTS = { barFrom: K(7) - 0.2, chapterAt: [[A(8) - 0.4, 0], [A(14) - 0.4, 1], [A(21) - 0.4, 2], [A(27) - 0.4, 3]] };
