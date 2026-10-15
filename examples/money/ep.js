// 《金钱心理学》本集场景 —— 世界观：钱是游戏里的金币，「装备」穿给别人看，「背包」才是你自己的。时间全部挂在旁白句子上（A/E/K）。
// 序章 加油站工人 vs 华尔街高管（谁更有钱？）→ 技能书 + 作者金句 + 三关 → 第一关 看不见的财富（豪车、没花掉的钱、背包）
// → 第二关 知道够了（一亿身家还嫌少 → 入狱 → 终点线一直往前挪）→ 第三关 别下牌桌（巴菲特曲线 → 牌桌上活到最后 → 留出余地）
// → 隐藏关 自由（最高红利）→ 终章 两位玩家 + 道具「够了」+ 评论 / 组队
'use strict';

const G = 166, WX = 70, EX = 212, CARX = 266;                 // 城市街景：人行道脚底线 / 工人 / 高管 / 跑车
const P = i => IMG['m_props_' + i];                           // 0 金币 1 背包 2 名表 3 终点旗 4 沙漏
const cityPost = L => postG(ctx, L, off, { bloom: 0.3, sat: 1.02, tint: 'rgba(255,170,110,0.10)', vig: 'rgba(20,10,30,0.4)' });
const fit = c => { const hw = BW / 2 / c.z, hh = BH / 2 / c.z; return { ...c, cx: clamp(c.cx, hw, BW - hw), cy: clamp(c.cy, hh, BH - hh) }; };   // 镜头不出画
// 世界坐标里蹦出来的小金币
function coinBurst(g, x, y, L, n = 10) {
  for (let i = 0; i < n; i++) {
    const tt = L - i * 0.07; if (tt < 0 || tt > 1.1) continue;
    const px = x - (0.3 + rnd(i * 5 + 1)) * 22 * tt, py = y - 22 * tt + 40 * tt * tt;      // 从背包往身后冒，不盖住头
    g.globalAlpha = 1 - tt / 1.1; g.fillStyle = '#9a6a16'; g.fillRect(Math.round(px), Math.round(py), 3, 3);
    g.fillStyle = '#f2c14e'; g.fillRect(Math.round(px), Math.round(py), 2, 2); g.fillStyle = '#fff1a8'; g.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  g.globalAlpha = 1;
}
function cursorTo(boxes, i, t, t1, t2) {
  if (!boxes) return;
  const k = ease(seg(t, t1, t2)); cursorPx(ctx, lerp(W / 2 + 120, boxes[i][0] + 60, k), lerp(640, boxes[i][1] + 10, k), t > t2 && t < t2 + 0.15 ? 1 : 0);
}

// ---------- 序章：加油站工人 vs 华尔街高管 ----------
function sCity(t) {
  const cam = fit(camKeys([
    { t: 0, cx: 160, cy: 96, z: 1.0 }, { t: A(1) + 0.2, cx: 160, cy: 100, z: 1.08 }, { t: A(2) - 0.1, cx: 160, cy: 100, z: 1.08 },
    { t: A(2) + 0.6, cx: 226, cy: 126, z: 1.7 }, { t: A(3) - 0.15, cx: 226, cy: 126, z: 1.72 },
    { t: A(3) + 0.5, cx: 94, cy: 126, z: 1.7 }, { t: A(4) - 0.1, cx: 94, cy: 126, z: 1.72 }, { t: A(4) + 0.6, cx: 118, cy: 116, z: 1.4 }, { t: A(5), cx: 120, cy: 116, z: 1.42 }], t));
  const broke = t > K(2), rich = t > K(3);
  beginWorld(cam); octx.drawImage(SP('m_city'), 0, 0);
  const car = SP('m_car'), ca = 1 - seg(t, K(2) + 0.2, K(2) + 0.9);                // 破产：跑车被收走
  if (ca > 0) { octx.globalAlpha = ca; octx.drawImage(car, Math.round(CARX - car.width / 2), G - car.height); octx.globalAlpha = 1; }
  actor(octx, 'm_people', broke ? 3 : 2, EX, G, true);
  actor(octx, 'm_people', rich ? 1 : 0, WX, G);
  if (rich) coinBurst(octx, WX - 10, G - 20, (t - K(3)) % 1.6, 12);
  endWorld(); cityPost(t);
  const [wx, wy] = w2s(cam, WX, G - 42), [ex, ey] = w2s(cam, EX, G - 42);
  faded(ctx, 1 - seg(t, A(2) - 0.2, A(2) + 0.1), () => {
    valueTag(ctx, '加油站工人', wx, wy, t - (A(0) + 0.3), 3, '#8a8f9e');
    valueTag(ctx, '哈佛 · 华尔街高管', ex, ey, t - K(0));
  });
  faded(ctx, 1 - seg(t, A(2) - 0.15, A(2) + 0.1), () => {                         // 大多数人会选高管
    const boxes = choiceDialog(ctx, W / 2, 360, '最后谁更有钱？', ['加油站工人', '华尔街高管'], t > A(1) + 1.0 ? 1 : -1, t - (A(1) - 0.05), { w: 780 });
    cursorTo(boxes, 1, t, A(1) + 0.3, A(1) + 0.95);
  });
  faded(ctx, 1 - seg(t, A(3) - 0.2, A(3) + 0.1), () => { if (broke) statusTag(ctx, ex, ey - 20, '破产', t - K(2), { bad: true, sub: '2008 金融危机' }); });
  if (t > K(3) - 0.1) {
    const [gx, gy] = w2s(cam, WX, G - 20);
    glowDot(ctx, gx, gy, 240, 0.5 * seg(t, K(3), K(3) + 0.2) * (1 - seg(t, K(3) + 0.6, K(3) + 1.6)), '255,214,90');
    ping(ctx, gx, gy, seg(t, K(3), K(3) + 0.7), 40, 200);
    counterTag(ctx, `遗产  [$${fmt(8e6 * easeOut(seg(t, K(3), K(3) + 1.2)))}]`, W / 2, 76, seg(t, K(3) - 0.1, K(3) + 0.2) * (1 - seg(t, A(5) - 0.6, A(5) - 0.3)));
  }
  faded(ctx, 1 - seg(t, A(5) - 0.6, A(5) - 0.3), () => {
    const d4 = E(4) - A(4);
    const rows = [['一直攒钱', A(4) + 0.1], ['买股票', A(4) + d4 * 0.42], ['拿着不动', K(4)]].map(([s, ta]) => ({ text: s, owner: 'me', a: seg(t, ta, ta + 0.2), done: seg(t, ta + 0.25, ta + 0.4) }));
    questLog(ctx, 1080, 260, 640, rows, { L: t - (A(4) - 0.1), title: '他的玩法' });
  });
}

// ---------- 技能书 + 作者金句 + 三关 ----------
function triCard(g, cx, cy, L, i, title) {
  if (L < 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); popIn(g, cx, cy, L, 0.25); g.translate(-190, -110);
  panel(g, 0, 0, 380, 220, 4, 'rgba(14,18,34,0.96)'); g.restore();
  if (L > 0.25) { label(g, `第${CN[i]}关`, cx, cy - 76, 3, UC.goldL, 0.5, 0, 1, null); label(g, title, cx, cy - 4, 4, '#ffffff', 0.5, 0, 1, null); }
}
function sBook(t) {
  const t0 = A(5) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 12, cx: 160, cy: 88, z: 1.08 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  const tc = K(5) - 0.05, slide = easeOut(seg(t, A(6) - 0.2, A(6) + 0.4));      // 念作者那句时，书挪到左边、金句出在右边
  faded(ctx, 1 - seg(t, A(7) - 0.1, A(7) + 0.25), () => {
    bookReveal(ctx, lerp(690, 520, slide), 480, SP('book_real'), t - tc, t < A(6) - 0.2 ? { head: '获得技能书', name: '金钱心理学', rank: 5, kind: '传说 · 财商', sub: '摩根·豪泽尔' } : {});
    ping(ctx, 690, 480, seg(t, tc, tc + 0.8), 220, 300);
    quoteCard(ctx, 1330, 470, ['理财拼的不是你多聪明，', '而是你[怎么做]。'], '—— 摩根·豪泽尔', t - (A(6) + 0.2), { s: 4 });
  });
  for (let i = 0; i < 3; i++) triCard(ctx, W / 2 + (i - 1) * 440, 470, t - (K(7) + i * 0.22), i, EPISODE.chapters[i]);
}

// ---------- 第一关①：街上开过一辆豪车 ----------
function sCar(t) {
  const t0 = A(9) - 0.3, L = t - t0, cam = fit(drift({ cx: 176, cy: 124, z: 1.55 }, L));
  const cx = lerp(-70, 196, easeOut(seg(t, t0, A(9) + 0.9)));
  beginWorld(cam); octx.drawImage(SP('m_city'), 0, 0);
  actor(octx, 'ck_hero', 0, 118, G);
  const car = SP('m_car'); octx.drawImage(car, Math.round(cx - car.width / 2), G - car.height + (L < 1.2 ? (Math.floor(L * 20) & 1) : 0));
  if (t > K(9)) emote(octx, t > K(10) ? 'bang' : 'heart', 118, G - 40);
  endWorld(); cityPost(L);
  const [sx, sy] = w2s(cam, cx, G - 30);
  if (t < K(10)) valueTag(ctx, '车主很有钱？', sx, sy, t - (K(9) + 0.1));
  else valueTag(ctx, '钱包  -1 辆车', sx, sy, t - K(10), 3, '#d8443a');
  counterTag(ctx, '你唯一能确定的', W / 2, 76, seg(t, A(10) + 0.2, A(10) + 0.5));
}

// ---------- 第一关②：没花掉的钱 → 背包 → 装备 vs 背包 ----------
function sBag(t) {
  const t0 = A(11) - 0.3, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 150, cy: 96, z: 1.12 }, { t: 12, cx: 172, cy: 86, z: 1.26 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  darken(0.45);
  faded(ctx, 1 - seg(t, A(12) - 0.2, A(12) + 0.1), () => {
    const named = t > K(11) - 0.05;                                   // 先是一张没揭晓的卡，念到关键词才翻出来
    itemCard(ctx, W / 2, 500, t - (A(11) + 0.3), named ? '没花掉的钱' : '？？？', named ? 5 : 0, named ? P(0) : null, { iconRot: 0, iconScale: 6, head: '财富是', kind: named ? '看不见的财富' : '？？？', ribbon: named ? '#2f7a4a' : '#5a5f6e' });
    ping(ctx, W / 2, 500, seg(t, K(11) - 0.05, K(11) + 0.7), 140, 260);
  });
  if (t < A(12) - 0.1) return;
  const d = E(12) - A(12), bx = W / 2, by = 830 + Math.round(Math.sin(t * 3) * 3) * 6, bag = seg(t, A(12) - 0.1, A(12) + 0.25);
  spr(ctx, P(1), bx, by + (1 - easeOut(bag)) * 60, 11, 0.5, 1, bag);
  if (t > A(12) + d * 0.58 + 0.9) coinScreen(bx, by - 150, (t - (A(12) + d * 0.58 + 0.9)) % 1.3);
  glowDot(ctx, bx, by - 120, 260, 0.45 * seg(t, K(12), K(12) + 0.2) * (1 - seg(t, K(12) + 0.5, K(12) + 1.5)), '255,214,90');
  ping(ctx, bx, by - 120, seg(t, K(12), K(12) + 0.7), 60, 220);
  // 没买的豪车 / 名表：先打上「没买」，再缩小飞进背包变金币
  const thing = (im, s, x0, y0, tIn, tFly, add) => {
    const kin = seg(t, tIn, tIn + 0.25), kf = seg(t, tFly, tFly + 0.45); if (kin <= 0) return 0;
    if (kf < 1) {
      const e = kf * kf, x = lerp(x0, bx, e), y = lerp(y0, by - 150, e) - Math.sin(kf * Math.PI) * 120;
      spr(ctx, im, x, y, s * lerp(1, 0.25, e), 0.5, 0.5, kin * (1 - kf * 0.6));
      if (kf <= 0) valueTag(ctx, '没买', x0, y0 - im.height * s / 2 - 10, t - (tIn + 0.15), 3, '#d8443a');
    } else { const [cx, cy] = [bx, by - 150]; coinScreen(cx, cy, t - (tFly + 0.45)); faded(ctx, 1 - seg(t, A(13) - 0.3, A(13)), () => valueTag(ctx, add, cx + (x0 < bx ? -220 : 220), cy - 40, t - (tFly + 0.45), 3)); }
    return easeOut(seg(t, tFly + 0.45, tFly + 0.9));
  };
  const k1 = thing(SP('m_car'), 3.5, 520, 380, A(12) + 0.05, A(12) + d * 0.3, '+30万');
  const k2 = thing(P(2), 7, 1400, 380, A(12) + d * 0.3, A(12) + d * 0.58, '+5万');
  faded(ctx, 1 - seg(t, A(13) - 0.2, A(13) + 0.1), () => counterTag(ctx, `背包  [${fmt(300000 * k1 + 50000 * k2)}]  金币`, W / 2, 76, seg(t, A(12), A(12) + 0.3)));
  compareCard(ctx, W / 2, 330, ['装备', '穿给别人看'], ['背包', '才是你自己的'], t - (A(13) - 0.1), { rk: seg(t, A(13) + 0.7, A(13) + 1.0), hi: seg(t, K(13), K(13) + 0.3) });
}
function coinScreen(x, y, L) {                                     // 屏幕坐标版的金币迸出
  if (L < 0 || L > 1.2) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 14; i++) {
    const tt = L - i * 0.03; if (tt < 0) continue;
    const an = rnd(i * 3) * Math.PI - Math.PI, r = 160 * easeOut(clamp(tt / 0.8)), px = x + Math.cos(an) * r, py = y + Math.sin(an) * r * 0.7 + 200 * tt * tt;
    ctx.globalAlpha = clamp(1 - tt / 1.2) * FA(ctx); ctx.fillStyle = '#9a6a16'; ctx.fillRect(Math.round(px / 6) * 6, Math.round(py / 6) * 6, 18, 18);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(Math.round(px / 6) * 6, Math.round(py / 6) * 6, 12, 12);
  }
  ctx.restore();
}

