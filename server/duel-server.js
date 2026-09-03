import os from 'node:os';
import { WebSocketServer } from 'ws';

const DUEL_WS_PATH = '/duel-ws';
const MAX_TEAM_SIZE = 5;
const MAX_PLAYERS = MAX_TEAM_SIZE * 2;
const MAX_KILLS = 10;
const PLAYER_HEALTH = 100;
const PLAYER_COLLISION_RADIUS = 0.42;
const BOT_COLLISION_RADIUS = 0.42;
const OBSTACLE_CLEARANCE = 0.08;
const RING_OUTER_WALL_HEIGHT = 5.4;
const RING_INNER_WALL_HEIGHT = 4.6;
const MEDIUM_COVER_HEIGHT = 1.55;
const MIN_SHOT_INTERVAL = 82;
const WEAPONS = {
  ak: { minShotInterval: MIN_SHOT_INTERVAL, bodyDamage: 25, headDamage: 49 },
  sniper: { minShotInterval: 820, bodyDamage: 100, headDamage: 150 },
  shotgun: { minShotInterval: 760, bodyDamage: 14, headDamage: 22, pellets: 9 }
};
const CAMERA_HEIGHT = 1.58;
const CROUCH_CAMERA_HEIGHT = 1.08;
const RESPAWN_DELAY = 1800;
const SPAWN_PROTECTION_MS = 1000;
const ICECREAM_INVULN_MS = 5000;
const ICECREAM_COOLDOWN_MS = 18000;
const ROOM_TTL = 1000 * 60 * 30;
const BOT_MOVE_SPEED = 3.45;
const BOT_AIM_ERROR = 0.034;
const BOT_FIRE_MIN = 260;
const BOT_FIRE_MAX = 560;
const BOT_LEAD_TIME = 0.12;
const BOT_DODGE_JITTER = 0.12;
const BOT_NAV_SPACING = 3.4;
const BOT_NAV_REPATH_MS = 850;
const BOT_NAV_TARGET_SHIFT = 2.4;
const BOT_NAV_STUCK_MS = 520;
const TEAM_NAMES = ['red', 'blue'];
const MAP_CONFIGS = {
  park: {
    label: '公园',
    bounds: { minX: -22, maxX: 22, minZ: -46, maxZ: 22 },
    spawns: {
      red: [
        { position: { x: -13.8, y: CAMERA_HEIGHT, z: 16.5 }, yaw: -0.45 },
        { position: { x: -8.5, y: CAMERA_HEIGHT, z: 18.4 }, yaw: -0.22 },
        { position: { x: -18.2, y: CAMERA_HEIGHT, z: 9.4 }, yaw: -0.66 },
        { position: { x: -4.4, y: CAMERA_HEIGHT, z: 11.8 }, yaw: -0.12 },
        { position: { x: -15.4, y: CAMERA_HEIGHT, z: 1.6 }, yaw: -0.72 }
      ],
      blue: [
        { position: { x: 13.8, y: CAMERA_HEIGHT, z: -40.5 }, yaw: Math.PI - 0.45 },
        { position: { x: 8.5, y: CAMERA_HEIGHT, z: -42.4 }, yaw: Math.PI - 0.22 },
        { position: { x: 18.2, y: CAMERA_HEIGHT, z: -33.4 }, yaw: Math.PI - 0.66 },
        { position: { x: 4.4, y: CAMERA_HEIGHT, z: -35.8 }, yaw: Math.PI - 0.12 },
        { position: { x: 15.4, y: CAMERA_HEIGHT, z: -25.6 }, yaw: Math.PI - 0.72 }
      ]
    },
    blockers: [
      { minX: -14.8, maxX: -4.8, minZ: 1.0, maxZ: 2.6 },
      { minX: 5.8, maxX: 15.0, minZ: -27.0, maxZ: -25.4 },
      { minX: -15.8, maxX: -13.8, minZ: -28.0, maxZ: -17.6 },
      { minX: 13.8, maxX: 15.8, minZ: -7.2, maxZ: 3.8 },
      { minX: -8.8, maxX: -4.8, minZ: -28.9, maxZ: -26.7 },
      { minX: 4.8, maxX: 8.8, minZ: 2.7, maxZ: 4.9 },
      { minX: -14.8, maxX: -9.6, minZ: -11.2, maxZ: -8.4 },
      { minX: 9.6, maxX: 14.8, minZ: -15.6, maxZ: -12.8 },
      { minX: -8.3, maxX: -4.5, minZ: -29.4, maxZ: -26.2 },
      { minX: 4.5, maxX: 8.3, minZ: 2.2, maxZ: 5.4 }
    ]
  },
  ring: {
    label: '回型地图',
    bounds: { minX: -28, maxX: 28, minZ: -48, maxZ: 16 },
    spawns: {
      red: [
        { position: { x: -20, y: CAMERA_HEIGHT, z: 10 }, yaw: -0.58 },
        { position: { x: -10, y: CAMERA_HEIGHT, z: 12 }, yaw: -0.25 },
        { position: { x: -24, y: CAMERA_HEIGHT, z: 0 }, yaw: -0.82 },
        { position: { x: 0, y: CAMERA_HEIGHT, z: 11 }, yaw: 0 },
        { position: { x: -17, y: CAMERA_HEIGHT, z: -8 }, yaw: -0.72 }
      ],
      blue: [
        { position: { x: 20, y: CAMERA_HEIGHT, z: -42 }, yaw: Math.PI - 0.58 },
        { position: { x: 10, y: CAMERA_HEIGHT, z: -44 }, yaw: Math.PI - 0.25 },
        { position: { x: 24, y: CAMERA_HEIGHT, z: -32 }, yaw: Math.PI - 0.82 },
        { position: { x: 0, y: CAMERA_HEIGHT, z: -43 }, yaw: Math.PI },
        { position: { x: 17, y: CAMERA_HEIGHT, z: -24 }, yaw: Math.PI - 0.72 }
      ]
    },
    blockers: [
      { minX: -9.5, maxX: 9.5, minZ: -3.55, maxZ: -1.45 },
      { minX: -9.5, maxX: 9.5, minZ: -30.55, maxZ: -28.45 },
      { minX: -10.55, maxX: -8.45, minZ: -29.5, maxZ: -2.5 },
      { minX: 8.45, maxX: 10.55, minZ: -29.5, maxZ: -2.5 },
      { minX: -22.8, maxX: -17.2, minZ: 2.0, maxZ: 4.8 },
      { minX: 17.2, maxX: 22.8, minZ: -36.8, maxZ: -34.0 },
      { minX: -21.6, maxX: -18.4, minZ: -38.2, maxZ: -32.6 },
      { minX: 18.4, maxX: 21.6, minZ: 0.6, maxZ: 6.2 },
      { minX: -16.8, maxX: -13.2, minZ: -17.8, maxZ: -14.2 },
      { minX: 13.2, maxX: 16.8, minZ: -17.8, maxZ: -14.2 }
    ]
  }
};

