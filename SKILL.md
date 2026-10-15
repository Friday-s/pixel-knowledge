---
name: pixel-knowledge
description: 像素风游戏化讲书视频（抖音「Vibe 知识大赏」式）：一句话给书名，从零做出一集 2–2.5 分钟、16:9 的像素知识片——写三关+隐藏关+终章的旁白文稿、用豆瓣真实封面像素化、Codex 生场景/角色/道具并像素化、代码逐帧编排（游戏 UI：技能书、关卡卡、任务栏、状态图标、组队邀请）、免费 TTS 配音和程序化配乐、无头渲染、qa 自检，交付分享版 mp4 和总览图。触发：「用我的 skill 做一期 Vibe 知识大赏，书选《XX》」「做一期像素知识视频」「pixel-knowledge」「把这本书做成像素游戏风讲书视频」「游戏化讲书」。不用于：竖屏、真人出镜、无旁白的纯字幕知识片（那个用 vibe-knowledge-film 一类）。
---

# pixel-knowledge：一句话做一集像素讲书片

成片长这样：像素小人在游戏世界里闯关，旁白逐句讲一本书；每句话屏幕上都有一件事正好在关键词那一刻发生（道具掉落、状态图标弹出、任务打勾、铁栏落下……），底部字幕关键词金色高亮，顶部章节栏跟着走。全部画面由代码逐帧画出，换配音画面自动跟。

下文 `$SKILL` 指这份 SKILL.md 所在目录（加载 skill 时给出的 Base directory），命令里的 `pk` 是简写：实际执行时写全 `python3 "$SKILL/scripts/pk.py" …`（`$SKILL` 换成真实路径）。每次 Bash 都是新 shell，别把命令存进变量（zsh 不拆分变量会报 no such file）；嫌长就在同一条命令开头定义函数 `pk() { python3 "<skill目录>/scripts/pk.py" "$@"; }`。所有脚本只用相对 skill 目录的路径，不依赖任何个人环境。

## 0 开工前（每次先跑，几秒）

```bash
python3 "$SKILL/scripts/pk.py" doctor
```
有 ✗ 就先 `pk setup`（建 skill 自带的 .venv、装 numpy/Pillow/playwright/edge-tts、下 Chromium、生成音效库，约 2–5 分钟，只需一次）；ffmpeg 要用户自己装（doctor 会给命令）。Codex CLI 是可选的：没有就走「没有 Codex 时」。

## 1 定选题与文稿（最重要，先想清楚再动手）

用户一句话通常只给书名。默认一口气做完、不中途停下来等确认；只有书名有歧义（同名书、不确定是哪本）才先问一句。

1. **想内容**：这本书最核心的 3 个观点（三关）+ 1 个升华（隐藏关），每个观点配一个书里的具体故事/案例/数字。书里的事实、引语、数字必须准确；记不准的宁可不说具体数字，不编引语。
2. **找世界观**：给全片一个游戏化的比喻（被讨厌的勇气＝背不完的「任务卷轴」；学会提问＝信息是「未鉴定道具」、提问是「鉴定术」；金钱心理学＝「装备」穿给别人看、「背包」里的金币才是自己的）。三关都在这个世界里发生。
3. **写 episode.json**：33–40 句、合计 575–650 个汉字（含标点约 670–750 字），念完 2:20–2:30（云希实测约 4.9 汉字/秒，含句间停顿）。结构、句式、锚句、停顿规则看 `references/script-writing.md`，三个完整范例在 `examples/*/episode.json`。锚句必须保留（「这本书叫《X》」「第一关：…」「第二关：…」「第三关：…」「…隐藏关…」「回到开头…」「…道具：[X]」「…[评论区]…」「关注我…」），引擎靠它们自动排场景、章节栏和音效。
4. 写完在回复里贴一版大纲（三关 + 隐藏关各一句话），然后继续做；用户中途要改再改。

## 2 建项目、封面、配音

