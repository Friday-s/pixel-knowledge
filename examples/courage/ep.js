// 《被讨厌的勇气》本集场景 —— 只用模板层（ui.js / pklib.js）的组件 + 本集素材；所有时刻挂在旁白句子上（A/E/K）。
// 序章 小镇任务栏 → 技能书 → 第一关 卧室（目的论）→ 第二关 课题分离 + 河边的马 → 还任务 → 第三关 十个人 → 终章 山顶 + 任务栏回扣 + 评论/组队
'use strict';

const TOWN_Y = 160;
const QUESTS = [
  ['让爸妈满意', 'other', '爸妈的'], ['让老板认可', 'other', '老板的'], ['让所有人喜欢我', 'other', '大家的'], ['秒回所有消息', 'other', '别人的'],
  ['读完一本书', 'me', '我的'], ['别让同学失望', 'other', '同学的'], ['每天锻炼', 'me', '我的'], ['考个好成绩', 'me', '我的'],
];
const GIVERS = [[0, 74], [1, 104], [2, 134], [4, 164], [3, 194]];     // [路人序号, x]
const tQuest = i => 0.9 + i * 0.85;
const heroX0 = t => 40 + 15 * Math.min(t, A(3));
const KEY_ICON = () => iconCanvas(['.YYY........', 'Y...Y.......', 'Y.D.YYYYYYYY', 'Y...Y...Y.Y.', '.YYY....Y.Y.'], { Y: '#f2c14e', D: '#7a4a10' });
const HEART_ICON = () => iconCanvas(['.RR.RR.', 'RPRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#e8475a', P: '#ffb3c0' });
const heroHUD = (t, n, hp, k, o = {}) => hud(ctx, k, {
  name: '你', lv: 'Lv 1', bar: hp, barCol: hp < 0.35 ? '#e04a3a' : UC.green, barBg: '#2a1010',
  line2: `任务 ${n} · 负重 ${Math.min(100, Math.round(n * 11))}%`, face: faceOf('pk_guy', 0, 16), y: o.y ?? 40, flash: o.flash || 0,
});
// carryHero / carryAnchor（背东西的主角）已收进模板 pklib.js
const townPost = L => postG(ctx, L, off, { bloom: 0.22, sat: 1.0, vig: 'rgba(30,20,10,0.35)' });

// ---------- 序章：小镇，任务越背越多 ----------
function sTown0(t) {
  const walking = t < A(3), hx = heroX0(t);
  const cam = drift({ cx: clamp(hx + 24, 119, 201), cy: 112, z: 1.35 + 0.08 * seg(t, A(3), A(5)) }, t);
  const n = QUESTS.filter((_, i) => t >= tQuest(i) + 0.45).length;
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  GIVERS.forEach(([ni, x], i) => {
    actor(octx, 'ck_npcs', ni, x, 150);
    QUESTS.forEach((q, qi) => { if (qi % 5 === i && t > tQuest(qi) - 0.6 && t < tQuest(qi)) emote(octx, 'bang', x, 150 - 40); });
  });
  QUESTS.forEach((q, qi) => {                                  // 卷轴从路人头顶飞到背上
    const k = seg(t, tQuest(qi), tQuest(qi) + 0.45); if (k <= 0 || k >= 1) return;
    const [ni, gx] = GIVERS[qi % 5], [tx, ty0] = carryAnchor(hx, TOWN_Y, qi + 1), ty = ty0 - 4 - qi * 4;
    sprRot(octx, SP('ck_scroll'), lerp(gx, tx, k), lerp(150 - 42, ty, k) - Math.sin(k * Math.PI) * 18, 11, 3, k * 6);
  });
  carryHero(octx, hx, TOWN_Y, n, t, walking, n >= 4 ? 3 : 5);
  endWorld(); townPost(t);
  const hp = clamp(1 - n * 0.05 - 0.48 * seg(t, A(2), E(2))), extra = Math.floor(22 * seg(t, A(2), E(2)));
  heroHUD(t, n + extra, hp, seg(t, 0.6, 1.0), { flash: 0.6 * (1 - seg(t, K(2), K(2) + 0.5)) * (t > K(2) ? 1 : 0) });
  const rows = QUESTS.map((q, i) => ({ text: q[0], owner: t > K(4) ? q[1] : 'me', a: seg(t, tQuest(i) + 0.3, tQuest(i) + 0.5), tag: q[1] === 'other' ? '别人的' : null, tagK: seg(t, K(4) + i * 0.12, K(4) + i * 0.12 + 0.25) }));
  questLog(ctx, 1220, 150, 640, rows, { L: t - 1.0, title: '任务栏', count: n + extra, countCol: extra > 10 ? '#ff5a4a' : UC.kw });
}

