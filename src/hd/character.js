import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createWeapon } from './weapon-assets.js';
import { loadGltfWithRetry } from './assets.js';

const SOLDIER_URL = '/models/cf-soldier/Soldier.glb';
const SOLDIER_HEIGHT = 1.86;
const RUN_SPEED = 4.5;
const DEATH_DURATION = 0.72;

let soldierSourcePromise;

const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

/**
 * Load an isolated CF combatant for the HD arena.
 *
 * Soldier.glb contains Idle, Walk, Run and TPose only. Crouch, airborne and
 * death are deliberately generated as additive bone poses in update(); they
 * are not presented as clips that exist in the source asset.
 */
export async function createCombatant(scene, { position, team = 'blue' } = {}) {
  if (!scene?.add) throw new TypeError('createCombatant requires a THREE.Scene or Group');

  const soldierSource = await loadSoldierSource();
  const weaponAsset = await createWeapon({ castShadow: true });
  const group = new THREE.Group();
  group.name = `cf-combatant-${team}`;
  group.userData.team = team === 'red' ? 'red' : 'blue';

  const model = normalizeSoldier(cloneSkinnedScene(soldierSource.scene));
  model.name = 'cf-soldier-model';
  group.add(model);
  const basePosition = readPosition(position);
  group.position.copy(basePosition);

  const bones = findBones(model);
  const restPose = capturePose(model);
  const hitMeshes = [];
  const instanceMaterials = [];
  setupSoldierMaterials(model, group.userData.team, hitMeshes, instanceMaterials);

  const weaponRig = new THREE.Group();
  weaponRig.name = 'cf-primary-weapon';
  weaponRig.add(weaponAsset.group);
  group.add(weaponRig);
  weaponRig.position.set(0.16, 1.34, -0.28);
  group.updateMatrixWorld(true);

  const mixer = new THREE.AnimationMixer(model);
  const actions = createAnimationActions(mixer, soldierSource.animations, model);
  let activeAction = actions.idle;
  activeAction?.play();

  let dead = false;
  let deathTime = 0;
  let disposed = false;
  let deathPosition = basePosition.clone();
  let deathPose = null;
  let motionTime = 0;

  const combatant = {
    group,
    hitMeshes,
    update(dt = 0, pose = {}) {
      if (disposed) return;
      const delta = THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.1);
      const rawSpeed = Number(pose.speed);
      const speed = Number.isFinite(rawSpeed) ? Math.max(0, rawSpeed) : 0;
      const moving = Boolean(pose.moving) || speed > 0.05;
      const crouch = THREE.MathUtils.clamp(Number(pose.crouch) || 0, 0, 1);
      const airborne = Boolean(pose.airborne);
      const aimPitch = THREE.MathUtils.clamp(Number(pose.aimPitch) || 0, -1.2, 1.2);
      const wantsDead = Boolean(pose.dead);

      if (wantsDead && !dead) {
        dead = true;
        deathTime = 0;
        deathPosition.copy(group.position);
        deathPose = capturePose(model);
        stopActions(actions);
      } else if (!wantsDead && dead) {
        dead = false;
        deathTime = 0;
        group.position.copy(basePosition);
        group.rotation.set(0, group.rotation.y, 0);
        weaponRig.position.set(0.16, 1.34, -0.28);
        weaponRig.rotation.set(0, 0, 0);
        deathPose = null;
        restorePose(restPose);
        activeAction = actions.idle;
        activeAction?.reset().play();
      }

      if (dead) {
        deathTime = Math.min(DEATH_DURATION, deathTime + delta);
        const progress = THREE.MathUtils.smoothstep(deathTime / DEATH_DURATION, 0, 1);
        // Procedural fall: the source GLB has no death clip.
        restorePose(deathPose || restPose);
        group.rotation.z = (group.userData.team === 'red' ? -1 : 1) * progress * 1.55;
        group.position.copy(deathPosition);
        group.position.y += progress * 0.12;
        applyDeathPose(bones, progress);
        weaponRig.rotation.z = progress * 0.48;
        return;
      }

      group.rotation.z = 0;
      motionTime += delta;
      // Reset untracked bones before the mixer writes its current clip pose.
      // This prevents additive crouch/air poses from accumulating indefinitely.
      restorePose(restPose);
      const nextAction = selectAction(actions, moving, speed);
      if (nextAction && nextAction !== activeAction) {
        activeAction?.fadeOut(0.14);
        nextAction.reset().fadeIn(0.14).play();
        activeAction = nextAction;
      }
      activeAction?.setEffectiveTimeScale(moving ? THREE.MathUtils.clamp(speed / (speed >= RUN_SPEED ? RUN_SPEED : 1.6), 0.5, 1.8) : 1);
      mixer.update(delta);
      applyCombatPose(bones, { crouch, airborne, aimPitch, moving, speed });

      const bob = moving && !airborne ? Math.sin(motionTime * 7.2 * (speed > RUN_SPEED ? 1.25 : 1)) * 0.012 : 0;
      weaponRig.position.set(0.16, 1.34 - crouch * 0.22 + bob, -0.28);
      weaponRig.rotation.set(aimPitch * 0.6, 0, Math.sin(motionTime * 5.4) * 0.006 * Math.min(1, speed / RUN_SPEED));
      group.updateMatrixWorld(true);
      fitHandsToRifle(group, weaponRig, bones);
    },
    reset() {
      if (disposed) return;
      dead = false;
      deathTime = 0;
      group.position.copy(basePosition);
      group.rotation.set(0, group.rotation.y, 0);
      weaponRig.position.set(0.16, 1.34, -0.28);
      weaponRig.rotation.set(0, 0, 0);
      stopActions(actions);
      restorePose(restPose);
      activeAction = actions.idle;
      activeAction?.reset().play();
      deathPose = null;
      motionTime = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopActions(actions);
      mixer.uncacheRoot(model);
      scene.remove(group);
      // Geometry and textures belong to the shared source cache. Only cloned
      // material instances are owned here and are safe to release per avatar.
      instanceMaterials.forEach((material) => material.dispose());
      weaponAsset.dispose();
      hitMeshes.length = 0;
      group.clear();
    }
  };

  scene.add(group);
  return combatant;
}

