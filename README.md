# pixel-knowledge · 一句话做一集像素讲书视频

给 Claude Code 用的 skill。装好后对 Claude 说一句：

> 用我的 skill，帮我做一期 Vibe 知识大赏，书选《被讨厌的勇气》

它会自己写旁白文稿（三关 + 隐藏关 + 终章）、下载并像素化真实书封、生成像素场景和角色、逐帧编排游戏化画面、配音配乐、渲染，最后交给你一条 2 分半左右的 16:9 成片（抖音可直接发）和一张抽帧总览图。

## 安装

需要：macOS / Linux / Windows（WSL 或 Git Bash）、Python 3.9+、[ffmpeg](https://ffmpeg.org/)、[Claude Code](https://claude.com/claude-code)。
可选：[Codex CLI](https://github.com/openai/codex)（`npm i -g @openai/codex` 后 `codex login`，需要 ChatGPT 账号）——用来为每本书生成新的场景和角色；没有也能做，只用自带素材库。

```bash
# 1. 放进 Claude Code 的 skills 目录
git clone <本仓库地址> ~/.claude/skills/pixel-knowledge
# 2. 装依赖（建 skill 自己的 Python 环境、下载无头 Chromium、生成音效库，约 2–5 分钟）
python3 ~/.claude/skills/pixel-knowledge/scripts/pk.py setup
# 3. 检查
python3 ~/.claude/skills/pixel-knowledge/scripts/pk.py doctor
```
ffmpeg 没装的话：macOS `brew install ffmpeg`，Windows `winget install ffmpeg`，Ubuntu `sudo apt install ffmpeg`。

## 用法

在一个空文件夹里打开 Claude Code，说「用我的 skill，帮我做一期 Vibe 知识大赏，书选《XXX》」。整个过程 40–90 分钟（生图和渲染占大头），Claude 会在后台跑长任务。成片在 `<书名>/out/<书名>_pixel-knowledge_分享版.mp4`。

想改终章「邀请你组队」里显示的名字：说一句「频道名用 XXX」，或建项目时加 `--channel XXX`。

## 目录

- `SKILL.md`：给 Claude 看的完整流程和硬规则
- `scripts/pk.py`：唯一的命令行入口（`setup / doctor / new / cover / gen / px / voice / lines / stills / render / qa`）
- `template/`：每集复制的网页渲染引擎（Canvas，320×180 像素底板放大到 1080p）
- `library/`：可复用的像素素材；`examples/`：三集完整范例；`references/`：写稿、引擎、场景、素材、提示词文档

## 授权

第三方内容见 [THIRD_PARTY.md](THIRD_PARTY.md)。字体 Fusion Pixel 为 SIL OFL 1.1。配音默认用 edge-tts（微软在线朗读服务），书封运行时从豆瓣获取，均不随包分发。