// ---------- 技能书：《被讨厌的勇气》 + 五个晚上 + 三招 ----------
function triCard(g, cx, cy, L, i, title) {
  if (L < 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); popIn(g, cx, cy, L, 0.25); g.translate(-190, -110);
  panel(g, 0, 0, 380, 220, 4, 'rgba(14,18,34,0.96)'); g.restore();
  if (L > 0.25) { label(g, `第${CN[i]}招`, cx, cy - 76, 3, UC.goldL, 0.5, 0, 1, null); label(g, title, cx, cy - 4, 4, '#ffffff', 0.5, 0, 1, null); }
}
function sBook(t) {
  const t0 = A(5) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 12, cx: 160, cy: 88, z: 1.08 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  const tc = K(5) - 0.05;
  faded(ctx, 1 - seg(t, A(6) - 0.1, A(6) + 0.25), () => {
    bookReveal(ctx, 690, 468, SP('book_real'), t - tc, { head: '获得技能书', name: '被讨厌的勇气', rank: 5, kind: '传说 · 心理学', sub: '岸见一郎 / 古贺史健' });
    ping(ctx, 690, 468, seg(t, tc, tc + 0.8), 220, 300);
  });
  faded(ctx, 1 - seg(t, A(7) - 0.1, A(7) + 0.25), () => moons(ctx, W / 2, 430, 5, 5 * seg(t, K(6) - 0.5, E(6) - 0.2), t - A(6) - 0.15));
  for (let i = 0; i < 3; i++) triCard(ctx, W / 2 + (i - 1) * 440, 470, t - (K(7) + i * 0.22), i, EPISODE.chapters[i]);
}