applyBlockerHeights(MAP_CONFIGS.park.blockers, [MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, 0.78, 0.78, 0.8, 0.8, 1.05, 1.05]);
applyBlockerHeights(MAP_CONFIGS.ring.blockers, [RING_OUTER_WALL_HEIGHT, RING_OUTER_WALL_HEIGHT, RING_OUTER_WALL_HEIGHT, RING_OUTER_WALL_HEIGHT, MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, MEDIUM_COVER_HEIGHT, 0.86, 0.86]);

const rooms = new Map();
const botNavCache = new Map();
const connectedClients = new Set();

let roomSweepTimer = null;

export function attachLanDuelServer(httpServer) {
  if (!httpServer || httpServer.__aimTrainerLanDuelAttached) return;
  httpServer.__aimTrainerLanDuelAttached = true;

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname !== DUEL_WS_PATH) return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const client = createClient(ws, request);
    connectedClients.add(client);
    send(client, {
      type: 'server-info',
      id: client.id,
      addresses: getLanAddresses(getPort(httpServer))
    });

    ws.on('message', (payload) => handleMessage(client, payload));
    ws.on('close', () => removeClient(client));
    ws.on('error', () => removeClient(client));
  });

  const snapshotTimer = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (!room.started) continue;
      updateRoomBots(room, now);
      broadcastRoom(room, makeSnapshot(room));
    }
  }, 50);

  roomSweepTimer ||= setInterval(sweepRooms, 1000 * 60);

  httpServer.on('close', () => {
    clearInterval(snapshotTimer);
    wss.close();
  });
}

function handleMessage(client, payload) {
  let message = null;
  try {
    message = JSON.parse(String(payload));
  } catch {
    send(client, { type: 'error', message: '消息格式错误。' });
    return;
  }

  if (message.type === 'create-room') {
    createRoom(client, message);
    return;
  }
  if (message.type === 'list-rooms') {
    sendRoomList(client);
    return;
  }
  if (message.type === 'join-room') {
    joinRoom(client, message);
    return;
  }
  if (message.type === 'add-bot') {
    addBotToRoom(client);
    return;
  }
  if (message.type === 'ready') {
    setReady(client, true);
    return;
  }
  if (message.type === 'unready') {
    setReady(client, false);
    return;
  }
  if (message.type === 'leave-room') {
    removeClientFromRoom(client, '玩家离开房间。');
    return;
  }
  if (message.type === 'pose') {
    updatePose(client, message);
    return;
  }
  if (message.type === 'shot') {
    handleShot(client, message);
    return;
  }
  if (message.type === 'use-icecream') {
    useIcecream(client);
    return;
  }
  if (message.type === 'ping') {
    send(client, { type: 'pong', time: message.time || Date.now() });
  }
}

function createClient(ws, request) {
  return {
    id: cryptoId(),
    ws,
    ip: request.socket.remoteAddress || '',
    roomCode: '',
    slot: '',
    team: 'red',
    name: '玩家',
    ready: false,
    isBot: false,
    alive: true,
    health: PLAYER_HEALTH,
    kills: 0,
    deaths: 0,
    lastShotAt: 0,
    spawnProtectedUntil: 0,
    icecreamProtectedUntil: 0,
    icecreamCooldownUntil: 0,
    pose: cloneSpawn(getSpawn('park', 'red1')),
    weapon: 'ak'
  };
}