```bash
pk new <目录> --title 书名 --author "作者 / 译者不写" --kind "传说 · 心理学" [--book-name 封面版本的书名] [--channel 频道名]
# 把文稿写进 <目录>/episode.json
pk cover <目录> "书名"          # 豆瓣搜全部版本 → 下大图 → 像素化成 web/assets/book_real；看 gen/cover/book_real_px_preview.png
pk voice <目录>                 # edge-tts 逐句配音 → music/song.wav + web/narration.js（打印每句时刻）
```
- 目录建在用户当前工作目录下，用书名命名即可（如 `./掌控习惯`）。`--channel` 是终章「邀请你组队」里显示的名字，用户没说就用默认值，最后提醒他可以改。
- **封面版本**：`cover` 会顺着豆瓣「其他版本」列出同一作品的全部版本，默认选书名完全一致里评价最多的，没有完全一致的就选评价最多的（通常就是大陆版）。大陆译名可能和用户说的不同（用户说《原子习惯》，大陆版叫《掌控习惯》，台版叫《原子習慣》）：旁白里交代一句「大陆版叫《掌控习惯》」，并用 `--book-name`（或改 episode.json 的 `book.name`）让技能书卡上的书名和封面一致。想换版本 `--pick N` 或 `--id 条目号`；想同时亮两个版本，第二个用 `--name book_tw` 输出成另一个素材。豆瓣打不开就让用户给一张封面图 `--image`。
- 打开 `gen/cover/book_real_px_preview.png` 看书名是否认得出；糊了就 `--width 132` 或 `--colors 24`；白底封面被洗白就 `--lock dark`。
- 配音前扫一遍多音字（系、当、得、还、行、长、重、为、了、着、调、差……），能换说法就换（「系好鞋带」→「穿上跑鞋」，「得先」→「要先」）；没法听音频确认，所以宁可避开。

## 3 素材：先用素材库，缺什么再让 Codex 画

`library/` 是现成的像素素材（新项目里已全部拷进 `web/assets/`）：主角三套动作（走路/驼背负重/坐/伸懒腰/挠头/看手机/淘金/拿放大镜）、10 个路人、富人与老人等 8 个角色动作、马、卷轴、金币背包名表终点旗沙漏、咖啡手机宝箱药水等道具、跑车、像素云，以及 8 张 320×180 背景（午后小镇、卧室暗/亮、河边、黄昏城市加油站、日出云海、夜晚大厅、地牢走廊）。帧号、朝向、脚底线见 `references/library.md`，总览图 `references/library_sprites.png`、`references/library_backgrounds.png`（先看图再选）。

本书世界观需要的新东西（通常 2–5 张：1–2 个场景、1 张新角色动作表、1 张道具表）用 Codex 生成：

```bash
# 写 <目录>/gen/batch.json：[{"name":"x_office","prompt":"{BG} 场景：……","refs":["$SKILL/library/refs/scene_town.png"]}, …]
pk gen <目录> --batch gen/batch.json      # 4 张并行，每张约 1–2 分钟，放后台跑
pk px <目录> x_office --no-key --width 320 --colors 40             # 背景
pk px <目录> x_people --height 38                                  # 角色动作表（绿幕），按空隙自动切帧
pk px <目录> x_props --key magenta --height 20                     # 道具表（洋红幕），按空隙自动切帧
```
提示词模板、`{STYLE}{BG}{GREEN}{MAGENTA}` 占位、参考图、像素化参数表见 `references/codex-prompts.md`。每次 `px` 会出 `gen/<名字>_px.png` 预览，必须打开看：帧数对不对（一个东西被劈成两帧、或两个并成一帧）、绿边抠干净没有、朝向。默认按空隙自动切，只有角色彼此挨着、自动切不开时才加 `--frames N`（它按等分线切，间距不均会切错）。等图的时候先去写 ep.js。

## 4 编排画面：写 web/scenes/ep.js

新项目里的 `ep.js` 是能直接出片的骨架（只用素材库，按锚句自动排好全部场景）。真正做一集要把每个 `TODO` 场景换成本书的画面，通常 10–14 个场景、250–350 行：

1. 先跑 `pk lines <目录>` 拿到每句的序号和 A/K/E 时刻，写一张分镜表（句号｜旁白｜画面｜关键词那一刻发生什么｜用哪些素材），一句一画面。
2. 照分镜改 `ep.js`。引擎 API（坐标系、镜头、角色、30 个 UI 组件）在 `references/engine-api.md`；常用场景套路和三个范例的场景索引在 `references/scene-recipes.md`；完整范例 `examples/{courage,question,money}/ep.js` 直接抄结构。
3. 有动作的画面补音效：`music/make_cues.py` 里 `auto()` 已铺好配乐和常规提示音，再按画面加 `h('coin', K(12), 0.12)` 之类。
4. 抽静帧检查，改到满意：
```bash
pk stills <目录>              # 每句关键词时刻各一张 → stills/总览.jpg（打开看）
pk stills <目录> 41.5 43 44.2 # 盯某几个时刻
```
检查清单在 `references/scene-recipes.md` 末尾（关键词那一刻画面里真的发生了吗、文字压没压字幕、角色身份对不对、有没有静止超过 3 秒的地方……）。

