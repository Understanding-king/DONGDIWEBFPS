import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCombatant } from './character.js';
import { createViewmodel } from './viewmodel.js';
import { createMovement } from './movement.js';
import { createWeaponState } from './combat.js';
import { loadGltfWithRetry } from './assets.js';

const ROOT = '/models/hd-arena/';

export async function createHdArena(canvas, { onLoad = () => {}, onState = () => {}, onPause = () => {} } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b9ccd1');
  scene.fog = new THREE.Fog('#b9ccd1', 62, 145);
  const camera = new THREE.PerspectiveCamera(74, 1, 0.03, 180);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const skyLight = new THREE.HemisphereLight('#c8e3ff', '#807258', 2.1);
  skyLight.layers.enable(1);
  scene.add(skyLight);
  const sunlight = new THREE.DirectionalLight('#fff0d6', 3.2);
  sunlight.position.set(-26, 38, 20);
  sunlight.target.position.set(0, 0, -4);
  sunlight.castShadow = true;
  sunlight.layers.enable(1);
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 110 });
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.00015;
  scene.add(sunlight, sunlight.target);

  let map, viewmodel, movement;
  const enemies = [];
  try {
    onLoad('载入沙漠庭院', 0.08);
    const [gltf, response] = await Promise.all([
      loadGltfWithRetry(new GLTFLoader(), `${ROOT}desert-courtyard-v1.glb`, (event) => {
        const megabytes = (event.loaded / 1048576).toFixed(1);
        onLoad(`载入沙漠庭院 · ${megabytes} MB`, event.total > 0 ? 0.08 + Math.min(1, event.loaded / event.total) * 0.3 : 0.18);
      }),
      fetch(`${ROOT}collision-v1.json`)
    ]);
    if (!response.ok) throw new Error(`地图数据请求失败 (${response.status})`);
    movement = createMovement(await response.json());
    map = gltf.scene;
    map.name = 'hd-desert-courtyard';
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    map.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      for (const material of [].concat(node.material || [])) {
        if (material.map) material.map.anisotropy = anisotropy;
      }
    });
    scene.add(map);
    onLoad('准备角色与武器', 0.4);
    const positions = [{ x: 0, y: 0, z: -15 }, { x: 9, y: 0, z: -6 }, { x: -10, y: 0, z: 4 }];
    const loaded = await Promise.allSettled([
      createViewmodel(camera),
      ...positions.map((position) => createCombatant(scene, { position, team: 'blue' }))
    ]);
    if (loaded.some((result) => result.status === 'rejected')) {
      loaded.forEach((result) => { if (result.status === 'fulfilled') result.value.dispose(); });
      throw loaded.find((result) => result.status === 'rejected').reason;
    }
    viewmodel = loaded[0].value;
    for (const [index, result] of loaded.slice(1).entries()) {
      const avatar = result.value;
      enemies.push({ avatar, health: 100, deadAt: null, base: positions[index], phase: index * 1.7 });
      avatar.group.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    }
    onLoad('准备就绪', 1);
  } catch (error) {
    disposeScene(scene);
    renderer.dispose();
    throw error;
  }

  const keys = new Set();
  const weapon = createWeaponState();
  const ray = new THREE.Raycaster();
  const shotDirection = new THREE.Vector3();
  const muzzleWorld = new THREE.Vector3();
  const tracerGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracer = new THREE.Line(tracerGeometry, new THREE.LineBasicMaterial({ color: '#ffc477', transparent: true, opacity: 0.65 }));
  tracer.frustumCulled = false;
  tracer.visible = false;
  scene.add(tracer);
  const impact = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe0ab' }));
  impact.visible = false;
  scene.add(impact);
  let yaw = 0, pitch = 0, kills = 0, elapsed = 0, recoil = 0, hitRemaining = 0;
  let effectRemaining = 0, scoreRemaining = 0, scoreLabel = '', trigger = false;
  let locked = false, disposed = false, previousTime = performance.now(), hudClock = 0, raf = 0;
  let audioContext;

  function sound(type) {
    if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    if (type === 'shot') {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.14, audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * 0.2));
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 3800;
      source.connect(filter).connect(gain);
      gain.gain.setValueAtTime(0.22, now);
      source.start();
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } else {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(type === 'hit' ? 880 : 260, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      oscillator.connect(gain); oscillator.start(); oscillator.stop(now + 0.1);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  }

  function shoot() {
    if (!locked || !weapon.fire()) return;
    recoil = Math.min(1, recoil + 0.32);
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(shotDirection);
    ray.set(camera.position, shotDirection);
    ray.near = 0.06;
    ray.far = 100;
    map.updateMatrixWorld(true);
    const wall = ray.intersectObject(map, true)[0];
    let nearest = wall?.distance ?? 100, victim = null, contact = null;
    for (const enemy of enemies) {
      if (enemy.deadAt !== null) continue;
      enemy.avatar.group.updateMatrixWorld(true);
      for (const mesh of enemy.avatar.hitMeshes) mesh.computeBoundingSphere?.();
      const hit = ray.intersectObjects(enemy.avatar.hitMeshes, false)[0];
      if (hit && hit.distance < nearest) { nearest = hit.distance; victim = enemy; contact = hit; }
    }
    if (victim) {
      const headshot = contact.point.y - victim.avatar.group.position.y > 1.5;
      victim.health -= headshot ? 100 : 36;
      hitRemaining = 0.18;
      sound('hit');
      if (victim.health <= 0) {
        victim.deadAt = elapsed;
        kills++;
        scoreLabel = headshot ? '精准爆头 +100' : '目标击倒 +100';
        scoreRemaining = 1.6;
      }
    }
    viewmodel.muzzle.getWorldPosition(muzzleWorld);
    const end = camera.position.clone().addScaledVector(shotDirection, nearest);
    const vertices = tracerGeometry.attributes.position;
    vertices.setXYZ(0, muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
    vertices.setXYZ(1, end.x, end.y, end.z);
    vertices.needsUpdate = true;
    impact.position.copy(end);
    effectRemaining = 0.045;
    tracer.visible = true;
    impact.visible = nearest < 100;
    viewmodel.fire?.();
    sound('shot');
    pitch = Math.min(1.35, pitch + 0.006);
  }

  function clearInput() { keys.clear(); trigger = false; }
  function onKeyDown(event) {
    if (!locked) return;
    if (['Space', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.code === 'KeyR' && !event.repeat && weapon.reload()) sound('reload');
  }
  function onKeyUp(event) { keys.delete(event.code); }
  function onMouseMove(event) {
    if (!locked) return;
    yaw -= event.movementX * 0.002;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.35, 1.35);
  }
  function onMouseDown(event) { if (locked && event.button === 0) { trigger = true; shoot(); } }
  function onMouseUp(event) { if (event.button === 0) trigger = false; }
  function onPointerLock() {
    locked = document.pointerLockElement === canvas;
    clearInput();
    previousTime = performance.now();
    onPause(!locked);
  }
  function onBlur() { clearInput(); if (locked) document.exitPointerLock(); }
  function onVisibility() { if (document.hidden) onBlur(); }
  function resize() {
    const width = canvas.clientWidth || innerWidth, height = canvas.clientHeight || innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  function publishState() {
    onState({ ammo: weapon.ammo, reserve: weapon.reserve, kills, elapsed, speed: movement.speed, crouch: movement.crouch, grounded: movement.grounded, reloading: weapon.reloading, reloadProgress: weapon.reloadProgress, hit: hitRemaining > 0, score: scoreRemaining > 0 ? scoreLabel : '', position: { ...movement.position }, heading: ((-yaw * 180 / Math.PI) % 360 + 360) % 360 });
  }
  function frame(now) {
    if (disposed) return;
    const dt = locked ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    elapsed += dt;
    if (weapon.update(dt)) sound('reload');
    movement.update(dt, {
      forward: Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
      strafe: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
      yaw, jump: keys.has('Space'),
      crouch: keys.has('ControlLeft') || keys.has('ControlRight'),
      walk: keys.has('ShiftLeft') || keys.has('ShiftRight')
    });
    camera.position.set(movement.position.x, movement.position.y + (movement.crouch ? 1.08 : 1.65), movement.position.z);
    camera.rotation.set(pitch, yaw, 0);
    for (const enemy of enemies) {
      if (enemy.deadAt !== null && elapsed - enemy.deadAt > 3) { enemy.avatar.reset(); enemy.health = 100; enemy.deadAt = null; }
      const alive = enemy.deadAt === null;
      const x = enemy.base.x + Math.sin(elapsed * 0.6 + enemy.phase) * 1.7;
      if (alive) {
        enemy.avatar.group.position.x = x;
        enemy.avatar.group.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - enemy.base.z) + Math.PI;
      }
      enemy.avatar.update(dt, { dead: !alive, moving: alive && locked, speed: alive && locked ? Math.abs(Math.cos(elapsed * 0.6 + enemy.phase)) : 0 });
      enemy.avatar.group.visible = alive || elapsed - enemy.deadAt < 2.5;
    }
    recoil = THREE.MathUtils.damp(recoil, 0, 13, dt);
    viewmodel.update(dt, { moving: movement.speed > 0.15 && movement.grounded, speed: movement.speed, reloading: weapon.reloading, reloadProgress: weapon.reloadProgress, recoil });
    if (trigger) shoot();
    effectRemaining -= dt;
    if (effectRemaining <= 0) { tracer.visible = false; impact.visible = false; }
    hitRemaining = Math.max(0, hitRemaining - dt);
    scoreRemaining = Math.max(0, scoreRemaining - dt);
    hudClock += dt;
    if (hudClock >= 0.05 || !locked) { hudClock = 0; publishState(); }
    camera.layers.set(0);
    renderer.render(scene, camera);
    // A separate depth pass keeps the hands out of walls while preserving
    // correct occlusion between fingers, receiver, magazine and fore-end.
    const background = scene.background;
    scene.background = null;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.clearDepth();
    camera.layers.set(1);
    renderer.render(scene, camera);
    camera.layers.set(0);
    renderer.autoClear = true;
    renderer.shadowMap.autoUpdate = true;
    scene.background = background;
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', onBlur);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLock);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  raf = requestAnimationFrame(frame);
  return {
    async start() {
      if (disposed) return;
      if (matchMedia('(pointer: coarse)').matches) throw new Error('请使用电脑键盘和鼠标进入竞技训练');
      if (!canvas.requestPointerLock) throw new Error('当前浏览器不支持鼠标锁定，请使用桌面 Chrome 或 Edge');
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!audioContext && Audio) audioContext = new Audio();
      audioContext?.resume().catch(() => {});
      await canvas.requestPointerLock();
    },
    reset() {
      clearInput(); movement.reset(); weapon.reset(); yaw = 0; pitch = 0; kills = 0; elapsed = 0;
      recoil = 0; scoreRemaining = 0; hitRemaining = 0;
      for (const enemy of enemies) { enemy.avatar.reset(); enemy.health = 100; enemy.deadAt = null; }
      publishState();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      if (locked) document.exitPointerLock();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLock);
      document.removeEventListener('visibilitychange', onVisibility);
      viewmodel.dispose();
      enemies.forEach((enemy) => enemy.avatar.dispose());
      disposeScene(scene);
      audioContext?.close();
      renderer.dispose();
    }
  };
}

function disposeScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    node.shadow?.dispose();
  });
  geometries.forEach((resource) => resource.dispose());
  materials.forEach((resource) => resource.dispose());
  textures.forEach((resource) => resource.dispose());
}
