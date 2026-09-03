import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'Dockerfile',
  'compose.yaml',
  '.env.example',
  'public/manifest.webmanifest',
  'server/production-server.js',
  '.github/workflows/verify.yml',
  'vercel.json',
  'render.yaml',
  'api/healthz.js'
];

for (const relativePath of requiredFiles) await access(path.join(root, relativePath));

const envExample = await readFile(path.join(root, '.env.example'), 'utf8');
for (const variable of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_DUEL_WS_URL', 'HOST', 'PORT']) {
  if (!new RegExp(`^${variable}=`, 'm').test(envExample)) throw new Error(`.env.example 缺少 ${variable}`);
}

const dockerfile = await readFile(path.join(root, 'Dockerfile'), 'utf8');
for (const marker of ['pnpm install --frozen-lockfile', 'pnpm run build', 'HEALTHCHECK', 'CMD ["pnpm", "start"]']) {
  if (!dockerfile.includes(marker)) throw new Error(`Dockerfile 缺少 ${marker}`);
}

const productionServer = await readFile(path.join(root, 'server/production-server.js'), 'utf8');
for (const marker of ["request.url === '/healthz'", 'attachLanDuelServer(server)', 'process.env.PORT']) {
  if (!productionServer.includes(marker)) throw new Error(`生产服务器缺少 ${marker}`);
}

const vercel = await readFile(path.join(root, 'vercel.json'), 'utf8');
for (const marker of ['"buildCommand": "pnpm run build"', '"outputDirectory": "dist"', '"source": "/healthz"', 'X-Content-Type-Options']) {
  if (!vercel.includes(marker)) throw new Error(`vercel.json 缺少 ${marker}`);
}

const vercelHealth = await readFile(path.join(root, 'api/healthz.js'), 'utf8');
for (const marker of ["response.status(200)", "service: 'web-fps-vercel'"]) {
  if (!vercelHealth.includes(marker)) throw new Error(`Vercel health function 缺少 ${marker}`);
}

const render = await readFile(path.join(root, 'render.yaml'), 'utf8');
for (const marker of ['runtime: node', 'startCommand: pnpm start', 'healthCheckPath: /healthz']) {
  if (!render.includes(marker)) throw new Error(`render.yaml 缺少 ${marker}`);
}

const sourceFiles = ['src/main.js', 'src/services/account-service.js', 'server/duel-server.js', 'server/production-server.js'];
const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(root, file), 'utf8')))).join('\n');
if (/sk-[A-Za-z0-9]{20,}|service_role|github_pat_|ghp_[A-Za-z0-9]{20,}/i.test(source)) throw new Error('源码中发现疑似私密凭据');
const clientSource = await readFile(path.join(root, 'src/main.js'), 'utf8');
for (const marker of ['VITE_DUEL_WS_URL', 'isVercelDeployment', 'showRealtimeConfigNotice']) {
  if (!clientSource.includes(marker)) throw new Error(`线上实时服务提示缺少 ${marker}`);
}

console.log(`Deployment readiness checks passed (${requiredFiles.length} files, env, Docker, healthz, secret scan)`);