function createRoom(client, message) {
  removeClientFromRoom(client);
  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();

  const room = {
    code,
    hostId: client.id,
    map: sanitizeMap(message.map),
    players: new Map(),
    teamKills: { red: 0, blue: 0 },
    started: false,
    winnerId: '',
    winnerTeam: '',
    botCounter: 0,
    lastBotUpdateAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  addClientToRoom(room, client, sanitizeName(message.name), 'red1');
  broadcastRoomList();
}

function joinRoom(client, message) {
  const code = sanitizeRoomCode(message.roomCode);
  if (!code) {
    send(client, { type: 'error', message: '先输入房间码。' });
    return;
  }

  const currentRoom = getClientRoom(client);
  if (currentRoom?.code === code) {
    send(client, { type: 'error', message: '你已经在这个房间里。开第二个窗口或另一台电脑时要用新的页面会话。' });
    send(client, { type: 'room-update', room: serializeRoom(currentRoom), selfId: client.id });
    return;
  }

  const room = rooms.get(code);
  if (!room) {
    send(client, { type: 'error', message: '没有找到这个房间。' });
    return;
  }
  if (room.players.size >= MAX_PLAYERS) {
    send(client, { type: 'error', message: '房间已经满了。' });
    return;
  }
  if (room.started) {
    send(client, { type: 'error', message: '这局已经开始了，等本局结束再加入。' });
    return;
  }

  const slot = chooseOpenSlot(room);
  if (!slot) {
    send(client, { type: 'error', message: '房间已经满了。' });
    return;
  }

  removeClientFromRoom(client);
  addClientToRoom(room, client, sanitizeName(message.name), slot);
  broadcastRoomList();
}

function addClientToRoom(room, client, name, slot) {
  const team = teamFromSlot(slot);
  client.roomCode = room.code;
  client.slot = slot;
  client.team = team;
  client.name = name;
  client.ready = false;
  client.alive = true;
  client.health = PLAYER_HEALTH;
  client.kills = 0;
  client.deaths = 0;
  client.spawnProtectedUntil = 0;
  client.icecreamProtectedUntil = 0;
  client.icecreamCooldownUntil = 0;
  client.pose = cloneSpawn(getSpawn(room.map, slot));
  room.players.set(slot, client);
  room.updatedAt = Date.now();

  send(client, { type: 'joined-room', roomCode: room.code, selfId: client.id, slot, map: room.map });
  broadcastRoomUpdate(room);
}

function addBotToRoom(client) {
  const room = getClientRoom(client);
  if (!room) {
    send(client, { type: 'error', message: '先创建或加入房间。' });
    return;
  }
  if (room.hostId !== client.id) {
    send(client, { type: 'error', message: '只有房主能添加人机。' });
    return;
  }
  if (room.started) {
    send(client, { type: 'error', message: '开局后不能再加人机。' });
    return;
  }
  if (room.players.size >= MAX_PLAYERS) {
    send(client, { type: 'error', message: '房间已经满了。' });
    return;
  }

  const slot = chooseOpenSlot(room);
  if (!slot) {
    send(client, { type: 'error', message: '房间已经满了。' });
    return;
  }

  room.botCounter += 1;
  const bot = createBot(room, slot, `BOT ${room.botCounter}`);
  room.players.set(slot, bot);
  room.updatedAt = Date.now();
  broadcastRoom(room, { type: 'match-event', message: `${bot.name} 加入 ${teamLabel(bot.team)}。` });
  broadcastRoomUpdate(room);
  broadcastRoomList();
  maybeStartMatch(room);
}

function createBot(room, slot, name) {
  const spawn = getSpawn(room.map, slot);
  return {
    id: `bot-${room.botCounter}-${cryptoId()}`,
    ws: null,
    ip: 'local-bot',
    roomCode: room.code,
    slot,
    team: teamFromSlot(slot),
    name,
    ready: true,
    isBot: true,
    alive: true,
    health: PLAYER_HEALTH,
    kills: 0,
    deaths: 0,
    lastShotAt: 0,
    spawnProtectedUntil: 0,
    icecreamProtectedUntil: 0,
    icecreamCooldownUntil: 0,
    pose: cloneSpawn(spawn),
    weapon: 'ak',
    ai: {
      strafe: Math.random() > 0.5 ? 1 : -1,
      nextStrafeAt: Date.now() + randomBetween(600, 1400),
      nextShotAt: Date.now() + randomBetween(600, 1200),
      navRoute: [],
      navRouteIndex: 0,
      navTarget: null,
      navNextAt: 0,
      navStuckSince: 0,
      navLastPosition: { x: spawn.position.x, z: spawn.position.z }
    }
  };
}

function setReady(client, ready) {
  const room = getClientRoom(client);
  if (!room) return;
  if (room.started && ready) {
    send(client, { type: 'room-update', room: serializeRoom(room), selfId: client.id });
    return;
  }

  client.ready = ready;
  room.updatedAt = Date.now();
  broadcastRoomUpdate(room);
  maybeStartMatch(room);
}

function maybeStartMatch(room) {
  const players = Array.from(room.players.values());
  const humans = players.filter((player) => !player.isBot);
  if (room.started || !humans.length || humans.some((player) => !player.ready)) return;
  if (!hasBothTeams(players)) {
    broadcastRoom(room, { type: 'match-event', message: '至少需要红蓝两边都有人或 BOT 才能开局。' });
    return;
  }

  room.started = true;
  room.winnerId = '';
  room.winnerTeam = '';
  room.teamKills = { red: 0, blue: 0 };
  room.lastBotUpdateAt = Date.now();
  const protectedUntil = Date.now() + SPAWN_PROTECTION_MS;
  players.forEach((player) => {
    player.ready = false;
    player.alive = true;
    player.health = PLAYER_HEALTH;
    player.kills = 0;
    player.deaths = 0;
    player.lastShotAt = 0;
    player.spawnProtectedUntil = protectedUntil;
    player.icecreamProtectedUntil = 0;
    player.icecreamCooldownUntil = 0;
    player.pose = cloneSpawn(getSpawn(room.map, player.slot));
    send(player, { type: 'spawn', position: player.pose.position, yaw: player.pose.yaw, health: player.health, protectionMs: SPAWN_PROTECTION_MS, map: room.map });
  });

  broadcastRoom(room, { type: 'match-start', room: serializeRoom(room) });
  broadcastRoom(room, makeSnapshot(room));
  broadcastRoomList();
}

function updatePose(client, message) {
  const room = getClientRoom(client);
  if (!room || !room.started || !client.alive) return;

  const config = getMapConfig(room.map);
  const bounds = config.bounds;
  client.pose = {
    position: sanitizePosition(message.position, client.pose.position, bounds, config.blockers, PLAYER_COLLISION_RADIUS, Boolean(message.crouch)),
    yaw: clampNumber(message.yaw, -Math.PI * 2, Math.PI * 2, client.pose.yaw),
    pitch: clampNumber(message.pitch, -1.2, 1.2, client.pose.pitch || 0),
    ads: Boolean(message.ads),
    weapon: sanitizeWeapon(message.weapon),
    crouch: Boolean(message.crouch),
    airborne: Boolean(message.airborne),
    moving: Boolean(message.moving),
    speed: clampNumber(message.speed, 0, 10, 0)
  };
  client.weapon = client.pose.weapon;
  room.updatedAt = Date.now();
}

function handleShot(client, message) {
  const room = getClientRoom(client);
  if (!room || !room.started || !client.alive) return;

  const now = Date.now();
  const weaponName = sanitizeWeapon(message.weapon);
  const weapon = WEAPONS[weaponName] || WEAPONS.ak;
  if (now - client.lastShotAt < weapon.minShotInterval) return;
  client.lastShotAt = now;

  const origin = sanitizeVector(message.origin);
  const direction = normalizeVector(sanitizeVector(message.direction));
  if (!origin || !direction) return;
  const traceEnd = getServerTraceEnd(room, origin, direction, 80);

  const shotEvent = {
    type: 'shot',
    shooterId: client.id,
    weapon: weaponName,
    start: origin,
    end: traceEnd
  };
  broadcastRoom(room, shotEvent, client.id);

  if (weaponName === 'shotgun') {
    handleShotgunDamage(room, client, origin, direction, message.pellets, weapon, now);
    return;
  }

  const target = findShotTarget(room, client, origin, direction, weapon, now);
  if (!target) return;
  applyDamage(room, client, target.player, target.hit, now);
}

function useIcecream(client) {
  const room = getClientRoom(client);
  if (!room || !room.started || !client.alive) return;

  const now = Date.now();
  if (client.icecreamCooldownUntil > now) {
    send(client, { type: 'icecream-denied', remainingMs: client.icecreamCooldownUntil - now });
    return;
  }

  client.icecreamProtectedUntil = now + ICECREAM_INVULN_MS;
  client.spawnProtectedUntil = Math.max(client.spawnProtectedUntil || 0, client.icecreamProtectedUntil);
  client.icecreamCooldownUntil = now + ICECREAM_COOLDOWN_MS;
  room.updatedAt = now;
  broadcastRoom(room, {
    type: 'icecream-used',
    playerId: client.id,
    playerName: client.name,
    durationMs: ICECREAM_INVULN_MS,
    cooldownMs: ICECREAM_COOLDOWN_MS
  });
  broadcastRoom(room, { type: 'match-event', message: `${client.name} 吃下巧乐兹。` }, client.id);
}

function handleShotgunDamage(room, client, origin, fallbackDirection, pelletPayloads, weapon, now) {
  const pelletDirections = Array.isArray(pelletPayloads)
    ? pelletPayloads.slice(0, 12).map((item) => normalizeVector(sanitizeVector(item))).filter(Boolean)
    : [];
  if (!pelletDirections.length) pelletDirections.push(fallbackDirection);

  const hitsByPlayer = new Map();
  pelletDirections.forEach((direction) => {
    const target = findShotTarget(room, client, origin, direction, weapon, now);
    if (!target) return;
    const previous = hitsByPlayer.get(target.player.id) || { player: target.player, damage: 0, headshot: false };
    previous.damage += target.hit.damage;
    previous.headshot ||= target.hit.headshot;
    hitsByPlayer.set(target.player.id, previous);
  });

  hitsByPlayer.forEach((entry) => {
    applyDamage(room, client, entry.player, {
      damage: Math.min(PLAYER_HEALTH, entry.damage),
      headshot: entry.headshot
    }, now);
  });
}

function findShotTarget(room, shooter, origin, direction, weapon, now) {
  let best = null;
  room.players.forEach((player) => {
    if (player.id === shooter.id || player.team === shooter.team || !player.alive) return;
    if (!hasServerLineOfSight(room, origin, player.pose.position || player.pose)) return;
    const hit = testPlayerHit(origin, direction, player.pose, weapon);
    if (!hit) return;
    if (isServerShotBlocked(room, origin, addScaled(origin, direction, hit.t))) return;
    if (!best || hit.t < best.hit.t) best = { player, hit };
  });
  return best;
}

function applyDamage(room, attacker, victim, hit, now) {
  if (!victim.alive) return;
  if (victim.spawnProtectedUntil > now) {
    if (victim.icecreamProtectedUntil > now) {
      send(victim, {
        type: 'icecream-blocked',
        remainingMs: victim.icecreamProtectedUntil - now
      });
    }
    return;
  }

  victim.health = Math.max(0, victim.health - hit.damage);
  send(attacker, {
    type: 'hit-confirm',
    victimId: victim.id,
    victimName: victim.name,
    damage: hit.damage,
    headshot: hit.headshot,
    health: victim.health
  });
  send(victim, {
    type: 'damage',
    attackerId: attacker.id,
    attackerName: attacker.name,
    damage: hit.damage,
    headshot: hit.headshot,
    health: victim.health
  });

  if (victim.health > 0) return;
  killPlayer(room, attacker, victim, hit.headshot);
}

function killPlayer(room, killer, victim, headshot) {
  if (!victim.alive && victim.health <= 0) return;

  victim.alive = false;
  victim.health = 0;
  victim.deaths += 1;
  killer.kills += 1;
  room.teamKills[killer.team] = (room.teamKills[killer.team] || 0) + 1;
  room.updatedAt = Date.now();
  broadcastRoom(room, {
    type: 'kill',
    killerId: killer.id,
    victimId: victim.id,
    killerName: killer.name,
    victimName: victim.name,
    killerTeam: killer.team,
    victimTeam: victim.team,
    headshot
  });

  if ((room.teamKills[killer.team] || 0) >= MAX_KILLS) {
    endMatch(room, killer.team, killer.id);
    return;
  }

  setTimeout(() => respawnPlayer(room.code, victim.id), RESPAWN_DELAY);
}

function testPlayerHit(origin, direction, targetPose, weapon) {
  const targetPosition = targetPose.position || targetPose;
  const metrics = getPostureMetrics(Boolean(targetPose.crouch));
  const baseY = targetPosition.y - metrics.eyeHeight;
  const bodyStart = { x: targetPosition.x, y: baseY + metrics.bodyStart, z: targetPosition.z };
  const bodyEnd = { x: targetPosition.x, y: baseY + metrics.bodyEnd, z: targetPosition.z };
  const headCenter = { x: targetPosition.x, y: baseY + metrics.headY, z: targetPosition.z };

  const head = raySphereDistance(origin, direction, headCenter, metrics.headRadius);
  if (head.hit && head.t > 0 && head.t < 80) return { damage: weapon.headDamage, headshot: true, t: head.t };

  const bodyDistance = raySegmentDistance(origin, direction, bodyStart, bodyEnd);
  if (bodyDistance.distance <= metrics.bodyRadius && bodyDistance.tRay > 0 && bodyDistance.tRay < 80) {
    return { damage: weapon.bodyDamage, headshot: false, t: bodyDistance.tRay };
  }
  return null;
}

function getPostureMetrics(crouch = false) {
  return crouch
    ? { eyeHeight: CROUCH_CAMERA_HEIGHT, bodyStart: 0.22, bodyEnd: 1.03, bodyRadius: 0.46, headY: 1.18, headRadius: 0.25 }
    : { eyeHeight: CAMERA_HEIGHT, bodyStart: 0.28, bodyEnd: 1.48, bodyRadius: 0.42, headY: 1.68, headRadius: 0.28 };
}

function updateRoomBots(room, now) {
  const delta = Math.min(0.08, Math.max(0.001, (now - (room.lastBotUpdateAt || now)) / 1000));
  room.lastBotUpdateAt = now;
  room.players.forEach((player) => {
    if (!player.isBot || !player.alive) return;
    updateBot(room, player, delta, now);
  });
}

function getBotNavGraph(mapId) {
  const normalizedMap = sanitizeMap(mapId);
  if (botNavCache.has(normalizedMap)) return botNavCache.get(normalizedMap);
  const config = getMapConfig(normalizedMap);
  const margin = BOT_COLLISION_RADIUS + 0.34;
  const minX = config.bounds.minX + margin;
  const maxX = config.bounds.maxX - margin;
  const minZ = config.bounds.minZ + margin;
  const maxZ = config.bounds.maxZ - margin;
  const cols = Math.max(2, Math.ceil((maxX - minX) / BOT_NAV_SPACING));
  const rows = Math.max(2, Math.ceil((maxZ - minZ) / BOT_NAV_SPACING));
  const nodes = [];
  const byKey = new Map();
  for (let row = 0; row <= rows; row += 1) {
    const z = minZ + (maxZ - minZ) * (row / rows);
    for (let col = 0; col <= cols; col += 1) {
      const x = minX + (maxX - minX) * (col / cols);
      const resolved = resolveServerCollision(x, z, config.blockers, BOT_COLLISION_RADIUS, 0);
      if (resolved.collided || Math.hypot(resolved.x - x, resolved.z - z) > 0.04) continue;
      const node = { id: `${col}:${row}`, col, row, x, z };
      nodes.push(node);
      byKey.set(node.id, node);
    }
  }
  const graph = { normalizedMap, nodes, byKey };
  botNavCache.set(normalizedMap, graph);
  return graph;
}

function isBotNavSegmentClear(a, b, mapId) {
  const blockers = getMapConfig(mapId).blockers || [];
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(distance / 0.42));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const resolved = resolveServerCollision(x, z, blockers, BOT_COLLISION_RADIUS, 0);
    if (resolved.collided || Math.hypot(resolved.x - x, resolved.z - z) > 0.04) return false;
  }
  return true;
}