## 5 出片与自检

```bash
pk render <目录>     # 后台跑：配乐 → 音效表 → 混音 → 4 路并行渲染 → 合成 → 分享版 → qa；140 秒一集约 10–20 分钟
```
合格线（qa.py 自动判）：音画时长差 < 0.1s、无 ≥3s 静止段（片尾除外）、接近静止占比 < 5%。不通过就按提示修了再渲。
交付：`out/<书名>_pixel-knowledge_分享版.mp4`（发抖音用）+ `out/<书名>_pixel-knowledge_分享版_总览.jpg`（抽帧总览，打开检查后发给用户），高画质版 `out/<书名>_pixel-knowledge.mp4` 留着。最后告诉用户：成片位置、时长、用了哪个封面版本、哪些地方可以按需改（频道名、评论区示例回答、配音音色）。

## 硬规则（违反就返工）

1. **书本一律用真实封面像素化**（`pk cover`），不许让 AI/Codex 画书，素材库里也没有书。
2. **角色背东西要有适配的动作**：背得多 → 驼背 + 木背架 + 卷轴堆，背得少 → 直立 + 小背包。直接用 `carryHero(g, x, 脚底, 数量, t, 是否在走)`；不许正面站着把东西堆在脑后。`ck_hero` 第 2/3 帧（驼背）原图朝左，往右走要 `flip`（carryHero 已处理）。
3. **云一律用像素云精灵**：要动的云用 `driftClouds(...)`（pk_clouds + 滤镜调暗调冷），不要用代码画圆形云（Codex 背景图里自带的像素云没问题）。
4. **字库只用模板自带的 Fusion Pixel 12px**（`web/fonts/fusion12.otf`），别换回 Ark（缺「读钱感经鉴」等 44 个常用字，缺字会变灰色糊块）。
5. **角色身份要对得上**：富豪/亿万富翁/高管用西装角色（`m_people` 2/3、`m_people2` 0），一群富人用西装剪影（`octx.filter = 'brightness(0.22) saturate(0) sepia(0.5)'`），别拿村民路人充当；书里的真实人物不画成真人的样子（泛化角色或剪影），Codex 提示词里写「不要画成任何真实名人的样子」。
6. 一句一画面，关键词时刻画面里要真的发生那件事；镜头永远在动（`drift` / `camKeys`），不允许 ≥3 秒的静止。
7. 画面上的字和角色不压底部字幕区（屏幕 y > 930）和顶部章节栏（y < 56）：镜头推近时检查 `w2s(cam, x, 脚底y)[1] < 920`。

## 没有 Codex 时

只用素材库也能做：8 张背景 + 主角/路人/富人/老人 + 道具已经够搭大多数比喻；缺的物件用代码画（像素矩形拼、`iconCanvas` 字符画图标）或用 UI 组件（`itemCard`、`flowCard`、`compareCard`、`causeTri`、`progressBar`、曲线图）表达。新项目自带的骨架 `ep.js` 就是纯素材库版本。

## 文件地图

- `scripts/pk.py` 唯一入口（setup/doctor/new/cover/gen/px/voice/lines/stills/render/qa）；其余脚本由它调用。
- `template/` 新项目模板：`web/core/`（引擎 core.js、UI 库 ui.js、场景工具 pklib.js）、`web/fonts/`（Fusion Pixel + OFL 授权）、`web/scenes/ep.js`（骨架）、`music/make_cues.py`。
- `library/assets/` 像素素材；`library/refs/` 给 Codex 的画风参考图；`library/sfx/` setup 生成的 24 种程序化音效。
- `prompts/` Codex 提示词固定段落；`references/` 写稿/引擎/场景/素材/提示词/踩坑文档；`examples/` 三集完整范例（episode.json + ep.js + make_cues.py + 封面条目号）。
- 踩过的坑：`references/pitfalls.md`（出问题先查这里）。
