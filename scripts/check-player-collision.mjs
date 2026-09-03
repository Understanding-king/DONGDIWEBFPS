import assert from 'node:assert/strict';
import { getMapConfig, resolveServerCollision } from '../server/duel-server.js';

const park = getMapConfig('park');
const ring = getMapConfig('ring');
const radius = 0.42;

const lowCover = park.blockers.find((blocker) => blocker.maxY < 1.1);
assert.ok(lowCover, '未找到低掩体');
const lowCenter = center(lowCover);
const blockedAtGround = resolveServerCollision(lowCenter.x, lowCenter.z, [lowCover], radius, 0);
assert.equal(blockedAtGround.collided, true, '地面进入低掩体时应被阻挡');

const throughFromTop = resolveServerCollision(lowCenter.x, lowCenter.z, [lowCover], radius, lowCover.maxY + 0.12);
assert.equal(throughFromTop.collided, false, '站到低掩体顶部后应可通过');

const mediumCover = park.blockers.find((blocker) => blocker.maxY >= 1.5 && blocker.maxY < 4);
assert.ok(mediumCover, '未找到中型掩体');
const mediumCenter = center(mediumCover);
const blockedAtJumpApex = resolveServerCollision(mediumCenter.x, mediumCenter.z, [mediumCover], radius, 1.2);
assert.equal(blockedAtJumpApex.collided, true, '跳跃最高点仍应被中型掩体阻挡');

const highWall = ring.blockers.find((blocker) => blocker.maxY >= 4.6);
assert.ok(highWall, '未找到高墙');
const highCenter = center(highWall);
const blockedAtWallHeight = resolveServerCollision(highCenter.x, highCenter.z, [highWall], radius, 4.5);
assert.equal(blockedAtWallHeight.collided, true, '跳跃最高点仍应被高墙阻挡');

console.log('Player collision checks passed (low-cover traversal, medium-cover block, high-wall block)');

function center(rect) {
  return {
    x: (rect.minX + rect.maxX) / 2,
    z: (rect.minZ + rect.maxZ) / 2
  };
}