// ---------- 第二关①：一亿身家，身边全是亿万富翁 ----------
const RICH = [[112, 'm_people2', 2, false], [210, 'm_people', 2, true], [236, 'm_people2', 0, true]];
function sGupta(t) {
  const t0 = A(15) - 0.3, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 160, cy: 118, z: 1.7 }, { t: 3, cx: 160, cy: 114, z: 1.55 }, { t: 9, cx: 160, cy: 110, z: 1.4 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0);
  octx.save(); octx.filter = 'brightness(0.22) saturate(0) sepia(0.5)';              // 亿万富翁：一排西装剪影，不指认具体的人
  RICH.forEach(([x, sh, f, fl], i) => { const a = seg(t, A(16) + 0.1 + i * 0.25, A(16) + 0.4 + i * 0.25); if (a > 0) actor(octx, sh, f, x, 152, fl, a); });
  octx.restore();
  actor(octx, 'm_people2', 0, 160, 152);
  if (t > E(16) - 0.5) emote(octx, 'angry', 162, 110);
  endWorld(); studyPost(L); studyGlow(cam, t);
  hud(ctx, seg(t, A(15) + 0.1, A(15) + 0.5), { name: '麦肯锡掌门人', bar: 1, y: 84, line2: t > K(15) ? '身家 1亿美元 · Lv.99' : '身家  ？？？', face: faceOf('m_people2', 0, 16) });
  RICH.forEach(([x], i) => { const [sx, sy] = w2s(cam, x, 112); glowDot(ctx, sx, sy + 120, 180, 0.35 * seg(t, A(16) + 0.1 + i * 0.25, A(16) + 0.4 + i * 0.25), '255,214,90'); valueTag(ctx, '亿万富翁', sx, sy, t - (A(16) + 0.2 + i * 0.25), 2); });
  const [gx, gy] = w2s(cam, 160, 112);
  if (t > E(16) - 0.4 && t < A(17) + 0.1) statusTag(ctx, gx, gy - 70, '还不够', t - (E(16) - 0.4), { bad: true });
  if (t > A(17) + 0.1) chatBubble(ctx, gx + 70, gy - 150, '（小声）董事会刚决定……', t - (A(17) + 0.1), 'l', { s: 3 });
}

