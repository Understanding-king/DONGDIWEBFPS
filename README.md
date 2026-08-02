# 迹 · 经历记忆库 MVP

面向国际高中生的多页面产品原型。它用于记录经历、浏览事件关系图、检索经历库，并通过 AI 协助整理素材。

当前是一个 **Vite 静态前端项目**，没有服务端或数据库。事件与随手记数据保存在浏览器 `localStorage`，上传文件和照片保存在浏览器 IndexedDB，因此同一台设备、同一浏览器内可用，清除网站数据后会丢失。

## 快速开始

```powershell
npm ci
npm run dev
```

打开 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。

常用命令：

```powershell
npm run check    # 检查页面入口、站内资源引用与遗留方案文件
npm run clean    # 清理生成的 dist/
npm run build    # 生成生产构建到 dist/
npm run verify   # 先检查，再构建
npm run preview  # 本地预览已构建版本
```

需要 Node.js `20.19+`、`22.12+` 或更新版本。

## 页面与入口

| 路径 | 作用 |
| --- | --- |
| `index.html` | 首页，唯一的首页实现 |
| `record.html` | 新建经历、上传资料、生成摘要 |
| `library.html` | 经历库与筛选 |
| `detail.html?id=...` | 记录详情、编辑和附件管理 |
| `chat.html` | 与经历助手对话和检索 |
| `calendar.html` | 按日期查看事件与随手记 |
| `notes.html` | 按时间查看所有随手记正文 |
| `atlas.html` | 事件关系星球 |
| `settings.html` | 本地 API Key 和自定义分类 |

首页仅由 `home.js` 和 `home.css` 实现。不要再添加方案编号页面或方案选择页；历史十套首页设计已移出工作区并归档。

## 代码结构

| 文件 | 职责 |
| --- | --- |
| `app.js` | 页面壳、浏览器数据、记录、聊天和设置的页面初始化 |
| `home.js` / `home.css` | 首页结构与首页专属样式 |
| `memory-atlas.js` | Three.js 事件关系星球 |
| `ai-client.js` | DeepSeek / GLM 请求封装 |
| `styles.css` | 除首页外的共享布局与组件样式 |
| `vite.config.js` | 多页面构建入口 |
| `scripts/check-project.mjs` | 不依赖浏览器的项目完整性检查 |

更完整的修改边界和数据约定见 [AGENTS.md](AGENTS.md)。

## 数据与 AI 接口

浏览器数据键：

| 存储 | 键 / 数据库 | 内容 |
| --- | --- | --- |
| `localStorage` | `ji-records-v1` | 经历记录 |
| `localStorage` | `ji-notes-v1` | 随手记 |
| `localStorage` | `ji-settings-v1` | 自定义分类与 API Key |
| `sessionStorage` | `ji-chat-v2` | 当前会话聊天记录 |
| IndexedDB | `ji-media-v1` / `uploads` | 上传的文件与照片 Blob |

设置页中的 Key 只适合本地演示。目前请求从浏览器直接发往 DeepSeek 和 GLM，因此生产环境必须改为由受控服务端代理请求、保存密钥并执行鉴权；不要将真实生产 Key 放在浏览器中。

## 当前限制

- 没有账号、云端同步、多人协作或服务端备份。
- 没有自动化浏览器测试；每次修改交互或布局后，至少运行 `npm run verify` 并手动检查受影响页面。
- `app.js` 目前是集中式页面控制器。功能改动应先定位对应 `init*` 函数，避免无关重构。
