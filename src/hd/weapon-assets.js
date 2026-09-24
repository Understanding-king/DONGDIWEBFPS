import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadGltfWithRetry } from './assets.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const WEAPON_URL = '/models/hd-arena/ak47-v1.glb';
let sourcePromise;

/** One geometry/texture cache shared by the viewmodel and every combatant. */
async function loadSource() {
  sourcePromise ||= loadGltfWithRetry(new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), WEAPON_URL).then(({ scene: object }) => {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.z) || Math.abs(size.z - 1) > 0.01) throw new Error('AK asset has invalid metre bounds');
    if (!object.getObjectByName('hd-ak47-muzzle')) throw new Error('AK asset is missing its muzzle');
    return object;
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
  const object = source.clone(true);
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
  group.add(object);
  const muzzle = object.getObjectByName('hd-ak47-muzzle');
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