// ---------- 第二关②：内幕交易 → 入狱 → 输掉已经拥有的一切 ----------
function sJail(t) {
  const t0 = K(17) - 0.25, L = t - t0, cam = fit(drift({ cx: 160, cy: 116, z: 1.6 }, L));
  if (t > K(17) && t < K(17) + 0.3) cam.cy += (rnd(Math.floor(t * 30)) - 0.5) * 3;            // 铁栏落下的一震
  beginWorld(cam); octx.drawImage(SP('q_dungeon'), 0, 0);
  actor(octx, 'm_people2', 1, 160, 152);
  const drop = easeOut(seg(t, K(17), K(17) + 0.25)), by = Math.round(lerp(-70, 0, drop));
  if (drop > 0) {
    octx.fillStyle = '#1a1c24'; octx.fillRect(132, 98 + by, 57, 5);
    for (let x = 134; x <= 186; x += 8) { octx.fillStyle = '#2e323e'; octx.fillRect(x, 100 + by, 3, 52); octx.fillStyle = '#8a90a2'; octx.fillRect(x, 100 + by, 1, 52); }
  }
  endWorld();
  postG(ctx, L, off, { bloom: 0.32, sat: 0.95, tint: 'rgba(120,140,200,0.15)', vig: 'rgba(0,0,0,0.6)' });
  for (const [x, y] of [[33, 54], [131, 54], [229, 54]]) { const [sx, sy] = w2s(cam, x, y); glowDot(ctx, sx, sy, 200 * cam.z, 0.32 + 0.08 * Math.sin(t * 11 + x)); }
  const [gx, gy] = w2s(cam, 160, 100);
  faded(ctx, 1 - seg(t, A(18) - 0.2, A(18) + 0.1), () => statusTag(ctx, gx, gy - 40, '内幕交易', t - (K(17) + 0.15), { bad: true, sub: '入狱' }));
  ['一亿身家', '名声', '自由'].forEach((s, i) => {                                     // 已经拥有的一切：先亮金，再变灰掉下去
    const ta = A(18) + 0.15 + i * 0.3, lost = t > K(18) + 0.2 + i * 0.12, fall = seg(t, K(18) + 0.5 + i * 0.12, K(18) + 1.3 + i * 0.12);
    valueTag(ctx, s, W / 2 + (i - 1) * 440, 330 + fall * fall * 500, t - ta, 3, lost ? '#5a5f6e' : UC.gold);
  });
}