function findNearestBotNavNode(graph, position) {
  let best = null;
  let bestDistance = Infinity;
  graph.nodes.forEach((node) => {
    const distance = Math.hypot(node.x - position.x, node.z - position.z);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });
  return best;
}

export function findBotNavRoute(start, target, mapId) {
  const graph = getBotNavGraph(mapId);
  const startNode = findNearestBotNavNode(graph, start);
  const targetNode = findNearestBotNavNode(graph, target);
  if (!startNode || !targetNode) return [{ x: target.x, z: target.z }];
  if (isBotNavSegmentClear(start, target, mapId)) return [{ x: target.x, z: target.z }];

  const open = new Set([startNode.id]);
  const cameFrom = new Map();
  const gScore = new Map([[startNode.id, 0]]);
  const fScore = new Map([[startNode.id, Math.hypot(startNode.x - targetNode.x, startNode.z - targetNode.z)]]);
  const getLowest = () => {
    let current = null;
    let best = Infinity;
    open.forEach((id) => {
      const score = fScore.get(id) ?? Infinity;
      if (score < best) { best = score; current = id; }
    });
    return current;
  };

  let guard = 0;
  while (open.size && guard < 900) {
    guard += 1;
    const currentId = getLowest();
    if (!currentId) break;
    if (currentId === targetNode.id) {
      const route = [];
      let cursor = currentId;
      while (cursor) {
        const node = graph.byKey.get(cursor);
        if (node) route.unshift({ x: node.x, z: node.z });
        cursor = cameFrom.get(cursor);
      }
      route.push({ x: target.x, z: target.z });
      return route.slice(1);
    }
    open.delete(currentId);
    const current = graph.byKey.get(currentId);
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (!rowOffset && !colOffset) continue;
        const neighbor = graph.byKey.get(`${current.col + colOffset}:${current.row + rowOffset}`);
        if (!neighbor) continue;
        if (Math.abs(rowOffset) + Math.abs(colOffset) === 2) {
          if (!graph.byKey.has(`${current.col + colOffset}:${current.row}`) || !graph.byKey.has(`${current.col}:${current.row + rowOffset}`)) continue;
        }
        if (!isBotNavSegmentClear(current, neighbor, mapId)) continue;
        const tentative = (gScore.get(currentId) ?? Infinity) + Math.hypot(neighbor.x - current.x, neighbor.z - current.z);
        if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) continue;
        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentative);
        fScore.set(neighbor.id, tentative + Math.hypot(neighbor.x - targetNode.x, neighbor.z - targetNode.z));
        open.add(neighbor.id);
      }
    }
  }
  return [{ x: target.x, z: target.z }];
}