// ---------- 第一关：卧室（目的论 → 读档重来）----------
function sRoom(t) {
  const t0 = A(9) - 0.3, L = t - t0, tOpen = K(16) + 0.45;
  const cam = camKeys([{ t: 0, cx: 160, cy: 96, z: 1.02 }, { t: A(11) - t0, cx: 168, cy: 116, z: 1.4 }, { t: tOpen - t0, cx: 168, cy: 116, z: 1.45 },
    { t: tOpen + 1.0 - t0, cx: 160, cy: 100, z: 1.08, ease: 'out' }, { t: 40, cx: 160, cy: 100, z: 1.1 }], L);
  const open = seg(t, tOpen, tOpen + 0.6), up = t >= tOpen + 0.2;
  beginWorld(cam); bgCross(octx, 'ck_bedroom', 'ck_bedroom_open', open);
  actor(octx, 'ck_hero', up ? 5 : 4, 170, 160);
  if (t > A(10) && t < A(11) - 0.1) worldBubble(octx, 148, 134, '心慌…');
  endWorld();
  postG(ctx, L, off, { bloom: lerp(0.2, 0.42, open), sat: 0.95, tint: open < 0.5 ? 'rgba(70,90,170,0.28)' : 'rgba(255,190,120,0.22)', vig: 'rgba(6,8,20,0.55)' });
  const [lx, ly] = w2s(cam, 113, 66); glowDot(ctx, lx, ly, 260 * cam.z, 0.35 * (1 - open));
  if (open > 0) { const [dx, dy] = w2s(cam, 268, 90); glowDot(ctx, dx, dy, 700, 0.5 * open, '255,220,150'); }
  flashW(ctx, 0.7 * (1 - seg(t, tOpen, tOpen + 0.5)) * (t > tOpen ? 1 : 0), '255,240,210');
  const [hx, hy] = w2s(cam, 170, up ? 118 : 130);
  // 闭门天数
  faded(ctx, seg(t, A(9) + 0.3, A(9) + 0.6) * (1 - seg(t, A(10), A(10) + 0.3)), () => counterTag(ctx, `闭门不出  [${fmt(1 + 1094 * Math.pow(seg(t, A(9) + 0.4, E(9)), 2))}]  天`, W / 2, 84, 1));
  // 焦虑 debuff：先出现一次；选「不出门」之后再「装备」上去；开门后消失
  const deb1 = t > K(10) - 0.1 && t < A(11) - 0.1, deb2 = t > K(13) && t < tOpen + 0.2;
  if (deb1) statusTag(ctx, hx + 150, hy - 90, '焦虑', t - (K(10) - 0.1), { sub: '出门 -100%' });
  if (deb2) faded(ctx, 1 - seg(t, tOpen - 0.2, tOpen + 0.2), () => statusTag(ctx, hx, hy - 70, '焦虑', t - K(13), { sub: '已装备 · 当理由', subK: seg(t, K(13) + 0.3, K(13) + 0.6) }));
  if (t > tOpen + 0.4) statusTag(ctx, hx, hy - 70, '勇气', t - (tOpen + 0.4), { bad: false, sub: '读档成功' });
  // 原因论 ⇄ 目的论
  faded(ctx, 1 - seg(t, A(13) - 0.15, A(13) + 0.1), () => {
    const flip = seg(t, K(12), K(12) + 0.6);
    flowCard(ctx, W / 2, 300, '焦虑', '不出门', t - A(11), { title: flip < 0.5 ? '原因论 · 我们以为的' : '目的论 · 阿德勒说的', flip, colA: '#d8443a', colB: '#6fa8ff' });
  });
  // 要出门吗？
  faded(ctx, 1 - seg(t, K(13) - 0.35, K(13) - 0.05), () => {
    const tm = A(13) + 0.6, pr = A(13) + 1.45, sel = t > tm + 0.5 ? 1 : 0;
    const boxes = choiceDialog(ctx, W / 2, 330, '要出门吗？', ['出门', '不出门'], sel, t - A(13));
    if (boxes) { const k = ease(seg(t, tm, tm + 0.6)); cursorPx(ctx, lerp(boxes[0][0], boxes[1][0], k) + 30, lerp(boxes[0][1], boxes[1][1], k) + 10, t > pr && t < pr + 0.15 ? 1 : 0); }
  });
  // 心法卡 / 名言卡 / 存档
  faded(ctx, 1 - seg(t, A(15) - 0.15, A(15) + 0.1), () => quoteCard(ctx, W / 2, 330, ['原因论：过去 → 推着你走', '[目的论]：想要的 → 拉着你走'], null, t - A(14)));
  faded(ctx, 1 - seg(t, A(16) - 0.15, A(16) + 0.1), () => quoteCard(ctx, W / 2, 330, ['决定我们自身的，不是过去的经历，', '而是我们自己赋予经历的[意义]。'], '——《被讨厌的勇气》· 第一夜', t - A(15), { s: 3 }));
  faded(ctx, 1 - seg(t, tOpen - 0.2, tOpen + 0.1), () => {
    const sel = t < A(16) + 0.55 ? 0 : t < K(16) ? 1 : 2;
    const pos = saveMenu(ctx, W / 2, 360, ['第 1 年 · 出事那天', '第 3 年 · 还是不出门', '今天 · 新的存档'], sel, t - A(16));
    if (pos) cursorPx(ctx, pos[sel][0], pos[sel][1], t > K(16) + 0.2 && t < K(16) + 0.35 ? 1 : 0);
  });
}