// ---------- 第二关③：终点线一直往前挪 → 停下来 → 够了 ----------
const GOAL = { x0: 280, x1: 1640, y: 700, v: 400, POS: [760, 1080, 1380, 1580] };
function goalState(t) {
  const { x0, v, POS } = GOAL, ts = A(19), stopT = K(19) + 0.2, hxAt = tt => x0 + 40 + v * Math.max(0, tt - ts);
  let j = 0; while (j < POS.length - 1 && hxAt(Math.min(t, stopT)) >= POS[j] - 140) j++;
  const tj = j > 0 ? ts + (POS[j - 1] - 140 - x0 - 40) / v : -1, hop = j > 0 ? easeOut(seg(t, tj, tj + 0.3)) : 1;
  const fx = j > 0 ? lerp(POS[j - 1], POS[j], hop) : POS[0], fy = j > 0 ? -Math.sin(hop * Math.PI) * 90 : 0;
  const hx = Math.min(hxAt(t), POS[j] - 90), arrive = ts + (POS[j] - 90 - x0 - 40) / v;
  return { j, fx, fy, hx, moving: t > ts && t < arrive, arrive, stopped: t > stopT };
}
function sGoal(t) {
  const t0 = A(19) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 8, cx: 160, cy: 90, z: 1.06 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  darken(0.5);
  const { x0, x1, y } = GOAL, s = goalState(t), a = seg(t, t0, t0 + 0.3);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  ctx.fillStyle = UC.ink; ctx.fillRect(x0 - 6, y - 6, x1 - x0 + 12, 24); ctx.fillStyle = '#3a4260'; ctx.fillRect(x0, y, x1 - x0, 12);
  ctx.fillStyle = '#1b2440'; for (let x = x0; x < x1; x += 60) ctx.fillRect(x, y, 30, 12);
  ctx.restore();
  spr(ctx, P(3), s.fx, y + s.fy, 7, 0.3, 1, a);
  if (s.stopped) glowDot(ctx, s.fx, y - 100, 200, 0.4 * seg(t, K(19) + 0.2, K(19) + 0.4), '255,214,90');
  label(ctx, s.stopped ? '目标' : '目标？', s.fx + 20, y - 200 + s.fy, 2, UC.goldL, 0.5, 0, a);
  const jump = t > s.arrive ? Math.round(Math.abs(Math.sin((t - s.arrive) * 7)) * 8 * (1 - seg(t, s.arrive, s.arrive + 1.6))) * 6 : 0;
  spr(ctx, IMG['q_hero_' + (s.moving ? 4 + (Math.floor(t * 6) & 1) : 4)], s.hx, y - jump, 6, 0.5, 1, a);
  if (t > s.arrive) coinScreen(s.fx, y - 160, (t - s.arrive) % 1.2);
  counterTag(ctx, `目标挪动  [${s.j}]  次`, W / 2, 76, a * (1 - seg(t, s.arrive, s.arrive + 0.3)));
  if (t > s.arrive) { statusTag(ctx, s.fx + 20, y - 300, '够了', t - s.arrive, { bad: false, sub: '终点线停下来了' }); ping(ctx, s.fx, y - 80, seg(t, s.arrive, s.arrive + 0.7), 40, 220); }
}