async function loadSoldierSource() {
  soldierSourcePromise ||= loadGltfWithRetry(new GLTFLoader(), SOLDIER_URL).then((gltf) => {
    if (!gltf?.scene) throw new Error(`Soldier GLB scene is empty: ${SOLDIER_URL}`);
    return gltf;
  }).catch((error) => {
    soldierSourcePromise = undefined;
    throw error;
  });
  return soldierSourcePromise;
}

function readPosition(position) {
  if (position?.isVector3) return position.clone();
  if (Array.isArray(position)) {
    return new THREE.Vector3(
      Number(position[0]) || 0,
      Number(position[1]) || 0,
      Number(position[2]) || 0
    );
  }
  if (position && typeof position === 'object') {
    return new THREE.Vector3(
      Number(position.x) || 0,
      Number(position.y) || 0,
      Number(position.z) || 0
    );
  }
  return new THREE.Vector3();
}

function normalizeSoldier(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (!size.y || !Number.isFinite(size.y)) throw new Error('Soldier GLB has invalid bounds');
  model.scale.setScalar(SOLDIER_HEIGHT / size.y);
  model.updateMatrixWorld(true);
  const normalized = new THREE.Box3().setFromObject(model);
  const center = normalized.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= normalized.min.y;
  model.position.z -= center.z;
  model.updateMatrixWorld(true);
  return model;
}

function setupSoldierMaterials(model, team, hitMeshes, ownedMaterials) {
  const teamColor = new THREE.Color(team === 'red' ? '#a83f54' : '#327bc2');
  model.traverse((child) => {
    if (child.isSkinnedMesh) {
      hitMeshes.push(child);
      const meshName = child.name.toLowerCase();
      child.userData.hitbox = /head|visor|helmet/.test(meshName) ? 'head' : 'body';
    }
    if (!child.material) return;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const cloned = sourceMaterials.map((source) => {
      if (!source) return source;
      const material = source.clone();
      ownedMaterials.push(material);
      if (child.name.toLowerCase().includes('mesh')) material.color?.lerp(teamColor, 0.2);
      material.needsUpdate = true;
      return material;
    });
    child.material = Array.isArray(child.material) ? cloned : cloned[0];
  });
}

