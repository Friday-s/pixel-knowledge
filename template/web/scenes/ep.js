// 本集场景（起步骨架）：只用素材库，按文稿锚句自动排好「钩子 → 技能书 → 关卡卡 + 每关正文 → 隐藏关 → 终章」，什么都不改也能出片。
// 真正做一集时：把每个 TODO 场景换成本书的隐喻画面（一句话一个画面、念到关键词时画面里正好发生那件事），
// 写法看 references/scene-recipes.md 和 examples/*/ep.js。时间一律挂在句子上：A(i) 句首 / E(i) 句尾 / K(i) 关键词 / KW(i) 关键词文字。
'use strict';

const M = pkMarks();                                   // M.book / M.levels[] / M.hidden / M.outro / M.item / M.comment / M.follow
const BOOK = Object.assign({ name: EPISODE.title, author: '', kind: '传说 · 好书' }, EPISODE.book || {});
const REPLY = '……';                                    // TODO 终章评论框里打出来的示例回答（贴合本集提问）
const N = NARR.length, lastLv = M.levels[M.levels.length - 1];
const chapEnd = ci => ci < M.levels.length - 1 ? M.levels[ci + 1] : (M.hidden >= 0 ? M.hidden : M.outro);   // 第 ci 关正文的下一句
const GROUND = { ck_town: 160, ck_river: 158, q_dungeon: 152, m_city: 166, pk_study: 152, ck_bedroom: 160 };  // 各背景的脚底线
const townPost = L => postG(ctx, L, off, { bloom: 0.22, sat: 1.0, vig: 'rgba(30,20,10,0.35)' });

// ---------- 序章（钩子）TODO：换成本书开头的故事 / 反常识问题 ----------
const HOOK_NPC = [[96, 3], [196, 6], [236, 1], [128, 7], [266, 8]];
function sHook(t) {
  const end = A(M.book) - 0.3, hx = lerp(40, 150, ease(seg(t, 0.3, Math.max(1, end - 1))));
  const cam = fitCam(drift({ cx: hx + 26, cy: 112, z: 1.35 }, t));
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  HOOK_NPC.forEach(([x, f]) => actor(octx, 'ck_npcs', f, x, 150));
  actor(octx, 'ck_hero', t < end - 1 ? Math.floor(t * 5) & 1 : 7, hx, GROUND.ck_town);
  for (let i = 0; i < M.book; i++) if (/[？?]/.test(NARR[i].text) && t > K(i) && t < E(i) + 0.6) emote(octx, 'q', hx, GROUND.ck_town - 40);
  endWorld(); townPost(t);
  for (let i = 0; i < M.book; i++) {                   // 每句的关键词冒在一个路人头上
    if (!KW(i)) continue;
    const [x] = HOOK_NPC[i % HOOK_NPC.length], [sx, sy] = w2s(cam, x, 108);
    faded(ctx, 1 - seg(t, E(i) + 0.4, E(i) + 0.7), () => valueTag(ctx, KW(i), sx, sy, t - K(i)));
  }
}

// ---------- 技能书：真实封面 + 作者那句 + 关卡预告 ----------
function triCard(g, cx, cy, L, i, title) {
  if (L < 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); popIn(g, cx, cy, L, 0.25); g.translate(-190, -110);
  panel(g, 0, 0, 380, 220, 4, 'rgba(14,18,34,0.96)'); g.restore();
  if (L > 0.25) { label(g, `第${CN[i]}关`, cx, cy - 76, 3, UC.goldL, 0.5, 0, 1, null); label(g, title, cx, cy - 4, 4, '#ffffff', 0.5, 0, 1, null); }
}
function sBook(t) {
  const t0 = A(M.book) - 0.3, L = t - t0, cam = camKeys([{ t: 0, cx: 160, cy: 92, z: 1.0 }, { t: 12, cx: 160, cy: 88, z: 1.08 }], L);
  beginWorld(cam); octx.drawImage(SP('pk_study'), 0, 0); endWorld(); studyPost(L); studyGlow(cam, t);
  const tc = K(M.book) - 0.05, preview = M.levels[0] - 1, hasQuote = M.book + 1 < preview;
  const slide = hasQuote ? easeOut(seg(t, A(M.book + 1) - 0.2, A(M.book + 1) + 0.4)) : 0;     // 念作者那句时，书挪到左边、金句出在右边
  faded(ctx, 1 - seg(t, A(preview) - 0.1, A(preview) + 0.25), () => {
    bookReveal(ctx, lerp(690, 520, slide), 480, SP('book_real'), t - tc, slide < 0.01 ? { head: '获得技能书', name: BOOK.name, rank: 5, kind: BOOK.kind, sub: BOOK.author } : {});
    ping(ctx, 690, 480, seg(t, tc, tc + 0.8), 220, 300);
    if (hasQuote) {                                    // TODO 换成书里一句真正的金句（两行以内），别照抄旁白
      const q = NARR[M.book + 1].text.replace(/^[^：:]*[：:]/, '').split(/(?<=[，,])/).slice(0, 2);
      quoteCard(ctx, 1330, 470, q, BOOK.author ? '—— ' + BOOK.author.split('/')[0].trim() : '', t - (A(M.book + 1) + 0.2), { s: 4 });
    }
  });
  const n = M.levels.length, gap = n > 3 ? 400 : 440;
  for (let i = 0; i < n; i++) triCard(ctx, W / 2 + (i - (n - 1) / 2) * gap, 470, t - (K(preview) + i * 0.22), i, EPISODE.chapters[i]);
}