// ---------- 第二关：人际关系 → 课题分离 ----------
const SPLIT = [['要不要学习', 'me', '我来扛'], ['爸妈生不生气', 'other', '爸妈的'], ['同学喜不喜欢我', 'other', '同学的'], ['老板认不认可', 'other', '老板的'], ['每天锻炼', 'me', '我的'], ['读完一本书', 'me', '我的']];
const PEOPLE = [[0, 66], [1, 92], [2, 228], [4, 254]];
function splitRows(t, lockAt) {
  return SPLIT.map((r, i) => {
    let tagAt = r[1] === 'me' ? (i === 0 ? K(21) : E(22) - 0.6 + (i - 4) * 0.25) : A(22) + 0.35 + (i - 1) * 0.6;
    return { text: r[0], owner: t > tagAt ? r[1] : 'me', col: r[1] === 'other' ? seg(t, tagAt, tagAt + 0.5) : 0, tag: r[2], tagK: seg(t, tagAt, tagAt + 0.3), lock: r[1] === 'me' && lockAt ? seg(t, lockAt + i * 0.12, lockAt + i * 0.12 + 0.3) : 0 };
  });
}
function sQuest(t) {
  const t0 = A(18) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 108, z: 1.25 }, { t: 6, cx: 160, cy: 112, z: 1.35 }], L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  const kl = seg(t, K(18) - 0.2, K(18) + 0.6);
  PEOPLE.forEach(([ni, x], i) => {                               // 缠在一起的关系线
    const n = 24, hx = 164, hy = 136;
    octx.fillStyle = 'rgba(255,96,96,0.85)';
    for (let s = 0; s <= n * kl; s++) { const k = s / n, px = lerp(hx, x, k), py = lerp(hy, 122, k) + Math.sin(k * 9 + i * 2 + t * 2) * 5 * Math.sin(k * Math.PI); octx.fillRect(Math.round(px), Math.round(py), 1, 1); }
  });
  PEOPLE.forEach(([ni, x], i) => { actor(octx, 'ck_npcs', ni, x, 150); if (t > K(18) + 0.2 + i * 0.15) emote(octx, ['angry', 'dots', 'angry', 'q'][i], x, 150 - 40); });
  carryHero(octx, 160, TOWN_Y, 8, t, false);
  endWorld(); townPost(L);
  darken(0.55 * seg(t, A(19) - 0.1, A(19) + 0.3));
  faded(ctx, 1 - seg(t, A(20) - 0.15, A(20) + 0.1), () => {
    const tc = K(19) - 0.05;
    itemCard(ctx, W / 2, 500, t - tc, '课题分离', 5, KEY_ICON(), { iconRot: -0.5, iconScale: 11, kind: '核心心法', head: '获得钥匙', ribbon: '#2f7a4a' });
    ping(ctx, W / 2, 500, seg(t, tc, tc + 0.75), 140, 260);
  });
  questLog(ctx, W / 2 - 480, 150, 960, splitRows(t, 0), { L: t - A(20), twoCols: true, title: '后果由谁承担？', left: '我的任务', right: '别人的任务' });
}

// ---------- 河边：可以把马带到水边 ----------
function sRiver(t) {
  const t0 = A(23) - 0.3, L = t - t0, p = easeOut(seg(t, t0, A(23) + 1.8)), refuse = t >= K(23);
  const hx = lerp(46, 126, p), mx = lerp(88, 166, p);
  const cam = drift({ cx: clamp(lerp(hx, mx, 0.5) + 10, 119, 201), cy: 112, z: 1.35 }, L);
  beginWorld(cam); octx.drawImage(SP('ck_river'), 0, 0);
  const hm = IMG['ck_horse_' + (refuse ? 1 : 0)], bob = p < 1 ? (Math.floor(t * 6) & 1) : 0;
  octx.drawImage(hm, Math.round(mx - hm.width / 2), Math.round(156 - hm.height - bob));
  const headX = refuse ? mx - 10 : mx + 12, headY = 156 - 26;
  actor(octx, 'ck_hero', refuse && t > K(23) + 0.4 ? 7 : 6, hx, 158);
  octx.strokeStyle = '#6b4220'; octx.lineWidth = 1; octx.beginPath(); octx.moveTo(hx + 9, 158 - 21); octx.quadraticCurveTo((hx + headX) / 2, 158 - 14 + (refuse ? 0 : 3), headX, headY + 4); octx.stroke();
  if (refuse) emote(octx, 'x', mx - 6, 156 - 36, seg(t, K(23), K(23) + 0.15));
  if (t > K(23) + 0.45) emote(octx, 'q', hx, 158 - 42);
  endWorld();
  postG(ctx, L, off, { bloom: 0.3, sat: 1.02, tint: 'rgba(255,190,150,0.12)', vig: 'rgba(30,20,40,0.35)' });
}

