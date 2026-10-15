// 模板固定：每集的 SCENES / PK_OPTS 写在 scenes/ep.js，这里只把 seek 接到 pkSeek（覆盖 core.js 的 seek）
'use strict';
function seek(t) { pkSeek(t, PK_OPTS); }
