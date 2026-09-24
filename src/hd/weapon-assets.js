import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const ROOT = '/models/ak-47/';
const TEXTURE = '123456_wire_115115115_';
const RAW_MUZZLE = new THREE.Vector3(0, 26.09, 179.05);
let sourcePromise;

/** One geometry/texture cache shared by the viewmodel and every combatant. */
async function loadSource() {
  sourcePromise ||= Promise.all([
    new OBJLoader().loadAsync(`${ROOT}ak-47.obj`),
    ...['color', 'metalness', 'nmap', 'rough'].map((name) =>
      new THREE.TextureLoader().loadAsync(`${ROOT}${TEXTURE}${name}.png`))
  ]).then(([object, map, metalnessMap, normalMap, roughnessMap]) => {
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map, metalnessMap, normalMap, roughnessMap, metalness: 1, roughness: 1,
      normalScale: new THREE.Vector2(0.7, 0.7)
    });
    const unusedMaterials = new Set();
    object.traverse((node) => {
      if (!node.isMesh) return;
      for (const old of Array.isArray(node.material) ? node.material : [node.material]) {
        if (old) unusedMaterials.add(old);
      }
      node.material = material;
    });
    unusedMaterials.forEach((unused) => unused.dispose());
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.z) || size.z <= 0) throw new Error('AK asset has invalid bounds');
    return { object, center: bounds.getCenter(new THREE.Vector3()), length: size.z };
  }).catch((error) => {
    sourcePromise = undefined;
    throw error;
  });
  return sourcePromise;
}

/** A one metre rifle facing -Z, with its centre and muzzle in metre units. */
export async function createWeapon({ castShadow = false, viewmodel = false } = {}) {
  const source = await loadSource();
  const group = new THREE.Group();
  group.name = 'hd-ak47';
  const facing = new THREE.Group();
  facing.rotation.y = Math.PI;
  const units = new THREE.Group();
  units.scale.setScalar(1 / source.length);
  const object = source.object.clone(true);
  object.position.copy(source.center).negate();
  const ownedMaterials = new Set();
  const materialCopies = new Map();
  object.traverse((node) => {
    if (!node.isMesh) return;
    const clone = (material) => {
      if (!materialCopies.has(material)) {
        const copy = material.clone();
        materialCopies.set(material, copy);
        ownedMaterials.add(copy);
      }
      return materialCopies.get(material);
    };
    node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
    node.castShadow = castShadow;
    node.receiveShadow = !viewmodel;
    node.frustumCulled = !viewmodel;
    if (viewmodel) {
      node.layers.set(1);
      node.renderOrder = 10;
    }
  });
  units.add(object);
  facing.add(units);
  group.add(facing);
  const muzzle = new THREE.Object3D();
  muzzle.name = 'hd-ak47-muzzle';
  muzzle.position.copy(RAW_MUZZLE).sub(source.center).multiplyScalar(1 / source.length);
  muzzle.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  group.add(muzzle);
  let disposed = false;
  return {
    group, muzzle,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      ownedMaterials.forEach((material) => material.dispose());
      // Cached geometry and maps remain alive for other actors and retries.
      group.clear();
    }
  };
}
