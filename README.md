# 对枪训练场 Web FPS

一个浏览器中运行的 3D Web FPS 训练游戏。首页包含玩法选择、武器仓库、商店和个人中心；实际游戏继续使用 Three.js 全屏渲染。正式人物、爪刀和武器模型作为后续资产接口，等待接入你提供的模型文件。

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
pnpm run check    # 语法检查 + 生产构建
pnpm start        # 生产 Node 服务器（dist + WebSocket）
```

生产服务器默认监听 `0.0.0.0:3000`，浏览器访问 `http://127.0.0.1:3000/`；局域网设备可使用本机局域网 IP。`/healthz` 可用于云主机健康检查，`/duel-ws` 需要由反向代理保持 WebSocket upgrade。

Docker 部署可直接执行：

```powershell
docker compose up --build -d
```

`compose.yaml` 会在镜像构建阶段注入 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。Vite 不会在容器启动后重新读取前端环境变量，所以修改这两个值后需要重新构建镜像。

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
| `Dockerfile` | 云主机的可重现生产镜像 |

## 账号与本地数据

游戏设置和战绩保存在 `localStorage['aim-trainer-local-v1']`；玩家名、档案等级和训练币保存在 `localStorage['aim-trainer-account-v1']`。未配置云端时不会伪装登录成功，也不在浏览器中保存密码。

生产云端需要在构建时注入 `.env` 中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，仅使用 Supabase 公开 anon key，不要把 service-role key 放进前端。首次部署时按顺序在 Supabase SQL Editor 执行：

1. `supabase/migrations/202609020001_game_profiles.sql`
2. `supabase/migrations/202609020002_friendships.sql`
3. `supabase/migrations/202609030001_cloud_friend_codes.sql`

第三份迁移会添加 12 位好友码以及仅登录用户可调用的好友查询、添加和删除 RPC。登录后会从 `profiles` 表恢复档案和云端好友列表；未配置云端时仍保持本地档案模式。

## GitHub 与上云

1. 在 GitHub 新建一个专用仓库，不要复用当前这个旧的 `MyArchive` 远程地址。
2. GitHub Actions 会在 push 和 Pull Request 上自动运行 `pnpm run check`。
3. 云主机执行 `pnpm install --frozen-lockfile && pnpm run build && pnpm start`。
4. 反向代理需要同时代理 HTTP 和 WebSocket 路径 `/duel-ws`；健康检查地址是 `/healthz`。
5. 准备好 GitHub 仓库名和云主机后，再提供仓库 URL、域名和部署日志，用于线上实时调整。

当前工作区的 `origin` 仍指向旧的 `MyArchive`，不会自动推送。创建新仓库后，将其 URL 提供给我，再执行首次推送和云端联调。
