import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { attachLanDuelServer } from './duel-server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = readPort(process.env.PORT, 3000);
const host = process.env.HOST || '0.0.0.0';
const server = createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { ...securityHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ ok: true, service: 'web-fps' }));
    return;
  }
  serveStatic(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end('Internal Server Error');
  });
});

attachLanDuelServer(server);
server.listen(port, host, () => {
  console.log(`Web FPS listening on http://${host}:${port}`);
});

function readPort(value, fallback) {
  const portNumber = Number(value);
  return Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535 ? portNumber : fallback;
}

async function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const candidate = path.resolve(dist, `.${requestPath}`);
  const safeCandidate = candidate.startsWith(`${dist}${path.sep}`) ? candidate : path.join(dist, 'index.html');
  let filePath = safeCandidate;
  try {
    if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html');
    await stat(filePath);
  } catch {
    filePath = path.join(dist, 'index.html');
  }

  const body = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  }[extension] || 'application/octet-stream';
  const immutable = /\/assets\//.test(filePath);
  response.writeHead(200, {
    ...securityHeaders(),
    'Content-Type': contentType,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  response.end(body);
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}
