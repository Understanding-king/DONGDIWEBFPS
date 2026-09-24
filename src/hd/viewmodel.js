import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createWeapon } from './weapon-assets.js';
import { loadGltfWithRetry } from './assets.js';

let handsPromise;
const POSITION = new THREE.Vector3(0.24, -0.3, -0.68);

export async function createViewmodel(camera) {
  if (!camera?.isCamera) throw new TypeError('createViewmodel requires a THREE.Camera');
  // Load sequentially so a rejected hand asset cannot leak a weapon instance.
  handsPromise ||= loadGltfWithRetry(new GLTFLoader(), '/models/hd-arena/hands-v1.glb').catch((error) => {
    handsPromise = undefined;
    throw error;
  });
  const hands = cloneSkinnedScene((await handsPromise).scene);
  const left = hands.getObjectByName('armLeft');
  const right = hands.getObjectByName('armRight');
  if (!left || !right) throw new Error('高清手部模型缺少腕部节点');
  const weapon = await createWeapon({ viewmodel: true });
  const group = new THREE.Group();
  group.name = 'hd-first-person-viewmodel';
  group.position.copy(POSITION);
  group.add(weapon.group, hands);
  camera.add(group);
  const ownedMaterials = new Set();
  hands.traverse((node) => {
    if (!node.isMesh) return;
    const copy = (material) => {
      const result = material.clone();
      ownedMaterials.add(result);
      return result;
    };
    node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
    node.renderOrder = 11;
    node.layers.set(1);
    node.frustumCulled = false;
  });
  // Both assets have a wrist pivot, elbow toward +Z and fingers toward -Z.
  // Support wrist sits under the wood fore-end; firing wrist at the grip.
  left.scale.setScalar(0.84);
  right.scale.setScalar(0.84);
  left.position.set(-0.065, -0.045, -0.035);
  left.rotation.set(0.38, -0.42, -1.5);
  right.position.set(0.045, -0.075, 0.26);
  right.rotation.set(0.3, 0.22, 0.95);
  const leftPosition = left.position.clone();
  const leftQuaternion = left.quaternion.clone();
  const reloadPosition = new THREE.Vector3(-0.055, -0.115, 0.1);
  const reloadQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.25, -1.0));

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffce7a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
  const flashGeometry = new THREE.ConeGeometry(0.045, 0.17, 7, 1, true);
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.rotation.x = -Math.PI / 2;
  flash.position.z = -0.08;
  flash.renderOrder = 12;
  flash.layers.set(1);
  flash.visible = false;
  weapon.muzzle.add(flash);
  const light = new THREE.PointLight(0xffaf57, 0, 3.5, 2);
  light.layers.enable(1);
  weapon.muzzle.add(light);
  let flashTime = 0;
  let time = 0;
  let disposed = false;

  function update(dt = 0, input = {}) {
    if (disposed) return;
    const delta = THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.1);
    time += delta;
    const speed = THREE.MathUtils.clamp((Number(input.speed) || 0) / 5.4, 0, 1);
    const moving = input.moving ? speed : 0;
    const bob = Math.sin(time * 10) * 0.009 * moving;
    const sway = Math.cos(time * 5) * 0.007 * moving;
    const recoil = THREE.MathUtils.clamp(Number(input.recoil) || 0, 0, 2);
    const p = input.reloading ? THREE.MathUtils.clamp(Number(input.reloadProgress) || 0, 0, 1) : 0;
    const tilt = Math.sin(p * Math.PI);
    group.position.set(POSITION.x + sway, POSITION.y + bob - tilt * 0.06, POSITION.z + recoil * 0.04);
    group.rotation.set(recoil * 0.025 + tilt * 0.12, sway * 0.5 - tilt * 0.1, tilt * 0.34);
    left.position.copy(leftPosition);
    left.quaternion.copy(leftQuaternion);
    if (input.reloading) {
      // Procedural wrist animation: magazine, drop, return, fore-end.
      const reach = THREE.MathUtils.smoothstep(p, 0, 0.2) * (1 - THREE.MathUtils.smoothstep(p, 0.78, 1));
      const drop = THREE.MathUtils.smoothstep(p, 0.24, 0.4) * (1 - THREE.MathUtils.smoothstep(p, 0.5, 0.7));
      left.position.lerp(reloadPosition, reach);
      left.position.y -= drop * 0.25;
      left.position.z += drop * 0.14;
      left.quaternion.slerp(reloadQuaternion, reach);
    }
    flashTime = Math.max(0, flashTime - delta);
    flash.visible = flashTime > 0;
    light.intensity = flashTime > 0 ? 3.5 * (flashTime / 0.05) : 0;
  }

  return {
    group, muzzle: weapon.muzzle, update,
    fire() {
      if (disposed) return;
      flashTime = 0.05;
      flash.visible = true;
      flash.rotation.y = Math.random() * Math.PI;
      flash.scale.setScalar(0.8 + Math.random() * 0.4);
      light.intensity = 3.5;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      weapon.dispose();
      flashGeometry.dispose();
      flashMaterial.dispose();
      light.dispose();
      ownedMaterials.forEach((material) => material.dispose());
      group.clear();
    }
  };
}