function findBones(root) {
  const get = (name) => root.getObjectByName(`mixamorig${name}`) || root.getObjectByName(`mixamorig:${name}`) || root.getObjectByName(name);
  return {
    get,
    hips: get('Hips'), spine: get('Spine'), spine1: get('Spine1'), spine2: get('Spine2'),
    leftArm: get('LeftArm'), leftForeArm: get('LeftForeArm'), leftHand: get('LeftHand'),
    rightArm: get('RightArm'), rightForeArm: get('RightForeArm'), rightHand: get('RightHand'),
    leftUpLeg: get('LeftUpLeg'), rightUpLeg: get('RightUpLeg'), leftLeg: get('LeftLeg'), rightLeg: get('RightLeg'),
    leftFoot: get('LeftFoot'), rightFoot: get('RightFoot')
  };
}

const ik = {
  shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), wrist: new THREE.Vector3(),
  direction: new THREE.Vector3(), bend: new THREE.Vector3(), elbowTarget: new THREE.Vector3(),
  from: new THREE.Vector3(), to: new THREE.Vector3(), target: new THREE.Vector3(), pole: new THREE.Vector3(),
  rotation: new THREE.Quaternion(), world: new THREE.Quaternion(), parent: new THREE.Quaternion()
};

function rotateBoneToward(bone, from, to) {
  if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
  ik.rotation.setFromUnitVectors(from.normalize(), to.normalize());
  bone.getWorldQuaternion(ik.world);
  bone.parent.getWorldQuaternion(ik.parent).invert();
  bone.quaternion.copy(ik.parent.multiply(ik.rotation).multiply(ik.world)).normalize();
  bone.updateWorldMatrix(false, true);
}

function solveArm(upper, lower, hand, target, pole) {
  if (!upper || !lower || !hand) return;
  upper.getWorldPosition(ik.shoulder);
  lower.getWorldPosition(ik.elbow);
  hand.getWorldPosition(ik.wrist);
  const a = ik.shoulder.distanceTo(ik.elbow);
  const b = ik.elbow.distanceTo(ik.wrist);
  if (a < 0.01 || b < 0.01) return;
  ik.direction.subVectors(target, ik.shoulder);
  const distance = THREE.MathUtils.clamp(ik.direction.length(), Math.abs(a - b) + 0.001, a + b - 0.002);
  ik.direction.normalize();
  ik.bend.subVectors(pole, ik.shoulder).addScaledVector(ik.direction, -ik.bend.dot(ik.direction)).normalize();
  const projection = (a * a + distance * distance - b * b) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a * a - projection * projection));
  ik.elbowTarget.copy(ik.shoulder).addScaledVector(ik.direction, projection).addScaledVector(ik.bend, height);
  rotateBoneToward(upper, ik.from.subVectors(ik.elbow, ik.shoulder), ik.to.subVectors(ik.elbowTarget, ik.shoulder));
  lower.getWorldPosition(ik.elbow);
  hand.getWorldPosition(ik.wrist);
  rotateBoneToward(lower, ik.from.subVectors(ik.wrist, ik.elbow), ik.to.subVectors(target, ik.elbow));
}

function fitHandsToRifle(group, rifle, bones) {
  for (const side of ['Left', 'Right']) {
    const isLeft = side === 'Left';
    ik.target.set(isLeft ? -0.065 : 0.045, isLeft ? -0.045 : -0.075, isLeft ? -0.035 : 0.26);
    rifle.localToWorld(ik.target);
    ik.pole.set(isLeft ? -0.46 : 0.48, 1.08, 0.09);
    group.localToWorld(ik.pole);
    const hand = bones.get(`${side}Hand`);
    solveArm(bones.get(`${side}Arm`), bones.get(`${side}ForeArm`), hand, ik.target, ik.pole);
    const middle = bones.get(`${side}HandMiddle1`);
    if (hand && middle) {
      hand.getWorldPosition(ik.wrist);
      middle.getWorldPosition(ik.elbow);
      ik.to.set(isLeft ? 0.1 : -0.1, 0.35, -1).transformDirection(rifle.matrixWorld);
      rotateBoneToward(hand, ik.from.subVectors(ik.elbow, ik.wrist), ik.to);
    }
    for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
      const trigger = !isLeft && finger === 'Index';
      applyOffset(bones.get(`${side}Hand${finger}1`), 0, 0, trigger ? 0.24 : 0.62);
      applyOffset(bones.get(`${side}Hand${finger}2`), 0, 0, trigger ? 0.35 : 0.85);
      applyOffset(bones.get(`${side}Hand${finger}3`), 0, 0, 0.4);
    }
  }
}