// ---------- 每关正文 TODO：每关拆 2–3 个场景，给本关的概念找一个外行认得的形象 ----------
const CH_BG = ['ck_river', 'q_dungeon', 'm_city'];
function sChapter(ci) {
  const l0 = M.levels[ci] + 1, l1 = chapEnd(ci) - 1, bg = CH_BG[ci % CH_BG.length], gy = GROUND[bg];
  return t => {
    const t0 = A(l0) - 0.3, L = t - t0, span = Math.max(1, E(l1) - t0), hx = lerp(40, 270, seg(L, 0, span));
    const cam = fitCam(drift({ cx: hx + 20, cy: 116, z: 1.5 }, L));
    beginWorld(cam); octx.drawImage(SP(bg), 0, 0);
    actor(octx, 'ck_hero', Math.floor(L * 5) & 1, hx, gy);
    endWorld(); postG(ctx, L, off, { bloom: 0.26, sat: 1.0, vig: 'rgba(10,10,30,0.4)' });
    const [sx, sy] = w2s(cam, hx, gy - 44);
    for (let i = l0; i <= l1; i++) if (KW(i)) faded(ctx, 1 - seg(t, E(i) + 0.3, E(i) + 0.6), () => valueTag(ctx, KW(i), sx, sy, t - K(i)));
    const rows = []; for (let i = l0; i <= l1; i++) if (KW(i)) rows.push({ text: KW(i), owner: 'me', a: seg(t, K(i), K(i) + 0.2), done: seg(t, E(i), E(i) + 0.2) });
    questLog(ctx, 1240, 150, 560, rows, { L: t - (A(l0) + 0.3), title: `第${CN[ci]}关 · ${EPISODE.chapters[ci]}`, rowH: 56 });
  };
}

// ---------- 隐藏关 TODO：天空 + 平台上的小人，一个「最高奖励」式的道具卡 ----------
function platform(g, x, y, w) {
  g.fillStyle = '#07080d'; g.fillRect(x - w / 2, y, w, 7); g.fillStyle = '#6e4a12'; g.fillRect(x - w / 2 + 1, y + 1, w - 2, 5);
  g.fillStyle = '#f2c14e'; g.fillRect(x - w / 2 + 1, y + 1, w - 2, 1);
}
function sHidden(t) {
  const t0 = A(M.hidden) - 0.4, L = t - t0, cam = fitCam(camKeys([{ t: 0, cx: 150, cy: 96, z: 1.06 }, { t: A(M.outro) - t0, cx: 170, cy: 88, z: 1.2 }], L));
  beginWorld(cam); octx.drawImage(SP('pk_sky'), 0, 0); driftClouds(octx, L, 70, 12, 'none', 0.75);
  const bob = Math.round(Math.sin(L * 1.4) * 1.5); platform(octx, 160, 146 + bob, 40); actor(octx, 'pk_guy', 0, 160, 147 + bob);
  endWorld(); postG(ctx, L, off, { bloom: 0.35, sat: 1.05, tint: 'rgba(255,200,160,0.12)', vig: 'rgba(60,30,70,0.3)' });
  toast(ctx, '隐藏关已解锁', EPISODE.chapters[EPISODE.chapters.length - 1], t - K(M.hidden), seg(t, A(M.hidden + 1) - 0.3, A(M.hidden + 1) + 0.1));
  const rows = []; for (let i = M.hidden + 1; i < M.outro; i++) if (KW(i)) rows.push({ text: KW(i), owner: 'me', a: seg(t, K(i), K(i) + 0.2), done: seg(t, E(i), E(i) + 0.2) });
  faded(ctx, 1 - seg(t, A(M.outro) - 0.6, A(M.outro) - 0.3), () => questLog(ctx, 1080, 260, 700, rows, { L: t - (A(M.hidden + 1) - 0.1), title: '隐藏关' }));
}