// ---------- 第三关①：巴菲特的身家曲线 ----------
const RATE = 0.134, wealth = a => (Math.exp(RATE * (a - 10)) - 1) / (Math.exp(RATE * 82) - 1);   // 10→92 岁，65 岁时只占约 3%
function sChart(t) {
  const t0 = A(21) - 0.3, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 150, cy: 96, z: 1.12 }, { t: 11, cx: 172, cy: 86, z: 1.24 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  darken(0.38);
  const px0 = 440, px1 = 1500, py0 = 720, py1 = 250, ax = a => lerp(px0, px1, (a - 10) / 82), wy = a => lerp(py0, py1, wealth(a));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pk = popIn(ctx, W / 2, 480, L, 0.28); ctx.translate(-W / 2, -480);
  panel(ctx, 300, 150, 1320, 680, 4, 'rgba(14,18,34,0.95)');
  ctx.fillStyle = '#4a5270'; ctx.fillRect(px0, py0, px1 - px0 + 30, 6); ctx.fillRect(px0 - 6, py1 - 30, 6, py0 - py1 + 36);
  const hi = seg(t, K(21) - 0.1, K(21) + 0.3);
  // 念到「65岁以后」时曲线刚好走到 65 岁，之后一口气冲上去
  const aMax = t < K(21) ? lerp(10, 65, ease(seg(t, A(21) + 0.2, K(21)))) : lerp(65, 92, easeOut(seg(t, K(21), E(21) + 0.2)));
  for (let a = 10; a <= aMax; a += 0.5) { const x = Math.round(ax(a) / 6) * 6; ctx.fillStyle = a >= 65 ? `rgba(242,193,78,${0.1 + 0.18 * hi})` : 'rgba(111,168,255,0.10)'; ctx.fillRect(x, wy(a), 6, py0 - wy(a)); }
  if (hi > 0) { ctx.fillStyle = `rgba(255,241,168,${hi})`; for (let y = py1 - 20; y < py0; y += 24) ctx.fillRect(Math.round(ax(65)), y, 6, 12); }
  for (let a = 10; a <= aMax; a += 0.2) { const x = Math.round(ax(a) / 6) * 6, y = Math.round(wy(a) / 6) * 6; ctx.fillStyle = UC.ink; ctx.fillRect(x - 6, y - 6, 18, 18); ctx.fillStyle = a >= 65 && hi > 0.5 ? UC.goldL : UC.gold; ctx.fillRect(x - 3, y - 3, 12, 12); }
  const rain = seg(t, K(21) + 0.3, K(21) + 0.8);                     // 65 岁以后那块一直往下掉金币
  for (let i = 0; i < 26 && rain > 0; i++) {
    const a = lerp(66, 91, rnd(i * 7 + 2)), ph = (t * (0.5 + rnd(i) * 0.4) + rnd(i * 3)) % 1, x = Math.round(ax(a) / 6) * 6, y = Math.round(lerp(py1 - 60, py0 - 18, ph) / 6) * 6;
    if (a > aMax) continue;
    ctx.globalAlpha = rain * (1 - ph * 0.5); ctx.fillStyle = '#9a6a16'; ctx.fillRect(x, y, 18, 18); ctx.fillStyle = UC.gold; ctx.fillRect(x, y, 12, 12); ctx.globalAlpha = 1;
  }
  glowDot(ctx, ax(aMax), wy(aMax), 150, (0.45 + 0.2 * Math.sin(t * 8)) * clamp(L * 2));
  const tg = seg(t, K(22) - 0.1, K(22) + 0.3);                       // 秘诀是时间：横轴发光
  if (tg > 0) { ctx.fillStyle = `rgba(255,214,102,${tg})`; ctx.fillRect(px0, py0, px1 - px0 + 30, 6); }
  ctx.restore();
  if (pk.k < 1) return;
  label(ctx, '身家', px0 - 20, py1 - 70, 2, '#aab2c8', 0, 0, 1, null);
  label(ctx, tg > 0.5 ? '时间 →' : '年龄 →', px1 + 30, py0 + 62, 3, tg > 0.5 ? UC.kw : '#aab2c8', 1, 0, 1, null);
  for (const a of [10, 30, 50, 65, 90]) label(ctx, `${a}岁`, ax(a), py0 + 24, 2, a === 65 && hi > 0.5 ? UC.goldL : '#8d8f96', 0.5, 0, 1, null);
  if (hi > 0.5) label(ctx, '[九成多]', ax(79), lerp(py0, py1, 0.42), 4, '#ffffff', 0.5, 0, hi, null);
  counterTag(ctx, `身家  [${fmt(845 * wealth(aMax))}]  亿美元`, W / 2, 76, 1);
  const wk = seg(t, A(22) + 0.2, E(22) + 0.2), oa = ease(wk);       // 十岁开始，一直没离场：老爷爷沿着时间轴走到底
  if (t > A(22)) {
    spr(ctx, IMG.m_people2_2, lerp(ax(10), ax(90), oa), py0, 4, 0.5, 1, seg(t, A(22), A(22) + 0.3));
    valueTag(ctx, '十岁开始', ax(10) + 10, py0 - 170, t - (A(22) + 0.4), 2);
  }
}