// ---------- 别插手 → 把别人的任务还回去 ----------
function sReturn(t) {
  const t0 = A(24) - 0.2, tw = A(25) - 0.2;
  if (t < tw) {
    const L = t - t0, cam = camKeys([{ t: 0, cx: 140, cy: 110, z: 1.3 }, { t: tw - t0, cx: 176, cy: 116, z: 1.6 }], L);
    beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0); GIVERS.forEach(([ni, x], i) => { actor(octx, 'ck_npcs', ni, x, 150); if (t > A(24) + 0.6 + i * 0.2) emote(octx, 'x', x, 150 - 40); }); carryHero(octx, 160, TOWN_Y, 8, t, false); endWorld(); townPost(L);
    darken(0.42);
    questLog(ctx, W / 2 - 480 + Math.sin(L * 0.8) * 6, 150 - 10 * easeOut(seg(t, t0, t0 + 1)), 960, splitRows(1e9, K(24) - 0.2).map((r, i) => ({ ...r, owner: SPLIT[i][1], col: SPLIT[i][1] === 'other' ? 1 : 0, tagK: 1, lock: SPLIT[i][1] === 'me' ? seg(t, K(24) - 0.3 + i * 0.12, K(24) + i * 0.12) : 0 })), { L: 1, twoCols: true, title: '后果由谁承担？' });
    valueTag(ctx, '别插手', W / 2 + 240, 132, t - (A(24) + 0.6), 3, '#d8443a');
    valueTag(ctx, '别让人插手', W / 2 - 240, 132, t - (K(24) - 0.2), 3, UC.gold);
    return;
  }
  const L = t - tw, hx = 70 + 18 * L, drop = K(25) - 0.7;
  const n = 8 - QUESTS.filter((q, i) => q[1] === 'other' && t > drop + i * 0.12 + 0.35).length;
  const light = t > K(25), cam = drift({ cx: clamp(hx + 20, 119, 201), cy: 112, z: 1.35 }, L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  GIVERS.forEach(([ni, x]) => actor(octx, 'ck_npcs', ni, x, 150));
  QUESTS.forEach((q, i) => {                                   // 别人的卷轴飞回去
    if (q[1] !== 'other') return;
    const k = seg(t, drop + i * 0.12, drop + i * 0.12 + 0.6); if (k <= 0 || k >= 1) return;
    const gx = GIVERS[i % 5][1];
    sprRot(octx, SP('ck_scroll'), lerp(hx - 12, gx, k), lerp(TOWN_Y - 30 - i * 3, 150 - 40, k) - Math.sin(k * Math.PI) * 22, 11, 3, -k * 7);
  });
  carryHero(octx, hx, TOWN_Y, n, t, true, 3);
  endWorld(); townPost(L);
  heroHUD(t, n, lerp(0.15, 1, easeOut(seg(t, K(25), K(25) + 0.8))), 1, { y: 76 });
  const [sx, sy] = w2s(cam, hx, TOWN_Y - 46);
  if (light) statusTag(ctx, sx, sy - 40, '轻装', t - K(25), { bad: false, sub: '负重 -60%' });
}

