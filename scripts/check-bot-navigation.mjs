import assert from 'node:assert/strict';
import { findBotNavRoute, getServerVisibleTargetPoint } from '../server/duel-server.js';

const route = findBotNavRoute({ x: 0, z: 0 }, { x: 10, z: -28 }, 'park');
assert.ok(route.length > 1, 'A blocked route should contain at least one waypoint');
assert.ok(route.some((point) => Math.abs(point.x - 10) > 1 || Math.abs(point.z + 28) > 1), 'A* should route around the cover instead of taking a straight line');

const room = { map: 'park' };
const exposedHead = getServerVisibleTargetPoint(
  room,
  { x: 10, y: 1.58, z: -32 },
  { pose: { position: { x: 10, y: 1.58, z: -24 }, crouch: false } }
);
assert.ok(exposedHead, 'The head above a medium cover should be visible');
assert.ok(exposedHead.y > 1.55, 'The visible point should be above the cover top');

console.log(`BOT navigation checks passed (${route.length} waypoints)`);