// ---------- 第三关②：牌桌上活到最后 → 别押上全部 ----------
const TABLE_NPC = [[178, 1], [198, 3], [218, 5], [238, 8]];
function sTable(t) {
  const t0 = A(23) - 0.3, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 178, cy: 120, z: 1.7 }, { t: 5, cx: 174, cy: 116, z: 1.52 }, { t: 10, cx: 164, cy: 110, z: 1.34 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0);
  let gone = 0;
  TABLE_NPC.forEach(([x, f], i) => {
    const tl = A(23) + 0.15 + i * 0.4, k = seg(t, tl, tl + 0.5); if (k > 0) gone++;
    if (k < 1) { actor(octx, 'ck_npcs', f, x + k * 40, 150, false, 1 - k); if (k > 0) emote(octx, 'x', x + k * 40, 108, 1 - k); }
  });
  octx.fillStyle = '#1a120c'; octx.fillRect(138, 128, 112, 9); octx.fillStyle = '#2f6b3a'; octx.fillRect(139, 128, 110, 6); octx.fillStyle = '#4c8f55'; octx.fillRect(139, 128, 110, 1);
  octx.fillStyle = '#3a2412'; octx.fillRect(144, 137, 4, 15); octx.fillRect(240, 137, 4, 15);
  for (let i = 0; i < 4; i++) { octx.fillStyle = ['#d8443a', '#f2c14e', '#6fa8ff', '#f6f1e4'][i]; octx.fillRect(196 + i * 5, 125 - (i & 1), 4, 3); }
  actor(octx, 'm_people2', 3, 128, 152);
  endWorld(); studyPost(L); studyGlow(cam, t);
  counterTag(ctx, `牌桌上还剩  [${1 + TABLE_NPC.length - gone}]  人`, W / 2, 76, seg(t, t0, t0 + 0.3) * (1 - seg(t, A(24) - 0.2, A(24) + 0.1)));
  const [ox, oy] = w2s(cam, 128, 110);
  if (t > K(23) && t < A(24) + 0.2) statusTag(ctx, ox, oy - 40, '活下来', t - K(23), { bad: false, sub: '时间站在他这边' });
  darken(0.3 * seg(t, A(24) - 0.1, A(24) + 0.2));
  const hov = t > A(24) + 0.8 && t < K(24) - 0.5;                      // 先在「全押」上犹豫（红光闪），再挪到「留出余地」
  const boxes = choiceDialog(ctx, W / 2, 400, '押上全部？', ['全押', '留出余地'], t > K(24) ? 1 : hov ? 0 : -1, t - (A(24) + 0.05), { w: 760 });
  if (boxes) {
    if (hov) glowDot(ctx, boxes[0][0], boxes[0][1], 260, 0.35 + 0.25 * Math.sin(t * 10), '255,70,50');
    const k1 = ease(seg(t, A(24) + 0.3, A(24) + 0.8)), k2 = ease(seg(t, K(24) - 0.5, K(24)));
    const x = lerp(lerp(W / 2 + 120, boxes[0][0] + 60, k1), boxes[1][0] + 60, k2) + (hov ? Math.sin(t * 7) * 10 : 0), y = lerp(lerp(640, boxes[0][1] + 10, k1), boxes[1][1] + 10, k2);
    cursorPx(ctx, x, y, t > K(24) && t < K(24) + 0.15 ? 1 : 0);
  }
}