function getBotNavigationIntent(bot, position, target, now, mapId) {
  const targetPoint = { x: target.x, z: target.z };
  const ai = bot.ai;
  const targetShift = ai.navTarget ? Math.hypot(ai.navTarget.x - targetPoint.x, ai.navTarget.z - targetPoint.z) : Infinity;
  const needsRepath = !ai.navTarget || !ai.navRoute.length || ai.navRouteIndex >= ai.navRoute.length ||
    targetShift > BOT_NAV_TARGET_SHIFT || now >= ai.navNextAt || (ai.navStuckSince && now - ai.navStuckSince > BOT_NAV_STUCK_MS);
  if (needsRepath) {
    ai.navRoute = findBotNavRoute(position, targetPoint, mapId);
    ai.navRouteIndex = 0;
    ai.navTarget = targetPoint;
    ai.navNextAt = now + BOT_NAV_REPATH_MS;
    ai.navStuckSince = 0;
  }
  let waypoint = ai.navRoute[ai.navRouteIndex] || targetPoint;
  if (Math.hypot(waypoint.x - position.x, waypoint.z - position.z) < 0.75 && ai.navRouteIndex < ai.navRoute.length - 1) {
    ai.navRouteIndex += 1;
    waypoint = ai.navRoute[ai.navRouteIndex];
  }
  return waypoint;
}

function updateBot(room, bot, delta, now) {
  const target = findNearestEnemy(room, bot);
  if (!target) {
    bot.ai.nextShotAt = Math.max(bot.ai.nextShotAt, now + 180);
    return;
  }

  const config = getMapConfig(room.map);
  const bounds = config.bounds;
  const position = bot.pose.position;
  const targetPosition = target.pose.position || target.pose;
  const dx = targetPosition.x - position.x;
  const dz = targetPosition.z - position.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const forward = { x: dx / distance, z: dz / distance };
  const right = { x: forward.z, z: -forward.x };
  const previous = { x: position.x, z: position.z };
  const visibleTarget = getServerVisibleTargetPoint(room, position, target);
  const botCanSee = Boolean(visibleTarget);
  const movementTarget = botCanSee ? targetPosition : getBotNavigationIntent(bot, position, targetPosition, now, room.map);
  const moveDx = movementTarget.x - position.x;
  const moveDz = movementTarget.z - position.z;
  const moveDistance = Math.max(0.001, Math.hypot(moveDx, moveDz));
  const moveForward = { x: moveDx / moveDistance, z: moveDz / moveDistance };
  const moveRight = { x: moveForward.z, z: -moveForward.x };

  if (now >= bot.ai.nextStrafeAt) {
    bot.ai.strafe = Math.random() > 0.5 ? 1 : -1;
    bot.ai.nextStrafeAt = now + randomBetween(520, 1100);
  }

  const rangeIntent = !botCanSee ? 1 : distance > 10.5 ? 0.82 : distance < 5.2 ? -0.66 : 0.08;
  const lateralIntent = bot.ai.strafe + Math.sin(now * 0.007 + bot.id.length) * BOT_DODGE_JITTER;
  const strafeVector = botCanSee ? right : moveRight;
  const advanceVector = botCanSee ? forward : moveForward;
  position.x += (strafeVector.x * lateralIntent + advanceVector.x * rangeIntent) * BOT_MOVE_SPEED * delta;
  position.z += (strafeVector.z * lateralIntent + advanceVector.z * rangeIntent) * BOT_MOVE_SPEED * delta;
  position.x = clampNumber(position.x, bounds.minX, bounds.maxX, position.x);
  position.z = clampNumber(position.z, bounds.minZ, bounds.maxZ, position.z);
  const resolvedBot = resolveServerCollision(position.x, position.z, config.blockers, BOT_COLLISION_RADIUS);
  if (resolvedBot.collided) {
    position.x = clampNumber(resolvedBot.x, bounds.minX, bounds.maxX, position.x);
    position.z = clampNumber(resolvedBot.z, bounds.minZ, bounds.maxZ, position.z);
    bot.ai.strafe *= -1;
    bot.ai.nextStrafeAt = now + randomBetween(520, 1100);
  }

  const speed = Math.hypot(position.x - previous.x, position.z - previous.z) / Math.max(delta, 0.001);
  if (!botCanSee && speed < 0.08 && Math.abs(rangeIntent) > 0.5) bot.ai.navStuckSince = bot.ai.navStuckSince || now;
  else if (speed > 0.12) bot.ai.navStuckSince = 0;
  bot.pose.yaw = Math.atan2(-forward.x, -forward.z);
  bot.pose.pitch = clampNumber((targetPosition.y - position.y) / Math.max(1, distance), -0.42, 0.42, 0);
  bot.pose.ads = false;
  bot.pose.weapon = 'ak';
  bot.pose.crouch = false;
  bot.pose.airborne = false;
  bot.pose.moving = speed > 0.08;
  bot.pose.speed = speed;
  bot.weapon = 'ak';

  if (now < bot.ai.nextShotAt) return;
  bot.ai.nextShotAt = now + randomBetween(BOT_FIRE_MIN, BOT_FIRE_MAX);
  botFire(room, bot, target, now);
}

