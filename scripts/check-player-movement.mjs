import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'src/main.js'), 'utf8');
const jumpVelocity = readConstant(source, 'JUMP_VELOCITY');
const gravity = readConstant(source, 'GRAVITY');
const jumpHeight = (jumpVelocity * jumpVelocity) / (2 * gravity);

assert.ok(jumpHeight >= 1.1, `跳跃最高点 ${jumpHeight.toFixed(2)}m 不足以越过 1.05m 低掩体`);
assert.ok(jumpHeight < 1.55, `跳跃最高点 ${jumpHeight.toFixed(2)}m 已高于中型掩体`);
assert.ok(jumpHeight < 4.6, `跳跃最高点 ${jumpHeight.toFixed(2)}m 已高于回型地图高墙`);

console.log(`Player movement checks passed (jump apex ${jumpHeight.toFixed(2)}m)`);

function readConstant(sourceText, name) {
  const match = sourceText.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)`));
  assert.ok(match, `未找到 ${name}`);
  return Number(match[1]);
}
