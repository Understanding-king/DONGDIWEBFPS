# 上云部署手册

这份 MVP 使用一个 Node 生产进程同时提供静态页面和 `/duel-ws` WebSocket。云平台只要能运行 Docker 或 Node.js，并支持长连接即可。

## Vercel 前端

仓库中的 `vercel.json` 已配置 Vite 构建。将 GitHub 仓库导入 Vercel，并设置 `VITE_SUPABASE_URL`，以及 `VITE_SUPABASE_ANON_KEY` 或 `VITE_SUPABASE_PUBLISHABLE_KEY` 其中一个。Vercel 负责静态前端；它不能承载当前 Node WebSocket 长连接。要启用房间大厅，在另一台支持 WebSocket 的 Node/Docker 主机运行本项目的生产服务器，并在 Vercel 环境变量中设置：

可以直接使用 [Vercel 导入链接](https://vercel.com/new/clone?repository-url=https://github.com/Understanding-king/DONGDIWEBFPS)。在 Vercel 的 Environment Variables 中，Production 和 Preview 环境都要填写同一组 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（或 `VITE_SUPABASE_PUBLISHABLE_KEY`）；配置了实时服务后，再填写 `VITE_DUEL_WS_URL`。每次修改 `VITE_*` 变量都要重新部署，变量只在构建时注入前端。

```text
VITE_DUEL_WS_URL=wss://<realtime-host>/duel-ws
```

修改该变量后需要在 Vercel 重新部署。未设置时，前端默认连接当前域名下的 `/duel-ws`，适合同一台 Node/Docker 主机同时提供页面和 WebSocket 的部署方式。

仓库中的 `render.yaml` 可直接创建一个支持 WebSocket 的 Node 服务。Render 部署完成后，将服务域名改成 `wss://<render-domain>/duel-ws`，填入 Vercel 的 `VITE_DUEL_WS_URL` 并重新部署前端。

## Supabase

在 Supabase SQL Editor 按顺序执行三份 `supabase/migrations/` 迁移，然后在 Auth 设置中确认允许 Email + Password 登录。前端只需要公开配置，不要使用 service-role key：

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
# New Supabase dashboards may use this name instead.
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Docker 云主机

在项目根目录创建 `.env`，填入 `VITE_SUPABASE_URL` 和两个公开 key 变量中的一个，然后执行：

```powershell
docker compose up --build -d
curl http://127.0.0.1:3000/healthz
```

返回 `{"ok":true,"service":"web-fps"}` 后，再把域名反向代理到 `127.0.0.1:3000`。修改前端 Supabase 或 `VITE_DUEL_WS_URL` 变量后必须重新构建镜像。

## Node 云平台

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

设置 `HOST=0.0.0.0`，平台提供的 `PORT` 会被自动读取。健康检查使用 `/healthz`。

## Nginx WebSocket 反代

HTTP 和 WebSocket 必须指向同一个服务：

```nginx
location /duel-ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 上线前检查

```powershell
pnpm run check
pnpm run check:deploy
```

浏览器确认注册、登录、好友码、创建房间、加入房间、添加 BOT、准备和对枪；另开一个浏览器会话验证 WebSocket 加入和击杀播报。线上再检查 `/healthz` 和 `/manifest.webmanifest`。Vercel 的 `/healthz` 由 `api/healthz.js` 提供；Node/Docker 部署仍由生产服务器提供同一路径。

当前代码已同步到 [Understanding-king/DONGDIWEBFPS](https://github.com/Understanding-king/DONGDIWEBFPS) 的 `main` 分支。后续提交直接推送到该仓库即可；Vercel 会按项目设置自动构建，GitHub Actions 会先运行完整检查。