function getPredictedBotTarget(pose) {
  const position = pose.position || pose;
  const predicted = { ...position };
  const speed = clampNumber(pose.speed, 0, 8, 0);
  if (pose.moving && speed > 0.1) {
    const yaw = clampNumber(pose.yaw, -Math.PI * 2, Math.PI * 2, 0);
    predicted.x += -Math.sin(yaw) * speed * BOT_LEAD_TIME;
    predicted.z += -Math.cos(yaw) * speed * BOT_LEAD_TIME;
  }
  predicted.y += 0.08;
  return predicted;
}

function botFire(room, bot, target, now) {
  const origin = { ...bot.pose.position };
  const visibleTarget = getServerVisibleTargetPoint(room, origin, target);
  if (!visibleTarget) return;
  const targetPosition = getPredictedBotTarget({ ...target.pose, position: visibleTarget });
  const direction = normalizeVector({
    x: targetPosition.x - origin.x + randomBetween(-BOT_AIM_ERROR, BOT_AIM_ERROR),
    y: targetPosition.y - origin.y + randomBetween(-BOT_AIM_ERROR * 0.42, BOT_AIM_ERROR * 0.42),
    z: targetPosition.z - origin.z + randomBetween(-BOT_AIM_ERROR, BOT_AIM_ERROR)
  });
  if (!direction) return;

  bot.lastShotAt = now;
  const traceEnd = getServerTraceEnd(room, origin, direction, 80);
  broadcastRoom(room, {
    type: 'shot',
    shooterId: bot.id,
    weapon: 'ak',
    start: origin,
    end: traceEnd
  });

  if (!target.alive) return;
  const hit = testPlayerHit(origin, direction, target.pose, WEAPONS.ak);
  if (hit && !isServerShotBlocked(room, origin, addScaled(origin, direction, hit.t))) {
    applyDamage(room, bot, target, hit, now);
  }
}

function findNearestEnemy(room, player) {
  let nearest = null;
  let nearestDistance = Infinity;
  const position = player.pose.position;
  room.players.forEach((candidate) => {
    if (candidate.id === player.id || candidate.team === player.team || !candidate.alive) return;
    const candidatePosition = candidate.pose.position || candidate.pose;
    const distance = distanceBetween(position, candidatePosition);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  });
  return nearest;
}

function hasServerLineOfSight(room, origin, target) {
  const blockers = getMapConfig(room.map).blockers || [];
  return !blockers.some((blocker) => segmentIntersectsRect(origin, target, blocker));
}

export function getServerVisibleTargetPoint(room, origin, target) {
  const pose = target.pose || target;
  const position = pose.position || pose;
  const crouch = Boolean(pose.crouch);
  const headY = crouch ? 1.18 : 1.68;
  const chestY = crouch ? 0.86 : 1.3;
  const head = { x: position.x, y: Math.max(position.y - CAMERA_HEIGHT, 0) + headY, z: position.z };
  if (hasServerLineOfSight(room, origin, head)) return head;
  const chest = { x: position.x, y: Math.max(position.y - CAMERA_HEIGHT, 0) + chestY, z: position.z };
  if (hasServerLineOfSight(room, origin, chest)) return chest;
  return null;
}

function isServerShotBlocked(room, origin, end) {
  const blockers = getMapConfig(room.map).blockers || [];
  return blockers.some((blocker) => segmentIntersectsRect(origin, end, blocker, 0.015));
}

function getServerTraceEnd(room, origin, direction, distance = 80) {
  const end = addScaled(origin, direction, distance);
  const blockers = getMapConfig(room.map).blockers || [];
  let bestT = null;
  blockers.forEach((blocker) => {
    const t = segmentIntersectsRect(origin, end, blocker, 0.015, true);
    if (t === null) return;
    if (bestT === null || t < bestT) bestT = t;
  });
  return bestT === null ? end : {
    x: origin.x + (end.x - origin.x) * bestT,
    y: origin.y + (end.y - origin.y) * bestT,
    z: origin.z + (end.z - origin.z) * bestT
  };
}

function segmentIntersectsRect(a, b, rect, padding = 0, returnT = false) {
  if (pointInRect(a, rect, padding) || pointInRect(b, rect, padding)) return returnT ? null : false;
  let tMin = 0;
  let tMax = 1;
  const dx = b.x - a.x;
  const dy = (b.y ?? CAMERA_HEIGHT) - (a.y ?? CAMERA_HEIGHT);
  const dz = b.z - a.z;
  const checks = [
    [-dx, a.x - (rect.minX - padding)],
    [dx, rect.maxX + padding - a.x],
    [-dz, a.z - (rect.minZ - padding)],
    [dz, rect.maxZ + padding - a.z],
    [-dy, (a.y ?? CAMERA_HEIGHT) - ((rect.minY ?? 0) - padding)],
    [dy, (rect.maxY ?? 2.2) + padding - (a.y ?? CAMERA_HEIGHT)]
  ];

  for (const [p, q] of checks) {
    if (Math.abs(p) < 0.000001) {
      if (q < 0) return returnT ? null : false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return returnT ? null : false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return returnT ? null : false;
      if (t < tMax) tMax = t;
    }
  }

  const hit = tMax >= tMin && tMax > 0 && tMin < 1;
  if (returnT) return hit ? Math.max(0, tMin) : null;
  return hit;
}

