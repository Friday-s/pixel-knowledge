# 引擎 API（web/core/*.js）

脚本加载顺序：`project.config.js → core.js → nolyr.js → episode.js → narration.js → ui.js → pklib.js → scenes/ep.js → project.timeline.js → boot.js`。全部是普通全局脚本，ep.js 里能直接用下面所有函数。
**别在 ep.js 里重新 `const` 声明这些名字**（darken、spr、fitCam、carryHero、KW、M……），会报 “already been declared”，整片白屏。

## 两套坐标、两层画布

- **世界层**：320×180 像素底板（`BW×BH`），放大 6 倍到 1920×1080。背景、角色、道具画在离屏画布 `octx` 上，坐标是世界像素，整数锁格。
- **屏幕层**：1920×1080（`W×H`），所有 UI（卡片、标签、面板、字幕）画在 `ctx` 上，坐标是屏幕像素。
- 一个场景函数的固定写法：
```js
function sFoo(t) {
  const t0 = A(9) - 0.3, L = t - t0;                       // L = 场景内局部时间
  const cam = fitCam(camKeys([{ t: 0, cx: 160, cy: 110, z: 1.4 }, { t: 6, cx: 180, cy: 104, z: 1.6 }], L));
  beginWorld(cam);                                         // 开始画世界层（octx），镜头已套好
  octx.drawImage(SP('ck_town'), 0, 0);                     // 背景 320×180 贴在 (0,0)
  actor(octx, 'ck_hero', Math.floor(L * 5) & 1, 120, 160); // 角色：表名、帧号、脚底中心 x、脚底 y
  endWorld();
  postG(ctx, L, off, { bloom: 0.25, vig: 'rgba(20,16,30,0.4)' });   // 世界层合到屏幕 + 调色/辉光/暗角/颗粒
  const [sx, sy] = w2s(cam, 120, 116);                     // 世界坐标 → 屏幕坐标，UI 跟着角色走
  valueTag(ctx, '关键词', sx, sy, t - K(9));               // UI 一律用「t - 出现时刻」当局部时间，<0 不画
}
```

## 时间（全部挂在旁白句子上）

| 名字 | 含义 |
|---|---|
| `A(i)` / `E(i)` | 第 i 句开始 / 结束（秒） |
| `K(i)` | 第 i 句 `[关键词]` 念出来的时刻；画面事件挂这里 |
| `KW(i)` | 第 i 句第一个 `[]` 里的字 |
| `M` = `pkMarks()` | 锚句序号：`M.book` `M.levels[0..]` `M.hidden`（没有为 -1）`M.outro` `M.item` `M.comment` `M.follow`（骨架 ep.js 里定义了 `const M = pkMarks()`） |
| `DUR` | 全片时长（`pk voice` 写入） |
| `seg(t, a, b)` | t 在 a→b 间的 0..1 进度（夹紧） |
| `ease` / `easeOut` / `easeBack` / `smooth` | 缓动 |
| `lerp(a, b, k)` `clamp(x, a=0, b=1)` `rnd(i)`（确定性伪随机 0..1） | |

整片必须是 `seek(t)` 的纯函数：别用 `Math.random()`、`Date.now()`、跨帧累加的状态，随机一律 `rnd(种子)`。

## 场景表与章节栏（ep.js 末尾）

```js
const SCENES = [[起点秒, 终点秒, 场景函数, 'cut'?], …];   // 按时间排；第 4 项写 'cut' = 硬切，不写 = 交界处 0.2s 黑场
const PK_OPTS = { barFrom: K(7) - 0.2, chapterAt: [[A(8) - 0.4, 0], [A(14) - 0.4, 1], [A(20) - 0.4, 2], [A(25) - 0.4, 3]] };
```
场景边界通常落在「下一段第一句的 A − 0.3」。关卡卡场景直接用 `t => sceneLevel(t, 第几关从0起, 关卡句序号)`（大厅展板 + 勋章点亮 + 关卡对话框）。字幕（`subtitle`）、章节栏、片头片尾黑场由 `pkSeek` 自动画，不用管。

## 镜头

