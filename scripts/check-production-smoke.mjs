import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 32000 + Math.floor(Math.random() * 2000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/production-server.js'], {
  cwd: root,
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += String(chunk); });
server.stderr.on('data', (chunk) => { serverOutput += String(chunk); });

try {
  await waitForHealth(`${origin}/healthz`);
  const result = await checkRoomFlow(`ws://127.0.0.1:${port}/duel-ws`);
  console.log(`Production smoke passed (healthz, room ${result.roomCode}, ${result.playerCount} players)`);
} catch (error) {
  if (serverOutput.trim()) console.error(serverOutput.trim());
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  server.kill();
}

async function waitForHealth(url) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`生产服务器提前退出：${server.exitCode}`);
    try {
      const response = await fetch(url);
      const payload = await response.json();
      if (response.ok && payload?.ok === true && payload?.service === 'web-fps') return;
    } catch {
      // Server startup is asynchronous; retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('生产健康检查超时');
}

function checkRoomFlow(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let roomCode = '';
    let readySent = false;
    const timeout = setTimeout(() => finish(new Error('WebSocket 房间冒烟测试超时')), 8_000);

    function finish(error, result) {
      clearTimeout(timeout);
      ws.close();
      if (error) reject(error);
      else resolve(result);
    }

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'create-room', name: 'CI SMOKE', map: 'park' }));
    });
    ws.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'joined-room') {
        roomCode = message.roomCode;
        ws.send(JSON.stringify({ type: 'add-bot' }));
        return;
      }
      if (message.type === 'room-update' && roomCode && !readySent && message.room?.players?.length > 1) {
        readySent = true;
        ws.send(JSON.stringify({ type: 'ready' }));
        return;
      }
      if (message.type === 'match-start') {
        finish(null, { roomCode: message.room?.code || roomCode, playerCount: message.room?.players?.length || 0 });
        return;
      }
      if (message.type === 'error') finish(new Error(`WebSocket 服务报错：${message.message}`));
    });
    ws.on('error', (error) => finish(new Error(`WebSocket 连接失败：${error.message}`)));
    ws.on('close', () => {
      if (!readySent) finish(new Error('WebSocket 在开局前关闭'));
    });
  });
}