function pointInRect(point, rect, padding = 0) {
  const y = point.y ?? CAMERA_HEIGHT;
  return point.x >= rect.minX - padding &&
    point.x <= rect.maxX + padding &&
    point.z >= rect.minZ - padding &&
    point.z <= rect.maxZ + padding &&
    y >= (rect.minY ?? 0) - padding &&
    y <= (rect.maxY ?? 2.2) + padding;
}

function applyBlockerHeights(blockers, heights) {
  blockers.forEach((blocker, index) => {
    blocker.minY = 0;
    blocker.maxY = heights[index] ?? 1.1;
  });
}

function resolveServerCollision(x, z, blockers = [], radius = PLAYER_COLLISION_RADIUS, feetY = 0) {
  let resolvedX = x;
  let resolvedZ = z;
  let collided = false;

  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    blockers.forEach((blocker) => {
      if ((blocker.maxY ?? 2.2) <= feetY + OBSTACLE_CLEARANCE) return;
      const next = resolvePointAgainstRect(resolvedX, resolvedZ, blocker, radius);
      if (!next) return;
      resolvedX = next.x;
      resolvedZ = next.z;
      collided = true;
      moved = true;
    });
    if (!moved) break;
  }

  return { x: resolvedX, z: resolvedZ, collided };
}

function resolvePointAgainstRect(x, z, rect, radius) {
  const minX = rect.minX - radius;
  const maxX = rect.maxX + radius;
  const minZ = rect.minZ - radius;
  const maxZ = rect.maxZ + radius;
  if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) return null;

  const pushLeft = Math.abs(x - minX);
  const pushRight = Math.abs(maxX - x);
  const pushBack = Math.abs(z - minZ);
  const pushFront = Math.abs(maxZ - z);
  const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);

  if (minPush === pushLeft) return { x: minX, z };
  if (minPush === pushRight) return { x: maxX, z };
  if (minPush === pushBack) return { x, z: minZ };
  return { x, z: maxZ };
}

function respawnPlayer(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room || !room.started) return;
  const player = Array.from(room.players.values()).find((item) => item.id === playerId);
  if (!player || player.alive) return;

  player.alive = true;
  player.health = PLAYER_HEALTH;
  player.spawnProtectedUntil = Date.now() + SPAWN_PROTECTION_MS;
  player.icecreamProtectedUntil = 0;
  player.pose = cloneSpawn(getSpawn(room.map, player.slot));
  if (player.isBot && player.ai) {
    player.ai.navRoute = [];
    player.ai.navRouteIndex = 0;
    player.ai.navTarget = null;
    player.ai.navNextAt = 0;
    player.ai.navStuckSince = 0;
    player.ai.navLastPosition = { x: player.pose.position.x, z: player.pose.position.z };
  }
  send(player, { type: 'spawn', position: player.pose.position, yaw: player.pose.yaw, health: player.health, protectionMs: SPAWN_PROTECTION_MS, map: room.map });
  broadcastRoom(room, { type: 'respawn', playerId: player.id, playerName: player.name });
}

function endMatch(room, winnerTeam, winnerId = '') {
  room.started = false;
  room.winnerId = winnerId;
  room.winnerTeam = winnerTeam;
  room.updatedAt = Date.now();
  room.players.forEach((player) => {
    player.ready = false;
    player.alive = true;
    player.health = PLAYER_HEALTH;
  });
  broadcastRoom(room, { type: 'match-over', winnerId, winnerTeam, room: serializeRoom(room) });
  broadcastRoomUpdate(room);
  broadcastRoomList();
}

function removeClient(client) {
  connectedClients.delete(client);
  removeClientFromRoom(client, '玩家断开连接。');
  try {
    client.ws.close();
  } catch {
    // Socket is already gone.
  }
}

function removeClientFromRoom(client, reason = '') {
  const room = getClientRoom(client);
  if (!room) return;

  room.players.delete(client.slot);
  room.started = false;
  room.updatedAt = Date.now();
  client.roomCode = '';
  client.slot = '';
  client.team = 'red';
  client.ready = false;

  const humans = Array.from(room.players.values()).filter((player) => !player.isBot);
  if (!humans.length) {
    rooms.delete(room.code);
    broadcastRoomList();
    return;
  }

  if (!humans.some((player) => player.id === room.hostId)) {
    room.hostId = humans[0].id;
  }

  room.players.forEach((player) => {
    player.ready = player.isBot;
    player.alive = true;
    player.health = PLAYER_HEALTH;
    if (reason) send(player, { type: 'match-event', message: reason });
  });
  broadcastRoomUpdate(room);
  broadcastRoomList();
}

function getClientRoom(client) {
  return client.roomCode ? rooms.get(client.roomCode) : null;
}

function broadcastRoomUpdate(room) {
  broadcastRoom(room, { type: 'room-update', room: serializeRoom(room) });
}

function sendRoomList(client) {
  send(client, { type: 'room-list', rooms: serializeRoomList() });
}

function broadcastRoomList() {
  const message = { type: 'room-list', rooms: serializeRoomList() };
  connectedClients.forEach((client) => send(client, message));
}

function serializeRoomList() {
  return Array.from(rooms.values())
    .filter((room) => !room.started && room.players.size < MAX_PLAYERS)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((room) => {
      const players = Array.from(room.players.values());
      return {
        code: room.code,
        map: room.map,
        mapLabel: getMapConfig(room.map).label,
        playerCount: players.length,
        maxPlayers: MAX_PLAYERS,
        redCount: players.filter((player) => player.team === 'red').length,
        blueCount: players.filter((player) => player.team === 'blue').length,
        hostName: players.find((player) => player.id === room.hostId)?.name || '房主',
        openSlots: MAX_PLAYERS - players.length
      };
    });
}

function makeSnapshot(room) {
  return {
    type: 'snapshot',
    roomCode: room.code,
    map: room.map,
    teamKills: { ...room.teamKills },
    players: Array.from(room.players.values()).map(serializePlayer)
  };
}