// ---------- 隐藏关：自由（金钱的最高红利）----------
function platform(g, x, y, w) {
  g.fillStyle = '#07080d'; g.fillRect(x - w / 2, y, w, 7); g.fillStyle = '#6e4a12'; g.fillRect(x - w / 2 + 1, y + 1, w - 2, 5);
  g.fillStyle = '#f2c14e'; g.fillRect(x - w / 2 + 1, y + 1, w - 2, 1);
  for (let i = 0; i < 3; i++) g.fillRect(x - 8 + i * 6, y + 7, 3, 2 + (i & 1));
}
function sHidden(t) {
  const t0 = A(25) - 0.4, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 150, cy: 96, z: 1.06 }, { t: A(29) - t0, cx: 170, cy: 88, z: 1.2 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_sky'), 0, 0); driftClouds(octx, L, 70, 12, 'none', 0.75);
  const bob = Math.round(Math.sin(L * 1.4) * 1.5);
  platform(octx, 160, 146 + bob, 40); actor(octx, 'pk_guy', 0, 160, 147 + bob);
  endWorld();
  postG(ctx, L, off, { bloom: 0.35, sat: 1.05, tint: 'rgba(255,200,160,0.12)', vig: 'rgba(60,30,70,0.3)' });
  toast(ctx, '隐藏关已解锁', '金钱的最高红利', t - (K(25) + 0.1), seg(t, A(26) - 0.3, A(26) + 0.1));
  const slide = easeOut(seg(t, A(27) - 0.1, A(27) + 0.4));          // 念「想做什么」时，卡片挪到左边、清单出在右边
  faded(ctx, 1 - seg(t, A(29) - 0.6, A(29) - 0.3), () => {
    itemCard(ctx, lerp(W / 2, 470, slide), 480, t - (K(26) - 0.05), '自由', 5, P(4), { iconRot: 0, iconScale: 7, head: '最贵的东西', kind: '买回你的时间', ribbon: '#9a6a16' });
    ping(ctx, W / 2, 480, seg(t, K(26) - 0.05, K(26) + 0.7), 140, 260);
  });
  faded(ctx, 1 - seg(t, A(29) - 0.6, A(29) - 0.3), () => {
    const d = E(27) - A(27);
    const rows = [['想做什么就做什么', A(27) + 0.1], ['想和谁在一起就和谁在一起', A(27) + d * 0.32], ['想多久就多久', K(27)]].map(([s, ta]) => ({ text: s, owner: 'me', a: seg(t, ta, ta + 0.2), done: seg(t, ta + 0.3, ta + 0.45) }));
    questLog(ctx, 860, 280, 920, rows, { L: t - (A(27) + 0.2), title: '时间自由', rowH: 76 });
  });
  toast(ctx, '成就达成', '金钱的最高红利 · 时间自由', t - (K(28) - 0.1), seg(t, A(29) - 0.6, A(29) - 0.3));
}