- `camKeys(keys, L)`：关键帧 `{t, cx, cy, z, rot(度), shake, dof, ease:'io'|'lin'|'out'|'in', whip:true}`，自带手持漂移。`cx/cy` 是镜头中心（世界像素），`z` 放大倍数（1 = 整张背景，1.5–1.8 = 中近景）。
- `drift(c, L)`：静态机位加漂移（镜头永不静止）。`fitCam(c)`：把镜头夹在背景范围内，不露黑边。
- `w2s(cam, x, y)` → `[屏幕x, 屏幕y]`。
- 特效（core.js）：`iris(ctx, k, x, y)` 光圈收放、`fgWipe(ctx, k)` 前景遮挡扫过、`flashW(ctx, a)` 闪白、`letterbox(ctx, k)` 遮幅、`camFX(ctx, cam)` 甩镜模糊、`ramp(L, [[a,b,速度]])` 慢动作。

## 世界层：背景、角色、道具

- `SP(名字)` = 单帧图（如 `SP('m_city')`、`SP('book_real')`）；`IMG['表名_帧号']` = 任意帧；`META[表名][帧号]` = `{w,h,headX,headTop}`。
- `actor(g, 表名, 帧, x, 脚底y, flip=false, alpha=1)`：以头部中线 `headX` 对齐 x。除表名含 walk 的，所有角色每拍自动上下「呼吸」1 像素（让静止画面也在动）；不想要就自己 `g.drawImage(IMG[...])`。脚底线用背景表里的值（library.md），镜头推近时确认 `w2s(cam, x, 脚底y)[1] < 920`，别让人物踩进字幕区。
- `carryHero(g, x, 脚底y, 数量, t, 在走?, 步频=3)`：背东西的主角（硬规则，见 SKILL.md）。`scrollPile(g, x, y, n, t)` 卷轴堆。
- `emote(g, 'heart'|'angry'|'dots'|'q'|'x'|'bang'|'ok', x, y, a)`：头顶小气泡表情（世界坐标，放在头顶上方约 4 像素）。
- `sprRot(g, im, x, y, 锚x, 锚y, 弧度, a)` 旋转贴图；`bgCross(g, 图A, 图B, k)` 两张背景交叉淡化（如卧室暗→亮）。
- `driftClouds(g, t, yMax=70, 速度=4, filter='none', alpha=0.9)`：像素云精灵；`cloudF(CLOUD.warm, CLOUD.dark, k)` 生成调暗/调冷的 filter。
- `rainLayer(g, L, 0|1, 强度, 地面y)` 下雨。
- `faceOf(表名, 帧, 16)`：从角色帧裁出头像（给 `hud` / `inviteDialog`）。
- `iconCanvas(['..11..', …], {1:'#f2c14e'})`：字符画小图标。

## 屏幕层：后期与小工具

- `postG(ctx, L, off, {bloom, sat, bri, tint, flash, rays, dust, dark, vig})`：把世界层合上来。常用预设：`studyPost(L)`（大厅暖光+灰尘）、`studyGlow(cam, t)`（大厅两盏壁灯光晕）。
- `darken(a)` 整屏压暗（UI 弹出前用 0.3–0.7）；`glowDot(ctx, x, y, r, a, '255,205,110')` 光晕；`ping(ctx, x, y, k, r0, R)` 扩散光环（k 0..1）；`brackets(ctx, x, y, w, h, k)` 四角对焦框。
- `faded(ctx, a, () => { … })`：整组 UI 一起淡出（`a = 1 - seg(t, 下一句A - 0.2, 下一句A + 0.1)`）。
- `label(ctx, 文字, x, y, 倍数, 颜色, 锚x=0.5, 锚y=0, alpha, 描边色)`：像素字（支持 `[]` 高亮）；`textW(文字, 倍数)` 量宽。
- `spr(ctx, im, x, y, 倍数, 锚x, 锚y, a, flip)`：屏幕坐标按整数倍画精灵（道具放大展示）。
- `UC` 配色：`gold goldD goldL navy ink red white grey kw paper green blue`。

## UI 组件（屏幕坐标；L = t − 出现时刻，L<0 不画；都会弹入动画）

