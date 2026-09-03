# 上云部署手册

这份 MVP 使用一个 Node 生产进程同时提供静态页面和 `/duel-ws` WebSocket。云平台只要能运行 Docker 或 Node.js，并支持长连接即可。

## Supabase

在 Supabase SQL Editor 按顺序执行三份 `supabase/migrations/` 迁移，然后在 Auth 设置中确认允许 Email + Password 登录。前端只需要公开配置，不要使用 service-role key：

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
```

## Docker 云主机

在项目根目录创建 `.env`，填入上面的两个变量，然后执行：

```powershell
docker compose up --build -d
curl http://127.0.0.1:3000/healthz
```

返回 `{"ok":true,"service":"web-fps"}` 后，再把域名反向代理到 `127.0.0.1:3000`。修改前端 Supabase 变量后必须重新构建镜像。

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

浏览器确认注册、登录、好友码、创建房间、加入房间、添加 BOT、准备和对枪；另开一个浏览器会话验证 WebSocket 加入和击杀播报。线上再检查 `/healthz` 和 `/manifest.webmanifest`。

GitHub 仓库创建后，把新仓库 URL 设置为 `origin` 再首次推送。当前工作区的旧 `MyArchive` 远程不要复用。