function capturePose(root) {
  const pose = [];
  root.traverse((object) => {
    if (!object.isBone) return;
    pose.push({ object, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() });
  });
  return pose;
}

function restorePose(pose) {
  pose.forEach((entry) => {
    entry.object.position.copy(entry.position);
    entry.object.quaternion.copy(entry.quaternion);
    entry.object.scale.copy(entry.scale);
  });
}

function applyOffset(bone, x = 0, y = 0, z = 0, weight = 1) {
  if (!bone || weight <= 0) return;
  tempEuler.set(x * weight, y * weight, z * weight);
  tempQuaternion.setFromEuler(tempEuler);
  bone.quaternion.multiply(tempQuaternion);
}

function applyCombatPose(bones, { crouch, airborne, aimPitch }) {
  applyOffset(bones.spine2, aimPitch * 0.24, 0, 0);
  applyOffset(bones.spine1, aimPitch * 0.12, 0, 0);

  // Soldier.glb has no crouch/air clips. These are additive Mixamo bone poses.
  applyOffset(bones.hips, -0.24 * crouch + (airborne ? -0.08 : 0), 0, 0);
  applyOffset(bones.spine, 0.16 * crouch, 0, 0);
  applyOffset(bones.leftUpLeg, 0.36 * crouch + (airborne ? 0.18 : 0), 0, 0);
  applyOffset(bones.rightUpLeg, 0.36 * crouch + (airborne ? 0.18 : 0), 0, 0);
  applyOffset(bones.leftLeg, -0.58 * crouch + (airborne ? -0.22 : 0), 0, 0);
  applyOffset(bones.rightLeg, -0.58 * crouch + (airborne ? -0.22 : 0), 0, 0);
  applyOffset(bones.leftFoot, airborne ? 0.16 : 0, 0, 0);
  applyOffset(bones.rightFoot, airborne ? 0.16 : 0, 0, 0);
}

function applyDeathPose(bones, progress) {
  applyOffset(bones.hips, 0.12 * progress, 0, 0);
  applyOffset(bones.spine, -0.28 * progress, 0, 0.2 * progress);
  applyOffset(bones.leftArm, -0.5 * progress, 0, -0.3 * progress);
  applyOffset(bones.rightArm, -0.5 * progress, 0, 0.3 * progress);
  applyOffset(bones.leftLeg, 0.45 * progress, 0, 0);
  applyOffset(bones.rightLeg, 0.45 * progress, 0, 0);
}

function createAnimationActions(mixer, clips, root) {
  const byName = new Map((clips || []).map((clip) => [clip.name.toLowerCase(), clip]));
  const find = (...names) => names.map((name) => byName.get(name)).find(Boolean);
  return {
    idle: find('idle', 'tpose') ? mixer.clipAction(find('idle', 'tpose'), root) : null,
    walk: find('walk', 'idle') ? mixer.clipAction(find('walk', 'idle'), root) : null,
    run: find('run', 'walk', 'idle') ? mixer.clipAction(find('run', 'walk', 'idle'), root) : null
  };
}

function selectAction(actions, moving, speed) {
  if (!moving) return actions.idle || actions.walk || actions.run;
  if (speed >= RUN_SPEED) return actions.run || actions.walk || actions.idle;
  return actions.walk || actions.run || actions.idle;
}

function stopActions(actions) {
  Object.values(actions).forEach((action) => action?.stop());
}
