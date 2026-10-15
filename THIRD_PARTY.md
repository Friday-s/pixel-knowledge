# 第三方内容与授权

| 内容 | 位置 | 授权 | 说明 |
|---|---|---|---|
| Fusion Pixel Font 12px（TakWolf） | `template/web/fonts/fusion12.otf` | SIL Open Font License 1.1 | 未修改，仅改了文件名；授权全文见同目录 `fusion12_OFL.txt` |
| 像素素材（角色、道具、背景） | `library/assets/`、`library/refs/` | 随本项目授权 | 作者用 Codex（OpenAI 图像生成）生成后经 `pixelize.py` 像素化；按 OpenAI 使用条款，生成内容归生成者所有 |
| 音效与配乐 | `scripts/sfx_synth.py`、`scripts/bgm.py` 运行时生成 | 随本项目授权 | 纯代码合成，不含任何采样 |
| numpy / Pillow / playwright | `pk.py setup` 时 pip 安装，不随包分发 | BSD / MIT-CMU / Apache-2.0 | |
| edge-tts | `pk.py setup` 时 pip 安装，不随包分发 | LGPL-3.0 | 调用微软 Edge 在线朗读服务；合成语音的商用条款以微软为准，正式商用可换自己的配音 |
| 书籍封面 | 不随包分发 | 版权归出版方 | `pk.py cover` 运行时从豆瓣下载，用于读书分享/评论场景下展示所评书籍 |
