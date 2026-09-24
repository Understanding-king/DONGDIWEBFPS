import test from 'node:test';
import assert from 'node:assert/strict';
import { createMovement } from '../src/hd/movement.js';

const advance = (player, seconds, input = {}, fps = 120) => {
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) player.update(1 / fps, input);
};
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
const box = (min, max, rotationY = 0) => ({ min, max, rotationY, shape: rotationY ? 'obb' : 'aabb' });

test('forward and strafe follow the same yaw convention as a Three.js camera', () => {
  for (const [yaw, forward, strafe, x, z] of [
    [0, 1, 0, 0, -1], [Math.PI / 2, 1, 0, -1, 0],
    [Math.PI / 2, 0, 1, 0, -1], [-Math.PI / 2, 1, 0, 1, 0]
  ]) {
    const player = createMovement();
    advance(player, 1, { yaw, forward, strafe });
    close(player.velocity.x, x * 5.8);
    close(player.velocity.z, z * 5.8);
  }
});

test('diagonal input has the same ground speed; releasing input stops the player', () => {
  const player = createMovement();
  advance(player, 1, { forward: 1, strafe: 1 });
  close(player.speed, 5.8);
  advance(player, 1);
  close(player.speed, 0);
});

test('airborne view rotation and no input preserve horizontal momentum', () => {
  const player = createMovement();
  advance(player, 1, { forward: 1 });
  player.update(1 / 120, { jump: true, forward: 1 });
  const original = { ...player.velocity };
  advance(player, 0.25, { yaw: Math.PI / 2 });
  assert.equal(player.grounded, false);
  close(player.velocity.x, original.x);
  close(player.velocity.z, original.z);
  // A perpendicular air input adds projected speed without rotating old velocity.
  player.update(1 / 120, { strafe: 1, yaw: 0 });
  assert.ok(player.velocity.x > 0);
  close(player.velocity.z, original.z);
});

test('fixed simulation is consistent at 30, 60, 120 and 144 rendering FPS', () => {
  const states = [30, 60, 120, 144].map((fps) => {
    const player = createMovement();
    advance(player, 1, { forward: 1 }, fps);
    advance(player, 1, { forward: 1, jump: true, yaw: 0.5 }, fps);
    advance(player, 1, { strafe: -1 }, fps);
    return player;
  });
  for (const player of states.slice(1)) {
    for (const key of ['x', 'y', 'z']) {
      close(player.position[key], states[0].position[key]);
      close(player.velocity[key], states[0].velocity[key]);
    }
  }
});

test('sliding along a diagonal wall retains tangent motion', () => {
  const wall = box([-0.15, 0, -10], [0.15, 4, 10], Math.PI / 4);
  const player = createMovement({ solids: [wall], spawn: { x: -2, z: 0 } });
  advance(player, 1, { strafe: 1 });
  const distance = (player.position.x - player.position.z) / Math.sqrt(2);
  assert.ok(distance <= -0.53 + 0.001, `penetrated wall: ${distance}`);
  assert.ok(player.position.z > 0.5, 'should slide in the wall tangent direction');
  assert.ok(player.speed > 1, 'collision must not discard tangent speed');
});

test('the empty corner of a rotated wall AABB does not cause false collisions', () => {
  const player = createMovement({
    solids: [box([-0.15, 0, -3], [0.15, 4, 3], Math.PI / 4)],
    spawn: { x: -1.5, z: 1.5 }
  });
  const old = { ...player.position };
  player.update(1 / 120, {});
  close(player.position.x, old.x);
  close(player.position.z, old.z);
});

test('fast falling crosses and lands on a box top instead of tunnelling through it', () => {
  const player = createMovement({ solids: [box([-2, 0, -2], [2, 1, 2])], spawn: { y: 2 } });
  player.velocity.y = -180;
  player.update(1 / 120);
  close(player.position.y, 1);
  close(player.velocity.y, 0);
  assert.equal(player.grounded, true);
});

test('walking off a ledge does not snap to a surface below or auto-jump', () => {
  const player = createMovement({ solids: [box([-1, 0, -1], [1, 1, 1])], spawn: { y: 1 } });
  advance(player, 0.5, { strafe: 1 });
  assert.ok(player.position.x > 1.38);
  assert.ok(player.position.y < 1 && player.position.y > 0);
  assert.equal(player.grounded, false);
});

test('steps are climbed only when there is room above the player', () => {
  const step = box([-1, 0, -2], [1, 0.3, -0.6]);
  const player = createMovement({ solids: [step] });
  advance(player, 0.3, { forward: 1 });
  close(player.position.y, 0.3);
  const blocked = createMovement({ solids: [step, box([-1, 1.9, -2], [1, 2.2, -0.6])] });
  advance(blocked, 0.3, { forward: 1 });
  close(blocked.position.y, 0);
  assert.ok(blocked.position.z >= -0.22 - 0.001);
});

test('crouching under a low roof prevents standing up until clear', () => {
  const player = createMovement({ solids: [box([-1, 1.3, -2], [1, 1.6, -0.6])] });
  advance(player, 0.5, { forward: 1, crouch: true });
  assert.ok(player.position.z < -0.6);
  player.update(1 / 120, {});
  assert.equal(player.crouch, true);
  advance(player, 1, { forward: 1 });
  assert.equal(player.crouch, false);
});

test('jumping into a ceiling clamps the head to its underside', () => {
  const player = createMovement({ solids: [box([-2, 2, -2], [2, 2.3, 2])] });
  let highest = 0;
  for (let i = 0; i < 60; i += 1) {
    player.update(1 / 120, { jump: true });
    highest = Math.max(highest, player.position.y);
  }
  close(highest, 0.22);
  close(player.position.y, 0);
});

test('holding jump never repeats, while releasing and pressing starts another jump', () => {
  const player = createMovement();
  advance(player, 2, { jump: true });
  close(player.position.y, 0);
  assert.equal(player.grounded, true);
  player.update(1 / 120, { jump: false });
  player.update(1 / 120, { jump: true });
  assert.ok(player.velocity.y > 0);
});

test('a fresh press before landing is buffered across a slow rendering frame', () => {
  const player = createMovement({ spawn: { y: 0.03 } });
  player.velocity.y = -1;
  player.update(0.1, { jump: true });
  assert.ok(player.position.y > 0.1);
  assert.ok(player.velocity.y > 0);
});

test('a timed landing jump preserves momentum before ground friction', () => {
  const player = createMovement({ spawn: { y: 0.03 } });
  player.velocity.x = 8;
  player.velocity.y = -1;
  player.update(0.1, { jump: true });
  close(player.velocity.x, 8);
  assert.ok(player.velocity.y > 0);
});

test('a high horizontal speed cannot tunnel through a thin wall', () => {
  const player = createMovement({
    solids: [box([0, 0, -10], [0.05, 4, 10])],
    spawn: { x: -1, y: 1 }
  });
  player.velocity.x = 240;
  player.update(1 / 120);
  assert.ok(player.position.x <= -0.38);
  close(player.velocity.x, 0);
});

test('reset clears pending simulation time, crouch and jump requests', () => {
  const player = createMovement();
  player.update(0.007, { jump: true, crouch: true });
  player.reset();
  player.update(0.002, { forward: 1 });
  close(player.position.z, 0);
  close(player.position.y, 0);
  assert.equal(player.crouch, false);
  advance(player, 0.1);
  close(player.position.y, 0);
});