| 组件 | 用法 | 适合 |
|---|---|---|
| `bookReveal(ctx, cx, cy, SP('book_real'), L, {scale=4, head, name, rank, kind, sub})` | 真封面（放大 scale 倍）+ 书页厚度 + 右侧详情面板；不传 name 只画书 | 亮书；两个版本就画两次（第二本用 `SP('book_tw')` 之类，scale 3） |
| `itemCard(ctx, cx, cy, L, 名称, 星级, 图标, {head, kind, ribbon, iconRot, iconScale})` | 装备/技能卡 272×360 | 抽象概念「获得」 |
| `valueTag(ctx, 文字, x, y, L, 倍数=3, 边框色)` | 头顶数值标签（带小尖角，y 是尖角位置） | 给角色/物件贴标签 |
| `statusTag(ctx, x, y, 名称, L, {bad, sub, subK})` | 红色 debuff / 绿色 buff | 破产、入狱、活下来 |
| `counterTag(ctx, 文字, x, y, a)` | 顶部计数牌（`[数字]` 高亮） | 计数、金额滚动 |
| `progressBar(ctx, cx, cy, w, 比例, 文字, L)` | 进度条 | 百分比、进度 |
| `questLog(ctx, x, y, w, rows, {L, title, count, twoCols, left, right, rowH})` | 任务栏；row = `{text, owner:'me'|'other', col, a, done, tag, tagK, lock}` | 清单、步骤、分两栏 |
| `choiceDialog(ctx, cx, cy, 问题, [选项…], 选中序号, L, {w})` → 每个选项的屏幕坐标 | 选择框；配 `cursorPx(ctx, x, y, 按下0/1)` 光标移过去点 | 让观众先猜 |
| `quoteCard(ctx, cx, cy, [行…], 出处, L, {s})` | 羊皮纸名言卡，逐字打出 | 书里金句 |
| `flowCard(ctx, cx, cy, A, B, L, {flip, title, colA, colB})` | A → B 因果卡，flip 0..1 两格交换 | 因果倒置 |
| `causeTri(ctx, cx, cy, A, B, C, L, {cK, cross, title})` | A→B 上方冒出第三因素 C | 替代原因 |
| `bridgeCard(ctx, cx, cy, 左, 右, L, {crack, walker, walk})` | 理由→结论的桥，会裂 | 论证 |
| `compareCard(ctx, cx, cy, [左标题, 左说明], [右标题, 右说明], L, {hi, lk, rk})` | 左右对比，hi 高亮右栏 | A vs B |
| `idPanel(ctx, cx, cy, 标题, [[字段, 内容, 揭示0..1]…], L)` | 鉴定面板，未揭示显示 ？？？ | 逐项揭晓 |
| `chatBubble(ctx, x, y, 文字, L, 'l'|'r', {s})` | 手机消息气泡 | 对话、小声说 |
| `hud(ctx, k, {name, lv, bar, barCol, line2, face, x, y, flash})` | 左上玩家状态（头像+血条） | 人物登场 |
| `toast(ctx, 抬头, 文字, L, 退出0..1)` | 顶部成就横条 | 隐藏关解锁、成就达成 |
| `levelDialog(ctx, cx, cy, L, 抬头, 标题)` | 关卡对话框（sceneLevel 内部用） | |
| `saveMenu(ctx, cx, cy, [槽位…], 选中, L)` | 读档菜单 | 重来、回到过去 |
| `moons(ctx, cx, cy, 数量, 点亮数, L)` | 夜晚计数 | 第几天/第几夜 |
| `commentBox(ctx, cx, cy, 提示语, 已打出的字, L)` | 评论输入框（终章提问） | |
| `inviteDialog(ctx, cx, cy, 名字, L, 按下0/1, 头像)` → 按钮坐标 | 组队邀请（终章关注） | |
| `medal(g, cx, cy, r, 亮?)` `panel(g, x, y, w, h)` `star` `glint` `popIn` | 底层零件，自己拼新组件用 | |

位置习惯：主卡片放 `(W/2, 480–520)`；左书右卡时书在 x≈520–690、卡在 x≈1330；顶部计数牌 y=76；文字别进 y>930（字幕）和 y<56（章节栏）。

## 新素材怎么进引擎

`pk px` 产出 `web/assets/名字.json + 名字_0..n.png`，自动登记到 `project.config.js` 的 `sheets`（`pk sync <目录>` 手动登记）。背景是单帧 `SP('名字')`，320×180 贴 (0,0)；角色表用 `actor(octx, '名字', 帧, x, 脚底y)`；道具 `IMG['名字_帧']`。
