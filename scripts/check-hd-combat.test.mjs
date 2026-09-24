import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeaponState, RELOAD_SECONDS } from '../src/hd/combat.js';

test('fire cadence limits clicks and the magazine cannot go negative', () => {
  const weapon = createWeaponState();
  assert.equal(weapon.fire(), true);
  assert.equal(weapon.fire(), false);
  assert.equal(weapon.ammo, 29);
  for (let i = 0; i < 50; i++) { weapon.update(0.1); weapon.fire(); }
  assert.equal(weapon.ammo, 0);
  assert.equal(weapon.reserve, 90);
});

test('reload transfers exactly the missing rounds once, blocks firing, and ignores repeated reloads', () => {
  const weapon = createWeaponState();
  assert.equal(weapon.reload(), false);
  for (let i = 0; i < 7; i++) { weapon.fire(); weapon.update(0.1); }
  assert.equal(weapon.reload(), true);
  weapon.update(RELOAD_SECONDS / 2);
  assert.equal(weapon.fire(), false);
  assert.equal(weapon.reload(), false);
  assert.equal(weapon.reloadProgress, 0.5);
  weapon.update(RELOAD_SECONDS / 2);
  assert.equal(weapon.ammo, 30);
  assert.equal(weapon.reserve, 83);
  weapon.update(10);
  assert.equal(weapon.reserve, 83);
});

test('pausing leaves reload unchanged, and resetting cancels it', () => {
  const weapon = createWeaponState();
  weapon.fire(); weapon.reload(); weapon.update(0.4);
  const progress = weapon.reloadProgress;
  weapon.update(0);
  assert.equal(weapon.reloadProgress, progress);
  weapon.reset(); weapon.update(10);
  assert.equal(weapon.reloading, false);
  assert.equal(weapon.ammo, 30);
  assert.equal(weapon.reserve, 90);
});

test('all ammunition can be consumed without creating rounds on a final reload', () => {
  const weapon = createWeaponState();
  let fired = 0;
  for (let magazine = 0; magazine < 5; magazine++) {
    for (let i = 0; i < 30; i++) { weapon.update(0.1); if (weapon.fire()) fired++; }
    weapon.reload(); weapon.update(RELOAD_SECONDS);
  }
  assert.equal(fired, 120);
  assert.equal(weapon.ammo, 0);
  assert.equal(weapon.reserve, 0);
  assert.equal(weapon.reload(), false);
});