// ---------- 第三关：十个人 ----------
const TEN_X = i => 40 + i * 26.7, HATER = 2, LOVERS = [0, 7];
function sTen(t) {
  const t0 = A(27) - 0.3, L = t - t0, hz = TEN_X(HATER);
  const cam = camKeys([{ t: 0, cx: 160, cy: 102, z: 1.0 }, { t: A(30) - t0, cx: 160, cy: 102, z: 1.04 }, { t: A(30) + 1.1 - t0, cx: hz, cy: 128, z: 2.6 },
    { t: K(30) - t0, cx: hz + 2, cy: 128, z: 2.7 }, { t: K(30) + 0.9 - t0, cx: 160, cy: 102, z: 1.0, ease: 'out' }, { t: 40, cx: 160, cy: 104, z: 1.06 }], L);
  const pin = clamp(seg(t, A(30) + 0.3, A(30) + 1.0) - seg(t, K(30), K(30) + 0.6));
  const calm = seg(t, K(32), K(32) + 0.5), hero = seg(t, A(32) - 0.2, A(32) + 0.3);
  beginWorld(cam, '#07080d');
  octx.fillStyle = '#2a0c14'; octx.fillRect(0, 0, BW, 122); octx.fillStyle = '#3a1220'; for (let x = 0; x < BW; x += 9) octx.fillRect(x, 0, 3, 122);
  octx.fillStyle = '#121626'; octx.fillRect(0, 122, BW, 58); octx.fillStyle = '#1a2034'; for (let y = 126; y < 180; y += 7) octx.fillRect(0, y, BW, 1);
  for (let i = 0; i < 10; i++) {
    const dim = i === HATER ? 0 : pin * 0.75;
    octx.globalAlpha = 1 - dim; actor(octx, 'ck_npcs', i, TEN_X(i), 150); octx.globalAlpha = 1;
    const e = i === HATER ? (t > K(27) ? 'angry' : null) : LOVERS.includes(i) ? (t > A(29) + 1.6 ? 'heart' : null) : (t > K(29) ? 'dots' : null);
    const ea = i === HATER ? 1 : 1 - calm;
    if (e) emote(octx, e, TEN_X(i), 150 - 40, ea * (1 - dim));
  }
  if (hero > 0) { octx.globalAlpha = hero; actor(octx, 'pk_guy', 0, 160, 162); octx.globalAlpha = 1; }
  endWorld();
  postG(ctx, L, off, { bloom: 0.28, sat: 1.0, vig: 'rgba(0,0,0,0.7)' });
  for (let i = 0; i < 10; i++) {                                // 顶光
    const [sx, sy] = w2s(cam, TEN_X(i), 128), hot = i === HATER ? seg(t, A(29) + 0.5, A(29) + 0.8) : LOVERS.includes(i) ? seg(t, A(29) + 1.6, A(29) + 1.9) + 0.6 * seg(t, K(30) + 0.4, K(30) + 0.9) : 0;
    glowDot(ctx, sx, sy, 150 * cam.z, (0.12 + 0.35 * hot) * (i === HATER ? 1 : 1 - pin), i === HATER && hot > 0 ? '255,80,70' : LOVERS.includes(i) && hot > 0 ? '255,140,170' : '255,220,170');
  }
  const [b0x, b0y] = w2s(cam, TEN_X(0) - 12, 104), [b1x, b1y] = w2s(cam, TEN_X(9) + 12, 154);
  brackets(ctx, b0x, b0y, b1x - b0x, b1y - b0y, seg(t, K(28), K(28) + 0.3) * (1 - seg(t, A(29) + 0.2, A(29) + 0.5)));
  faded(ctx, seg(t, A(29) + 0.4, A(29) + 0.7) * (1 - seg(t, A(31) - 0.1, A(31) + 0.2)), () => {
    counterTag(ctx, '讨厌你  [1]', W / 2 - 420, 84, seg(t, A(29) + 0.5, A(29) + 0.8));
    counterTag(ctx, '喜欢你  [2]', W / 2, 84, seg(t, A(29) + 1.6, A(29) + 1.9));
    counterTag(ctx, '无所谓  [7]', W / 2 + 420, 84, seg(t, K(29), K(29) + 0.3));
  });
  const [hx, hy] = w2s(cam, hz, 104);
  if (pin > 0) brackets(ctx, hx - 70, hy - 30, 140, 260, pin, '#ff6a5a');
  darken(0.6 * seg(t, A(31) - 0.1, A(31) + 0.2) * (1 - seg(t, A(32) - 0.2, A(32) + 0.1)));
  faded(ctx, 1 - seg(t, A(32) - 0.2, A(32) + 0.1), () => quoteCard(ctx, W / 2, 400, ['所谓自由，', '就是被别人[讨厌]。'], '——《被讨厌的勇气》· 第三夜', t - A(31)));
  const [gx, gy] = w2s(cam, 160, 126);
  if (t > K(32)) statusTag(ctx, gx, gy - 60, '不再讨好', t - K(32), { bad: false });
  if (t > K(33) - 0.1) valueTag(ctx, '代价  [-1] 好感', hx, hy - 20, t - (K(33) - 0.1), 3, '#d8443a');
}