function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    map: room.map,
    started: room.started,
    winnerId: room.winnerId,
    winnerTeam: room.winnerTeam,
    maxKills: MAX_KILLS,
    maxPlayers: MAX_PLAYERS,
    maxTeamSize: MAX_TEAM_SIZE,
    teamKills: { ...room.teamKills },
    players: Array.from(room.players.values()).map(serializePlayer)
  };
}

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    slot: player.slot,
    team: player.team || teamFromSlot(player.slot),
    ready: player.ready,
    isBot: Boolean(player.isBot),
    alive: player.alive,
    health: player.health,
    kills: player.kills,
    deaths: player.deaths,
    spawnProtected: player.spawnProtectedUntil > Date.now(),
    icecreamProtected: player.icecreamProtectedUntil > Date.now(),
    weapon: player.weapon,
    pose: player.pose
  };
}

function broadcastRoom(room, message, exceptId = '') {
  room.players.forEach((player) => {
    if (player.id !== exceptId) send(player, message);
  });
}

function send(client, message) {
  if (!client?.ws || client.ws.readyState !== 1) return;
  client.ws.send(JSON.stringify(message));
}

function chooseOpenSlot(room) {
  const redCount = countTeam(room, 'red');
  const blueCount = countTeam(room, 'blue');
  const preferredTeams = redCount <= blueCount ? ['red', 'blue'] : ['blue', 'red'];
  for (const team of preferredTeams) {
    for (let index = 1; index <= MAX_TEAM_SIZE; index += 1) {
      const slot = `${team}${index}`;
      if (!room.players.has(slot)) return slot;
    }
  }
  return '';
}

function countTeam(room, team) {
  return Array.from(room.players.values()).filter((player) => player.team === team || teamFromSlot(player.slot) === team).length;
}

function hasBothTeams(players) {
  return TEAM_NAMES.every((team) => players.some((player) => player.team === team || teamFromSlot(player.slot) === team));
}

function teamFromSlot(slot) {
  return String(slot || '').startsWith('blue') ? 'blue' : 'red';
}

function teamLabel(team) {
  return team === 'blue' ? '蓝方' : '红方';
}

function sanitizeName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  return name || '玩家';
}

function sanitizeRoomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function sanitizeWeapon(value) {
  return WEAPONS[value] ? value : 'ak';
}

function sanitizeMap(value) {
  return MAP_CONFIGS[value] ? value : 'park';
}

function getMapConfig(map) {
  return MAP_CONFIGS[sanitizeMap(map)] || MAP_CONFIGS.park;
}

function getSpawn(map, slot) {
  const config = getMapConfig(map);
  const team = teamFromSlot(slot);
  const number = Math.max(1, Number(String(slot || '').match(/\d+/)?.[0]) || 1);
  const spawns = config.spawns[team] || config.spawns.red;
  return spawns[(number - 1) % spawns.length];
}

function sanitizePosition(value, fallback, bounds, blockers = [], radius = PLAYER_COLLISION_RADIUS, crouch = false) {
  const safeBounds = bounds || MAP_CONFIGS.park.bounds;
  const rawX = clampNumber(value?.x, safeBounds.minX, safeBounds.maxX, fallback.x);
  const rawY = clampNumber(value?.y, 0.75, CAMERA_HEIGHT + 1.25, fallback.y ?? CAMERA_HEIGHT);
  const rawZ = clampNumber(value?.z, safeBounds.minZ, safeBounds.maxZ, fallback.z);
  const feetY = Math.max(0, rawY - (crouch ? CROUCH_CAMERA_HEIGHT : CAMERA_HEIGHT));
  const resolved = resolveServerCollision(rawX, rawZ, blockers, radius, feetY);
  return {
    x: clampNumber(resolved.x, safeBounds.minX, safeBounds.maxX, rawX),
    y: rawY,
    z: clampNumber(resolved.z, safeBounds.minZ, safeBounds.maxZ, rawZ)
  };
}

function sanitizeVector(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

function normalizeVector(vector) {
  if (!vector) return null;
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length < 0.0001) return null;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function cloneSpawn(spawn) {
  return {
    position: { ...spawn.position },
    yaw: spawn.yaw,
    pitch: 0,
    ads: false,
    weapon: 'ak',
    crouch: false,
    airborne: false,
    moving: false,
    speed: 0
  };
}

function addScaled(origin, direction, scale) {
  return {
    x: origin.x + direction.x * scale,
    y: origin.y + direction.y * scale,
    z: origin.z + direction.z * scale
  };
}

function raySphereDistance(origin, direction, center, radius = 0.3) {
  const toCenter = {
    x: center.x - origin.x,
    y: center.y - origin.y,
    z: center.z - origin.z
  };
  const t = dot(toCenter, direction);
  const closest = addScaled(origin, direction, t);
  const distance = distanceBetween(closest, center);
  return { hit: distance <= radius, t, distance };
}

function raySegmentDistance(origin, direction, segmentStart, segmentEnd) {
  const segment = subtract(segmentEnd, segmentStart);
  const w0 = subtract(origin, segmentStart);
  const a = dot(direction, direction);
  const b = dot(direction, segment);
  const c = dot(segment, segment);
  const d = dot(direction, w0);
  const e = dot(segment, w0);
  const denom = a * c - b * b;

  let tRay = 0;
  let tSegment = 0;
  if (Math.abs(denom) > 0.000001) {
    tRay = (b * e - c * d) / denom;
    tSegment = (a * e - b * d) / denom;
  }
  tSegment = clampNumber(tSegment, 0, 1, 0);
  if (tRay < 0) tRay = 0;

  const pointOnRay = addScaled(origin, direction, tRay);
  const pointOnSegment = addScaled(segmentStart, segment, tSegment);
  return { distance: distanceBetween(pointOnRay, pointOnSegment), tRay, tSegment };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function cryptoId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function getPort(httpServer) {
  const address = httpServer.address();
  return typeof address === 'object' && address ? address.port : 5173;
}

function getLanAddresses(port) {
  const addresses = [`http://127.0.0.1:${port}/`];
  const networks = os.networkInterfaces();
  Object.values(networks).forEach((items) => {
    items?.forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) addresses.push(`http://${item.address}:${port}/`);
    });
  });
  return Array.from(new Set(addresses));
}

function sweepRooms() {
  const now = Date.now();
  let changed = false;
  for (const [code, room] of rooms.entries()) {
    const hasHumans = Array.from(room.players.values()).some((player) => !player.isBot);
    if (!hasHumans || now - room.updatedAt > ROOM_TTL) {
      rooms.delete(code);
      changed = true;
    }
  }
  if (changed) broadcastRoomList();
}
