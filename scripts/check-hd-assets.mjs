import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

for (const path of ['public/models/hd-arena/desert-courtyard-v1.glb', 'public/models/hd-arena/hands-v1.glb', 'public/models/cf-soldier/Soldier.glb']) {
  const buffer = await readFile(new URL(`../${path}`, import.meta.url));
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', `${path}: signature`);
  assert.equal(buffer.readUInt32LE(4), 2, `${path}: version`);
  assert.equal(buffer.readUInt32LE(8), buffer.length, `${path}: truncated export`);
  const document = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
  assert.ok(document.meshes?.length > 0, `${path}: missing meshes`);
  for (const view of document.bufferViews || []) assert.ok((view.byteOffset || 0) + view.byteLength <= document.buffers[view.buffer].byteLength, `${path}: buffer overflow`);
  if (path.includes('hands')) for (const arm of ['armLeft', 'armRight']) assert.ok(document.nodes.some((node) => node.name === arm), `missing ${arm}`);
  if (path.includes('Soldier')) for (const name of ['Idle', 'Walk', 'Run']) assert.ok(document.animations.some((animation) => animation.name === name), `missing ${name}`);
  console.log(`${path}: ${document.meshes.length} meshes, ${buffer.length} bytes`);
}
const collision = JSON.parse(await readFile(new URL('../public/models/hd-arena/collision-v1.json', import.meta.url)));
assert.equal(collision.coordinateSystem, 'three-y-up');
assert.ok(collision.solids.length > 0);
for (const box of collision.solids) {
  for (let axis = 0; axis < 3; axis++) assert.ok(Number.isFinite(box.min[axis]) && box.min[axis] < box.max[axis], `${box.name}: invalid bounds`);
}
console.log(`HD collision: ${collision.solids.length} valid solids`);