// ---------- 终章：山顶的贡献感 → 回到任务栏 → 评论 / 组队 ----------
function sHill(t) {
  const t0 = A(34) - 0.4, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 70, z: 1.3 }, { t: 2.6, cx: 170, cy: 96, z: 1.06, ease: 'out' }, { t: 12, cx: 176, cy: 98, z: 1.12 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_sky'), 0, 0); driftClouds(octx, t, 50, 3, 'none', 0.85);
  octx.fillStyle = '#c9d6f2'; octx.beginPath(); octx.moveTo(110, 180); octx.lineTo(170, 140); octx.lineTo(200, 130); octx.lineTo(280, 129); octx.lineTo(320, 136); octx.lineTo(320, 180); octx.fill();
  octx.fillStyle = '#f4f7ff'; octx.beginPath(); octx.moveTo(130, 180); octx.lineTo(178, 143); octx.lineTo(206, 134); octx.lineTo(278, 133); octx.lineTo(320, 140); octx.lineTo(320, 180); octx.fill();
  actor(octx, 'ck_hero', 5, 236, 134);
  for (let i = 0; i < 12 && t > K(36); i++) { const ph = ((t - K(36)) * 0.5 + rnd(i)) % 1; emote(octx, 'heart', 236 + (rnd(i * 7) - 0.5) * 50, 110 - ph * 50, (1 - ph) * seg(t, K(36), K(36) + 0.3)); }
  endWorld();
  postG(ctx, L, off, { bloom: 0.4, sat: 1.03, vig: 'rgba(40,20,30,0.35)' });
  const [sx, sy] = w2s(cam, 93, 54); glowDot(ctx, sx, sy, 520, 0.42);
  const tc = K(35) - 0.05;
  faded(ctx, 1 - seg(t, A(37) - 0.5, A(37) - 0.2), () => {
    itemCard(ctx, 620, 480, t - tc, '贡献感', 5, HEART_ICON(), { iconRot: 0, iconScale: 18, kind: '幸福的来源', head: '解锁', ribbon: '#c0392b' });
    ping(ctx, 620, 480, seg(t, tc, tc + 0.75), 140, 260);
  });
  const [hx, hy] = w2s(cam, 236, 96);
  if (t > K(36)) statusTag(ctx, hx, hy - 30, '对别人有用', t - K(36), { bad: false });
}
const MINE = ['读完一本书', '今天出门走走', '帮朋友一个忙'];
function sEnd(t) {
  const t0 = A(37) - 0.2, L = t - t0, cam = drift({ cx: 160, cy: 112, z: 1.3 + 0.04 * seg(t, t0, DUR) }, L);
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  GIVERS.forEach(([ni, x], i) => { actor(octx, 'ck_npcs', ni, x + (x > 150 ? 40 : -10), 150); });
  carryHero(octx, 150, TOWN_Y, 3, t, false);
  endWorld(); townPost(L);
  heroHUD(t, 3, 1, 1, { y: 76 });
  faded(ctx, 1 - seg(t, A(39) - 0.1, A(39) + 0.25), () => {
    const rows = MINE.map((m, i) => ({ text: m, owner: 'me', done: seg(t, K(38) + i * 0.25, K(38) + i * 0.25 + 0.2), tag: '我选的', tagK: seg(t, K(38) + i * 0.25, K(38) + i * 0.25 + 0.3) }));
    questLog(ctx, 1180, 170, 680, rows, { L: t - (A(37) + 0.1), title: '任务栏', count: 3 });
  });
  toast(ctx, '成就解锁', '被讨厌的勇气', t - (K(38) + 0.4), seg(t, A(39) + 0.4, A(39) + 0.8));
  faded(ctx, 1 - seg(t, A(40) - 0.1, A(40) + 0.2), () => {
    const typed = '把「让所有人都满意」还回去'.slice(0, Math.floor(seg(t, K(39) + 0.2, K(39) + 2.0) * 13));
    commentBox(ctx, W / 2, 560, '写下你最想还回去的那个任务……', typed, t - A(39));
  });
  const pr = A(40) + 1.2, btn = inviteDialog(ctx, W / 2, 520, EPISODE.channel, t - A(40), t > pr ? 1 : 0, faceOf('pk_guy', 0, 16));
  if (btn) { const k = ease(seg(t, A(40) + 0.4, pr - 0.1)); cursorPx(ctx, lerp(W / 2 + 420, btn[0], k), lerp(820, btn[1], k), t > pr && t < pr + 0.15 ? 1 : 0); }
}

const SCENES = [
  [0, A(5) - 0.3, sTown0], [A(5) - 0.3, A(8) - 0.4, sBook], [A(8) - 0.4, A(9) - 0.3, t => sceneLevel(t, 0, 8)],
  [A(9) - 0.3, A(17) - 0.4, sRoom], [A(17) - 0.4, A(18) - 0.3, t => sceneLevel(t, 1, 17)], [A(18) - 0.3, A(23) - 0.3, sQuest],
  [A(23) - 0.3, A(24) - 0.2, sRiver], [A(24) - 0.2, A(26) - 0.4, sReturn], [A(26) - 0.4, A(27) - 0.3, t => sceneLevel(t, 2, 26)],
  [A(27) - 0.3, A(34) - 0.4, sTen], [A(34) - 0.4, A(37) - 0.2, sHill], [A(37) - 0.2, DUR + 1, sEnd],
];
const PK_OPTS = { barFrom: K(7) - 0.2, chapterAt: [[A(8) - 0.4, 0], [A(17) - 0.4, 1], [A(26) - 0.4, 2], [A(34) - 0.4, 3]] };