// ---------- 终章：回到开头 → 获得道具 → 评论区提问 → 组队（关注）----------
function sEnd(t) {
  const t0 = A(M.outro) - 0.3, L = t - t0, cam = fitCam(camKeys([{ t: 0, cx: 150, cy: 120, z: 1.42 }, { t: DUR - t0, cx: 152, cy: 126, z: 1.7 }], L));
  beginWorld(cam); octx.drawImage(SP('ck_town'), 0, 0);
  HOOK_NPC.slice(0, 3).forEach(([x, f]) => actor(octx, 'ck_npcs', f, x, 150));
  actor(octx, 'ck_hero', t > K(M.item) ? 5 : 0, 150, GROUND.ck_town);
  endWorld(); townPost(L);
  const [hx, hy] = w2s(cam, 150, GROUND.ck_town - 44);
  for (let i = M.outro; i < M.item; i++) if (KW(i)) faded(ctx, 1 - seg(t, E(i) + 0.3, E(i) + 0.6), () => valueTag(ctx, KW(i), hx, hy, t - K(i)));
  darken((0.5 - 0.2 * seg(t, A(M.comment) - 0.2, A(M.comment) + 0.3)) * seg(t, K(M.item) - 0.2, K(M.item) + 0.2));
  faded(ctx, 1 - seg(t, A(M.comment) - 0.2, A(M.comment) + 0.1), () => {
    itemCard(ctx, W / 2, 500, t - (K(M.item) - 0.05), KW(M.item) || BOOK.name, 5, SP('ck_scroll'), { iconRot: 0, iconScale: 6, kind: BOOK.name, head: '获得道具', ribbon: '#2f7a4a' });
    ping(ctx, W / 2, 500, seg(t, K(M.item) - 0.05, K(M.item) + 0.7), 140, 260);
  });
  faded(ctx, 1 - seg(t, A(M.follow) - 0.1, A(M.follow) + 0.2), () => {
    const typed = REPLY.slice(0, Math.floor(seg(t, A(M.comment) + 0.8, K(M.comment) + 1.2) * REPLY.length));
    commentBox(ctx, W / 2, 560, '在评论区写下你的答案……', typed, t - A(M.comment));
  });
  const pr = A(M.follow) + 1.2, btn = inviteDialog(ctx, W / 2, 520, EPISODE.channel, t - A(M.follow), t > pr ? 1 : 0, faceOf('pk_guy', 0, 16));
  if (btn) { const k = ease(seg(t, A(M.follow) + 0.4, pr - 0.1)); cursorPx(ctx, lerp(W / 2 + 420, btn[0], k), lerp(820, btn[1], k), t > pr && t < pr + 0.15 ? 1 : 0); }
}

// ---------- 场景表 + 章节栏 ----------
const SCENES = [[0, A(M.book) - 0.3, sHook], [A(M.book) - 0.3, A(M.levels[0]) - 0.4, sBook]];
M.levels.forEach((li, ci) => {
  const next = ci < M.levels.length - 1 ? A(M.levels[ci + 1]) - 0.4 : (M.hidden >= 0 ? A(M.hidden) - 0.4 : A(M.outro) - 0.3);
  SCENES.push([A(li) - 0.4, A(li + 1) - 0.3, t => sceneLevel(t, ci, li)], [A(li + 1) - 0.3, next, sChapter(ci)]);
});
if (M.hidden >= 0) SCENES.push([A(M.hidden) - 0.4, A(M.outro) - 0.3, sHidden]);
SCENES.push([A(M.outro) - 0.3, DUR + 1, sEnd]);
const PK_OPTS = {
  barFrom: K(M.levels[0] - 1) - 0.2,
  chapterAt: [...M.levels.map((li, ci) => [A(li) - 0.4, ci]), ...(M.hidden >= 0 ? [[A(M.hidden) - 0.4, EPISODE.chapters.length - 1]] : [])],
};