// ---------- 终章：两位玩家 → 道具「够了」→ 评论 / 组队 ----------
function sEnd(t) {
  const t0 = A(29) - 0.3, L = t - t0, cam = fit(camKeys([{ t: 0, cx: 142, cy: 120, z: 1.42 }, { t: A(33) - t0, cx: 140, cy: 120, z: 1.5 }, { t: DUR - t0, cx: 140, cy: 126, z: 1.8 }], L));
  beginWorld(cam); octx.drawImage(SP('m_city'), 0, 0);
  actor(octx, 'm_people', 3, EX, G, true); actor(octx, 'm_people', 1, WX, G);
  if (t > K(31)) coinBurst(octx, WX - 10, G - 20, (t - K(31)) % 1.4, 12);
  endWorld(); cityPost(L);
  const [wx, wy] = w2s(cam, WX, G - 42), [ex, ey] = w2s(cam, EX, G - 42);
  faded(ctx, 1 - seg(t, K(32) - 0.3, K(32)), () => {
    if (t < K(30)) { valueTag(ctx, '加油站工人', wx, wy, t - (A(29) + 0.2), 3, '#8a8f9e'); valueTag(ctx, '华尔街高管', ex, ey, t - (A(29) + 0.4)); }
    if (t > K(30)) statusTag(ctx, ex, ey - 20, '清零', t - K(30), { bad: true, sub: '装备闪亮' });
    if (t > K(31)) statusTag(ctx, wx, wy - 20, '满背包金币', t - K(31), { bad: false, sub: '看起来什么都没有' });
  });
  darken((0.5 - 0.2 * seg(t, A(33) - 0.2, A(33) + 0.3)) * seg(t, K(32) - 0.2, K(32) + 0.2));
  faded(ctx, 1 - seg(t, A(33) - 0.2, A(33) + 0.1), () => {
    itemCard(ctx, W / 2, 500, t - (K(32) - 0.05), '够了', 5, P(3), { iconRot: 0, iconScale: 6, kind: '让终点线停下来', head: '获得道具', ribbon: '#2f7a4a' });
    ping(ctx, W / 2, 500, seg(t, K(32) - 0.05, K(32) + 0.7), 140, 260);
  });
  faded(ctx, 1 - seg(t, A(34) - 0.1, A(34) + 0.2), () => {
    const s = '先带爸妈出去玩一趟，再睡到自然醒', typed = s.slice(0, Math.floor(seg(t, A(33) + 0.8, K(33) + 1.2) * s.length));
    commentBox(ctx, W / 2, 560, '写下你会做的第一件事……', typed, t - A(33));
  });
  const pr = A(34) + 1.2, btn = inviteDialog(ctx, W / 2, 520, EPISODE.channel, t - A(34), t > pr ? 1 : 0, faceOf('pk_guy', 0, 16));
  if (btn) { const k = ease(seg(t, A(34) + 0.4, pr - 0.1)); cursorPx(ctx, lerp(W / 2 + 420, btn[0], k), lerp(820, btn[1], k), t > pr && t < pr + 0.15 ? 1 : 0); }
}

const SCENES = [
  [0, A(5) - 0.3, sCity], [A(5) - 0.3, A(8) - 0.4, sBook],
  [A(8) - 0.4, A(9) - 0.3, t => sceneLevel(t, 0, 8)], [A(9) - 0.3, A(11) - 0.3, sCar], [A(11) - 0.3, A(14) - 0.4, sBag],
  [A(14) - 0.4, A(15) - 0.3, t => sceneLevel(t, 1, 14)], [A(15) - 0.3, K(17) - 0.25, sGupta], [K(17) - 0.25, A(19) - 0.3, sJail], [A(19) - 0.3, A(20) - 0.4, sGoal],
  [A(20) - 0.4, A(21) - 0.3, t => sceneLevel(t, 2, 20)], [A(21) - 0.3, A(23) - 0.3, sChart], [A(23) - 0.3, A(25) - 0.4, sTable],
  [A(25) - 0.4, A(29) - 0.3, sHidden], [A(29) - 0.3, DUR + 1, sEnd],
];
const PK_OPTS = { barFrom: K(7) - 0.2, chapterAt: [[A(8) - 0.4, 0], [A(14) - 0.4, 1], [A(20) - 0.4, 2], [A(25) - 0.4, 3]] };
