# 开发约定

## 项目事实

- 这是 Vite 多页面客户端应用，不存在身份系统或服务端渲染；配置 `.env.local` 后，事件与随手记使用单一共享 Supabase 数据库，`vite.config.js` 的文件存储中间件仅作为未配置云端时的本机开发/预览方案。
- 唯一正式首页是 `index.html`，其结构在 `home.js`，样式在 `home.css`。
- 页面入口固定为 `index`、`record`、`chat`、`atlas`、`library`、`detail`、`settings`、`notes`、`calendar`，并在 `vite.config.js` 中显式声明。
- `app.js` 按 `body[data-page]` 初始化页面。页面壳由 `initShell()` 创建；不应在 HTML 中复制侧边栏和顶栏。
- 事件星球由 `memory-atlas.js` 初始化。它会寻找 `atlas-stage` 或 `home-atlas-stage`，因此首页和星球页共用同一套图谱逻辑。

## 数据边界

- 经历记录和随手记的共享主存储：配置 Supabase 时为云端 `records`、`notes` 表；不区分用户，Web 与手机端读写同一套数据。
- 本地历史数据、首次云端迁移来源及无云配置时的主存储：项目内且被 Git 忽略的 `data/archive-data.json`。
- 共享记录的上一版滚动备份：项目内且被 Git 忽略的 `data/archive-data.backup.json`。
- 上传附件的共享主存储：项目内且被 Git 忽略的 `data/media/`。
- 经历记录与随手记的浏览器读取缓存/旧数据迁移来源：`localStorage['ji-records-v1']`、`localStorage['ji-notes-v1']`。
- 设置和本地 Key：`localStorage['ji-settings-v1']`。
- 聊天会话：`sessionStorage['ji-chat-v2']`。
- 旧附件迁移来源和共享接口不可用时的兜底：IndexedDB `ji-media-v1` 的 `uploads` object store。
- 读取已有数据时要保持向后兼容，除非安排单独的数据迁移。不要随意重命名这些键。

## 代码归属

| 需求 | 首选位置 |
| --- | --- |
| 首页结构与首页专属样式 | `home.js`、`home.css` |
| 跨页面页面壳、记录、聊天、设置行为 | `app.js` |
| Supabase 字段映射和共享云端读写 | `cloud-store.js`、`supabase/migrations/` |
| AI 请求和提示词 | `ai-client.js` |
| Three.js 图谱行为 | `memory-atlas.js` |
| 跨页面视觉组件 | `styles.css` |
| 本机共享文件接口 | `vite.config.js` |

不要把首页规则放回 `styles.css`，也不要再创建带编号的首页变体入口。历史方案和截图已归档在工作区外，不参与构建。

## AI 与安全

- 当前 `ai-client.js` 从浏览器直连模型接口，只可用于本地演示。
- 生产接入需要服务端代理：服务端持有供应商 Key、进行身份认证、限流、输入校验和日志脱敏；前端只能调用自有接口。
- 禁止提交 `.env`、真实 API Key、用户导出的浏览器数据或 `dist/`。
- Supabase publishable key 可以进入客户端，但当前无登录共享模式意味着拿到该 key 的人可读写整库；只用于个人开发演示，公开部署前必须重新引入鉴权或服务端代理。

## 修改流程

1. 先确认受影响页面和对应初始化函数。
2. 修改保持在所属文件内，不做无关视觉或架构重写。
3. 运行 `npm run verify`。
4. 修改首页、图谱、上传、聊天或移动端布局时，启动 `npm run dev` 后做一次浏览器回归。
5. 新增正式页面时，同时更新 `vite.config.js`、README 页面表和 `scripts/check-project.mjs`。

## 编码与构建

- 源文件使用 UTF-8；页面面向中文用户，保留中文文本，不要因终端显示问题改写编码。
- 使用 Node.js `20.19+`、`22.12+` 或更新版本。
- `npm run check` 只做静态项目完整性检查，`npm run build` 验证 Vite 构建。两者均通过才视为修改完成。
- 构建前会由 `scripts/clean-dist.mjs` 清理项目内生成的 `dist/`，避免旧 bundle 残留。
- Three.js 图谱 chunk 当前约 509 KB（gzip 约 129 KB），同时服务首页和星球页；Vite 告警阈值设为 550 KB。只有超过该基线或影响首屏时才需要拆分。
