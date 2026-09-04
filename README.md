# 对枪训练场 Web FPS

一个浏览器中运行的 3D Web FPS 训练游戏。首页包含玩法选择、武器仓库、商店和个人中心；实际游戏继续使用 Three.js 全屏渲染。AK-47、AWP 与 Survival Knife 高模会在登录页预加载并缓存到浏览器本机。

## 快速开始

```powershell
pnpm install
pnpm run dev
```

打开 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。

```powershell
pnpm run dev      # 本地开发服务器
pnpm run lan      # 局域网可访问服务器
pnpm run build    # 生成 dist/
pnpm run preview  # 本地预览构建版本
pnpm run check    # 语法、BOT、部署、生产构建与 WebSocket 冒烟检查
pnpm run check:movement # 验证跳跃高度与可翻越掩体边界
pnpm run check:collision # 验证低掩体、中型掩体和高墙碰撞边界
pnpm run check:smoke # 临时启动生产服务并验证房间开局链路
pnpm start        # 生产 Node 服务器（dist + WebSocket）
```

生产服务器默认监听 `0.0.0.0:3000`，浏览器访问 `http://127.0.0.1:3000/`；局域网设备可使用本机局域网 IP。`/healthz` 可用于云主机健康检查，`/duel-ws` 需要由反向代理保持 WebSocket upgrade。

Docker 部署可直接执行：

```powershell
docker compose up --build -d
```

`compose.yaml` 会在镜像构建阶段注入 Supabase 两种公开 key 名称和可选的 `VITE_DUEL_WS_URL`。Vite 不会在容器启动后重新读取前端环境变量，所以修改这些值后需要重新构建镜像。

## Vercel 部署

仓库已包含 `vercel.json`，在 Vercel 中导入 `Understanding-king/DONGDIWEBFPS` 后，构建命令和输出目录会自动识别。项目设置里添加 `VITE_SUPABASE_URL`，以及 `VITE_SUPABASE_ANON_KEY` 或 `VITE_SUPABASE_PUBLISHABLE_KEY` 其中一个；如果要让 Vercel 前端连接独立的实时服务器，再添加 `VITE_DUEL_WS_URL=wss://你的实时服务器域名/duel-ws`。

[一键导入 Vercel](https://vercel.com/new/clone?repository-url=https://github.com/Understanding-king/DONGDIWEBFPS) · [一键创建 Render 实时服务](https://render.com/deploy?repo=https://github.com/Understanding-king/DONGDIWEBFPS)

Vercel 部署的是静态前端，训练、BOT 对战、首页、仓库、商店、个人中心和 Supabase 账号可以直接使用。Vercel Functions 不保持长连接，因此当前房间大厅的 WebSocket 服务不能放在 Vercel 上；需要把 `server/production-server.js` 部署到支持 WebSocket 的 Node/Docker 主机，并通过 `VITE_DUEL_WS_URL` 指向它。若暂时不配置该变量，房间功能会按同源 `/duel-ws` 连接，适用于 Docker/Node 全栈部署。

仓库同时提供 `render.yaml`，可在 Render 一键创建实时 Node 服务；部署完成后，把它的 `wss://.../duel-ws` 地址填入 Vercel 的 `VITE_DUEL_WS_URL`。

需要 Node.js `20.19+` 或 `22.12+`。

完整的 Supabase、Docker、Node 云平台和 Nginx WebSocket 反代步骤见 [`docs/deployment.md`](docs/deployment.md)。

## 已有游戏内容

- 六向球靶训练、BOT 对战和局域网对枪。
- AK-47、AWP、M870 切换，开镜、后坐、散布和跳跃。
- 低矮掩体可翻越，中型掩体挡视线和弹道，高墙不可翻越。
- F 巧乐兹道具：5 秒免伤、18 秒冷却，联机由服务端权威判定。
- BOT 使用按地图缓存的网格 A* 导航，会绕开高墙和掩体；目标被遮挡时会沿路线接近，并在卡住后自动重新寻路。视线检测优先检查露出的头部，因此可以正常处理卡头线对枪。

## 代码结构

| 文件 | 职责 |
| --- | --- |
| `index.html` | 游戏壳层、大厅、账号弹窗和玩法面板 |
| `src/main.js` | Three.js 场景、武器、靶场、人机、LAN 对枪和大厅交互 |
| `src/styles.css` | 全屏游戏界面、HUD、大厅、商店、仓库和移动端布局 |
| `src/services/account-service.js` | 本地档案、Supabase Auth 适配和云端会话边界 |
| `vite.config.js` | Vite 开发、构建和 LAN WebSocket 插件 |
| `server/duel-server.js` | LAN WebSocket 房间、命中校验、墙体和掩体碰撞 |
| `server/production-server.js` | 生产静态资源、`/healthz` 和 WebSocket 同服 |
| `supabase/migrations/202609020001_game_profiles.sql` | 账号档案表、RLS 和新用户触发器 |
| `supabase/migrations/202609020002_friendships.sql` | 好友关系表和基础 RLS |
| `supabase/migrations/202609030001_cloud_friend_codes.sql` | 好友码和云端好友 RPC |
| `supabase/migrations/202609030002_account_roles.sql` | 管理员/懂帝角色、停用和账号管理 RPC |
| `supabase/migrations/202609040001_range_leaderboard.sql` | 六向球靶云端排行榜和成绩提交 RPC |
| `scripts/create-special-accounts.mjs` | 在本机创建或升级三个特殊账号 |
| `Dockerfile` | 云主机的可重现生产镜像 |

## 账号与本地数据

游戏设置和战绩保存在 `localStorage['aim-trainer-local-v1']`；玩家名、档案等级和训练币保存在 `localStorage['aim-trainer-account-v1']`。未配置云端时不会伪装登录成功，也不在浏览器中保存密码。

生产云端需要在构建时注入 `.env` 中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，仅使用 Supabase 公开 anon key，不要把 service-role key 放进前端。首次部署时按顺序在 Supabase SQL Editor 执行：

1. `supabase/migrations/202609020001_game_profiles.sql`
2. `supabase/migrations/202609020002_friendships.sql`
3. `supabase/migrations/202609030001_cloud_friend_codes.sql`
4. `supabase/migrations/202609030002_account_roles.sql`
5. `supabase/migrations/202609040001_range_leaderboard.sql`

第三份迁移会添加 12 位好友码以及仅登录用户可调用的好友查询、添加和删除 RPC。第四份迁移启用管理员角色，第五份迁移添加六向球靶的公开排行榜和仅登录用户可提交的最好成绩。登录后会从 `profiles` 表恢复档案和云端好友列表；未配置云端时仍保持本地档案模式。

角色和三个特殊账号的准备方式见 [`docs/special-accounts.md`](docs/special-accounts.md)。普通玩家仍可自行注册，管理员和懂帝权限由数据库角色控制。

## GitHub 与上云

1. 当前代码已同步到 [Understanding-king/DONGDIWEBFPS](https://github.com/Understanding-king/DONGDIWEBFPS) 的 `main` 分支。
2. GitHub Actions 会在 push 和 Pull Request 上自动运行 `pnpm run check`。
3. 云主机执行 `pnpm install --frozen-lockfile && pnpm run build && pnpm start`。
4. 反向代理需要同时代理 HTTP 和 WebSocket 路径 `/duel-ws`；健康检查地址是 `/healthz`。
5. Vercel 负责静态前端；账号云同步需要 Supabase 环境变量，房间大厅还需要支持长连接的实时服务，并将其地址写入 `VITE_DUEL_WS_URL`。
