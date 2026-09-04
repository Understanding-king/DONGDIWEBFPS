import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  Bot,
  Boxes,
  Check,
  Cloud,
  Coins,
  Copy,
  Crosshair,
  House,
  LockKeyhole,
  LogIn,
  MapPin,
  PackageOpen,
  Plus,
  Play,
  RefreshCw,
  Radio,
  Send,
  ShieldCheck,
  ShoppingBag,
  Swords,
  Target,
  Trophy,
  UserRound,
  UserPlus,
  Users,
  Wifi,
  X,
  Zap,
  createIcons
} from 'lucide';
import {
  getAccountSnapshot,
  canManageAccounts,
  canUseCheats,
  getFriends,
  getFriendCode,
  addFriend,
  listManagedAccounts,
  removeFriend,
  restoreAccountSession,
  signInWithPassword,
  signOutAccount,
  signUpWithPassword,
  updateAccountProfile,
  updateManagedAccount
} from './services/account-service.js';

const STORAGE_KEY = 'aim-trainer-local-v1';
const configuredDuelWsUrl = String(import.meta.env.VITE_DUEL_WS_URL || '').trim();
const isVercelDeployment = /\.vercel\.app$/i.test(window.location.hostname);
const CROSSHAIR_COLORS = ['#f4f7fb', '#2ee6a6', '#ffbd5a', '#ff4d7d'];
const DEFAULT_CROSSHAIR = { color: '#f4f7fb', size: 38, gap: 14, thickness: 2, dot: true };
const DEFAULT_SETTINGS = { duration: 60, sensitivity: 3.2, crosshair: DEFAULT_CROSSHAIR, mobileControls: false, duelMap: 'park', primaryWeapon: 'ak' };
const TARGET_LIFETIME = 1750;
const CAMERA_HEIGHT = 1.58;
const MAX_PIXEL_RATIO = 1.15;
const BASE_CAMERA_FOV = 72;
const ADS_CAMERA_FOV = 52;
const LOOK_EVENT = 'mousemove';
const LOOK_SPIKE_LIMIT = 900;
const MAX_LOOK_DELTA = 96;
const ADS_SENSITIVITY_SCALE = 0.62;
const MOVE_SPEED = 6.4;
const ADS_MOVE_SPEED = 3.2;
const CROUCH_CAMERA_HEIGHT = 1.08;
const CROUCH_MOVE_SPEED = 2.85;
const JUMP_VELOCITY = 6.0;
const GRAVITY = 14.8;
const AIR_MOVE_SPEED_SCALE = 0.88;
const AIR_HIP_SPREAD_MULTIPLIER = 3.2;
const AIR_HIP_SPREAD_BONUS = 0.014;
const CROUCH_SPREAD_SCALE = 0.76;
const PLAYER_COLLISION_RADIUS = 0.42;
const BOT_COLLISION_RADIUS = 0.42;
const SOLID_BLOCK_MIN_HEIGHT = 0.42;
const OBSTACLE_CLEARANCE = 0.08;
const SUPPORT_EDGE_TOLERANCE = 0.12;
const RING_OUTER_WALL_HEIGHT = 5.4;
const RING_INNER_WALL_HEIGHT = 4.6;
const MEDIUM_COVER_HEIGHT = 1.55;
const RANGE_BOUNDS = { minX: -7.75, maxX: 7.75, minZ: -14.6, maxZ: 7.65 };
const DUEL_MAPS = {
  park: {
    label: '公园',
    bounds: { minX: -22, maxX: 22, minZ: -46, maxZ: 22 },
    spawns: {
      red: [
        { position: new THREE.Vector3(-13.8, CAMERA_HEIGHT, 16.5), yaw: -0.45 },
        { position: new THREE.Vector3(-8.5, CAMERA_HEIGHT, 18.4), yaw: -0.22 },
        { position: new THREE.Vector3(-18.2, CAMERA_HEIGHT, 9.4), yaw: -0.66 },
        { position: new THREE.Vector3(-4.4, CAMERA_HEIGHT, 11.8), yaw: -0.12 },
        { position: new THREE.Vector3(-15.4, CAMERA_HEIGHT, 1.6), yaw: -0.72 }
      ],
      blue: [
        { position: new THREE.Vector3(13.8, CAMERA_HEIGHT, -40.5), yaw: Math.PI - 0.45 },
        { position: new THREE.Vector3(8.5, CAMERA_HEIGHT, -42.4), yaw: Math.PI - 0.22 },
        { position: new THREE.Vector3(18.2, CAMERA_HEIGHT, -33.4), yaw: Math.PI - 0.66 },
        { position: new THREE.Vector3(4.4, CAMERA_HEIGHT, -35.8), yaw: Math.PI - 0.12 },
        { position: new THREE.Vector3(15.4, CAMERA_HEIGHT, -25.6), yaw: Math.PI - 0.72 }
      ]
    }
  },
  ring: {
    label: '回型地图',
    bounds: { minX: -28, maxX: 28, minZ: -48, maxZ: 16 },
    spawns: {
      red: [
        { position: new THREE.Vector3(-20, CAMERA_HEIGHT, 10), yaw: -0.58 },
        { position: new THREE.Vector3(-10, CAMERA_HEIGHT, 12), yaw: -0.25 },
        { position: new THREE.Vector3(-24, CAMERA_HEIGHT, 0), yaw: -0.82 },
        { position: new THREE.Vector3(0, CAMERA_HEIGHT, 11), yaw: 0 },
        { position: new THREE.Vector3(-17, CAMERA_HEIGHT, -8), yaw: -0.72 }
      ],
      blue: [
        { position: new THREE.Vector3(20, CAMERA_HEIGHT, -42), yaw: Math.PI - 0.58 },
        { position: new THREE.Vector3(10, CAMERA_HEIGHT, -44), yaw: Math.PI - 0.25 },
        { position: new THREE.Vector3(24, CAMERA_HEIGHT, -32), yaw: Math.PI - 0.82 },
        { position: new THREE.Vector3(0, CAMERA_HEIGHT, -43), yaw: Math.PI },
        { position: new THREE.Vector3(17, CAMERA_HEIGHT, -24), yaw: Math.PI - 0.72 }
      ]
    }
  }
};
const AK_FIRE_INTERVAL = 96;
const AK_BASE_SPREAD = 0.0022;
const AK_SPREAD_STEP = 0.00135;
const AK_MAX_SPREAD = 0.024;
const AK_ADS_SPREAD_SCALE = 0.48;
const AK_ADS_RECOIL_SCALE = 0.58;
const SNIPER_FIRE_INTERVAL = 950;
const SNIPER_BASE_SPREAD = 0.006;
const SNIPER_ADS_SPREAD = 0.00008;
const SNIPER_MAX_SPREAD = 0.012;
const SNIPER_ADS_FOV = 28;
const SNIPER_ADS_SENSITIVITY_SCALE = 0.62;
const SNIPER_RECOIL = 0.074;
const SNIPER_BODY_DAMAGE = 100;
const SNIPER_HEAD_DAMAGE = 150;
const SHOTGUN_FIRE_INTERVAL = 760;
const SHOTGUN_BASE_SPREAD = 0.038;
const SHOTGUN_ADS_SPREAD_SCALE = 0.82;
const SHOTGUN_MAX_SPREAD = 0.066;
const SHOTGUN_PELLETS = 9;
const SHOTGUN_BODY_DAMAGE = 14;
const SHOTGUN_HEAD_DAMAGE = 22;
const SHOTGUN_SPIN_DURATION = 520;
const SHOTGUN_PUMP_REST_Z = -0.58;
const KNIFE_ATTACK_INTERVAL = 520;
const KNIFE_SPIN_DURATION = 460;
const KNIFE_SLASH_DURATION = 260;
const WEAPON_SWITCH_DURATION = 190;
const DUEL_MAX_KILLS = 10;
const DUEL_PLAYER_HEALTH = 100;
const DUEL_BODY_DAMAGE = 25;
const DUEL_HEAD_DAMAGE = 49;
const NAMEPLATE_CANVAS_WIDTH = 512;
const NAMEPLATE_CANVAS_HEIGHT = 128;
const DUEL_RESPAWN_DELAY = 1800;
const SPAWN_PROTECTION_MS = 1000;
const ICECREAM_INVULN_MS = 5000;
const ICECREAM_COOLDOWN_MS = 18000;
const ICECREAM_ANIMATION_MS = 980;
const DUEL_POSE_INTERVAL = 42;
const BOT_SETTINGS = {
  easy: {
    label: '轻松',
    fireMin: 620,
    fireMax: 920,
    aimError: 0.12,
    moveSpeed: 2.25,
    strafeMin: 640,
    strafeMax: 1280,
    rangeFar: 8.2,
    rangeClose: 4.2,
    advance: 0.58,
    retreat: -0.5,
    leadTime: 0,
    headBias: 0,
    dodgeJitter: 0,
    openingDelay: 680,
    burstChance: 0,
    burstShots: 1,
    burstDelay: 160
  },
  normal: {
    label: '标准',
    fireMin: 420,
    fireMax: 700,
    aimError: 0.075,
    moveSpeed: 2.9,
    strafeMin: 560,
    strafeMax: 1120,
    rangeFar: 8.8,
    rangeClose: 4.5,
    advance: 0.62,
    retreat: -0.55,
    leadTime: 0.06,
    headBias: 0.04,
    dodgeJitter: 0.08,
    openingDelay: 520,
    burstChance: 0.18,
    burstShots: 2,
    burstDelay: 135
  },
  hard: {
    label: '硬汉',
    fireMin: 260,
    fireMax: 480,
    aimError: 0.038,
    moveSpeed: 3.55,
    strafeMin: 520,
    strafeMax: 980,
    rangeFar: 8.2,
    rangeClose: 4.2,
    advance: 0.58,
    retreat: -0.5,
    leadTime: 0,
    headBias: 0,
    dodgeJitter: 0,
    openingDelay: 680,
    burstChance: 0,
    burstShots: 1,
    burstDelay: 120
  },
  inferno: {
    label: '炼狱',
    fireMin: 92,
    fireMax: 185,
    aimError: 0.0065,
    moveSpeed: 5.05,
    strafeMin: 170,
    strafeMax: 430,
    rangeFar: 12.2,
    rangeClose: 6.2,
    advance: 1.02,
    retreat: -0.92,
    leadTime: 0.32,
    headBias: 0.26,
    dodgeJitter: 0.34,
    openingDelay: 230,
    burstChance: 0.88,
    burstShots: 3,
    burstDelay: 78,
    magicEvery: 6,
    magicHeadshotChance: 0.18,
    prefireOnSight: true
  }
};
const WEAPON_HIP_POSITION = new THREE.Vector3(0.48, -0.43, -0.9);
const WEAPON_ADS_POSITION = new THREE.Vector3(-0.009, -0.221, -0.86);
const WEAPON_HIP_ROTATION = new THREE.Euler(-0.03, -0.09, 0.02);
const WEAPON_ADS_ROTATION = new THREE.Euler(-0.018, 0, 0);
const DETAILED_AK_ASSET_PATH = '/models/ak-47/';
const DETAILED_AK_ATTEMPT_DELAYS = [0, 1500, 5000];
const DETAILED_AK_REQUEST_TIMEOUT_MS = 45000;
const DETAILED_AK_BACKGROUND_RETRY_MS = 30000;
// This is the rear-sight groove, not the top edge of the receiver.
const AK_REAR_SIGHT_REFERENCE_FROM_TOP = 0.03;
const SNIPER_HIP_POSITION = new THREE.Vector3(0.45, -0.41, -0.96);
const SNIPER_HIP_ROTATION = new THREE.Euler(-0.04, -0.06, 0.014);
const SNIPER_ADS_POSITION = SNIPER_HIP_POSITION.clone();
const SNIPER_ADS_ROTATION = SNIPER_HIP_ROTATION.clone();
const KNIFE_POSITION = new THREE.Vector3(0.45, -0.48, -0.72);
const KNIFE_ROTATION = new THREE.Euler(-0.2, -0.42, 0.2);
const SHOTGUN_HIP_POSITION = new THREE.Vector3(0.5, -0.42, -0.88);
const SHOTGUN_ADS_POSITION = new THREE.Vector3(0.015, -0.235, -0.86);
const SHOTGUN_HIP_ROTATION = new THREE.Euler(-0.045, -0.08, 0.018);
const SHOTGUN_ADS_ROTATION = new THREE.Euler(-0.02, 0, 0);
const PRIMARY_WEAPON_ORDER = ['ak', 'sniper', 'shotgun'];
const LOBBY_WEAPON_STATS = {
  ak: { label: 'AK-47', short: 'AK', type: '突击步枪', caliber: '7.62 MM', mode: '全自动', power: 72, rate: 82, control: 58 },
  sniper: { label: 'AWP', short: 'AWP', type: '狙击步枪', caliber: '.338', mode: '栓动', power: 100, rate: 24, control: 88 },
  shotgun: { label: 'M870', short: 'M870', type: '泵动霞弹枪', caliber: '12 GA', mode: '泵动', power: 91, rate: 31, control: 46 }
};
const SOUND_VOLUME_MULTIPLIER = 5.2;

const WEAPONS = {
  ak: {
    id: 'ak',
    label: 'AK-47',
    slotLabel: '主武器',
    fireInterval: AK_FIRE_INTERVAL,
    automatic: true,
    baseSpread: AK_BASE_SPREAD,
    spreadStep: AK_SPREAD_STEP,
    maxSpread: AK_MAX_SPREAD,
    adsSpreadScale: AK_ADS_SPREAD_SCALE,
    adsFov: ADS_CAMERA_FOV,
    adsSensitivityScale: ADS_SENSITIVITY_SCALE,
    recoilScale: 1,
    adsRecoilScale: AK_ADS_RECOIL_SCALE,
    bodyDamage: DUEL_BODY_DAMAGE,
    headDamage: DUEL_HEAD_DAMAGE,
    hipPosition: WEAPON_HIP_POSITION,
    adsPosition: WEAPON_ADS_POSITION,
    hipRotation: WEAPON_HIP_ROTATION,
    adsRotation: WEAPON_ADS_ROTATION
  },
  sniper: {
    id: 'sniper',
    label: 'AWP 狙击枪',
    slotLabel: '主武器',
    fireInterval: SNIPER_FIRE_INTERVAL,
    automatic: false,
    baseSpread: SNIPER_BASE_SPREAD,
    spreadStep: 0,
    maxSpread: SNIPER_MAX_SPREAD,
    adsSpreadScale: 0.012,
    adsFov: SNIPER_ADS_FOV,
    adsSensitivityScale: SNIPER_ADS_SENSITIVITY_SCALE,
    recoilScale: 1.35,
    adsRecoilScale: 1,
    bodyDamage: SNIPER_BODY_DAMAGE,
    headDamage: SNIPER_HEAD_DAMAGE,
    hipPosition: SNIPER_HIP_POSITION,
    adsPosition: SNIPER_ADS_POSITION,
    hipRotation: SNIPER_HIP_ROTATION,
    adsRotation: SNIPER_ADS_ROTATION
  },
  shotgun: {
    id: 'shotgun',
    label: 'M870 喷子',
    slotLabel: '主武器',
    fireInterval: SHOTGUN_FIRE_INTERVAL,
    automatic: false,
    pellets: SHOTGUN_PELLETS,
    baseSpread: SHOTGUN_BASE_SPREAD,
    spreadStep: 0,
    maxSpread: SHOTGUN_MAX_SPREAD,
    adsSpreadScale: SHOTGUN_ADS_SPREAD_SCALE,
    adsFov: 58,
    adsSensitivityScale: 0.72,
    recoilScale: 1.55,
    adsRecoilScale: 1.25,
    bodyDamage: SHOTGUN_BODY_DAMAGE,
    headDamage: SHOTGUN_HEAD_DAMAGE,
    hipPosition: SHOTGUN_HIP_POSITION,
    adsPosition: SHOTGUN_ADS_POSITION,
    hipRotation: SHOTGUN_HIP_ROTATION,
    adsRotation: SHOTGUN_ADS_ROTATION
  }
};

const ZONES = [
  { id: 'CENTER', label: '前方', x: [-1.15, 1.15], y: [1.3, 2.35], z: [-5.5, -8.4] },
  { id: 'UP LEFT', label: '左上', x: [-5.2, -2.9], y: [2.5, 3.85], z: [-5.6, -9.2] },
  { id: 'UP RIGHT', label: '右上', x: [2.9, 5.2], y: [2.5, 3.85], z: [-5.6, -9.2] },
  { id: 'LOW LEFT', label: '左下', x: [-5.0, -2.7], y: [0.65, 1.35], z: [-5.2, -8.7] },
  { id: 'LOW RIGHT', label: '右下', x: [2.7, 5.0], y: [0.65, 1.35], z: [-5.2, -8.7] },
  { id: 'DEPTH', label: '远近', x: [-2.4, 2.4], y: [1.0, 3.1], z: [-10.8, -14.6] }
];

const dom = {
  canvas: document.getElementById('scene'),
  mobileControlsToggle: document.getElementById('mobile-controls-toggle'),
  mobileControls: document.getElementById('mobile-controls'),
  hud: document.getElementById('hud'),
  targetClock: document.getElementById('target-clock'),
  targetZone: document.getElementById('target-zone'),
  targetMeter: document.getElementById('target-meter'),
  crosshair: document.getElementById('crosshair'),
  hitMarker: document.getElementById('hit-marker'),
  killFeedback: document.getElementById('kill-feedback'),
  killSkull: document.getElementById('kill-skull'),
  killLabel: document.getElementById('kill-label'),
  damageVignette: document.getElementById('damage-vignette'),
  deathFlash: document.getElementById('death-flash'),
  deathBlood: document.getElementById('death-blood'),
  touchJoystick: document.getElementById('touch-joystick'),
  touchJoystickKnob: document.getElementById('touch-joystick-knob'),
  startPanel: document.getElementById('start-panel'),
  pausePanel: document.getElementById('pause-panel'),
  resultPanel: document.getElementById('result-panel'),
  modePanel: document.getElementById('mode-panel'),
  lanPanel: document.getElementById('lan-panel'),
  botPanel: document.getElementById('bot-panel'),
  duelResultPanel: document.getElementById('duel-result-panel'),
  accountDialog: document.getElementById('account-dialog'),
  accountButton: document.getElementById('account-button'),
  profileAccountButton: document.getElementById('profile-account-button'),
  localProfileForm: document.getElementById('local-profile-form'),
  cloudAccountForm: document.getElementById('cloud-account-form'),
  profileNameInput: document.getElementById('profile-name-input'),
  accountEmail: document.getElementById('account-email'),
  accountPassword: document.getElementById('account-password'),
  accountMessage: document.getElementById('account-message'),
  accountCloudStatus: document.getElementById('account-cloud-status'),
  adminPanel: document.getElementById('admin-panel'),
  adminAccountList: document.getElementById('admin-account-list'),
  refreshAdminAccounts: document.getElementById('refresh-admin-accounts'),
  adminStatus: document.getElementById('admin-status'),
  accountName: document.getElementById('account-name'),
  accountState: document.getElementById('account-state'),
  accountAvatar: document.getElementById('account-avatar'),
  playerCredits: document.getElementById('player-credits'),
  profileName: document.getElementById('profile-name'),
  profileId: document.getElementById('profile-id'),
  profileAvatar: document.getElementById('profile-avatar'),
  profileAccountState: document.getElementById('profile-account-state'),
  profileCloudState: document.getElementById('profile-cloud-state'),
  friendCode: document.getElementById('friend-code'),
  copyFriendCodeButton: document.getElementById('copy-friend-code'),
  friendCodeInput: document.getElementById('friend-code-input'),
  friendNameInput: document.getElementById('friend-name-input'),
  addFriendButton: document.getElementById('add-friend-button'),
  friendsList: document.getElementById('friends-list'),
  friendsStatus: document.getElementById('friends-status'),
  profileSessions: document.getElementById('profile-sessions'),
  profileBest: document.getElementById('profile-best'),
  homeBestScore: document.getElementById('home-best-score'),
  homeAccuracy: document.getElementById('home-accuracy'),
  homePrimary: document.getElementById('home-primary'),
  homeWeaponName: document.getElementById('home-weapon-name'),
  homeWeaponArt: document.getElementById('home-weapon-art'),
  homeWeaponType: document.getElementById('home-weapon-type'),
  homeWeaponCaliber: document.getElementById('home-weapon-caliber'),
  homeWeaponMode: document.getElementById('home-weapon-mode'),
  missionHits: document.getElementById('mission-hits'),
  inventoryWeaponArt: document.getElementById('inventory-weapon-art'),
  inventoryWeaponName: document.getElementById('inventory-weapon-name'),
  weaponPower: document.getElementById('weapon-power'),
  weaponRate: document.getElementById('weapon-rate'),
  weaponControl: document.getElementById('weapon-control'),
  quickPlayButton: document.getElementById('quick-play-button'),
  duelHud: document.getElementById('duel-hud'),
  duelFeed: document.getElementById('duel-feed'),
  killFeed: document.getElementById('kill-feed'),
  killFeedItems: document.getElementById('kill-feed-items'),
  cheatPanel: document.getElementById('cheat-panel'),
  cheatStatus: document.getElementById('cheat-status'),
  spawnShield: document.getElementById('spawn-shield'),
  weaponIndicator: document.getElementById('weapon-indicator'),
  weaponSlotLabel: document.getElementById('weapon-slot-label'),
  weaponNameLabel: document.getElementById('weapon-name-label'),
  scopeOverlay: document.getElementById('scope-overlay'),
  rangeModeButton: document.getElementById('range-mode-button'),
  lanModeButton: document.getElementById('lan-mode-button'),
  botModeButton: document.getElementById('bot-mode-button'),
  startButton: document.getElementById('start-button'),
  startBackButton: document.getElementById('start-back-button'),
  resumeButton: document.getElementById('resume-button'),
  quitButton: document.getElementById('quit-button'),
  retryButton: document.getElementById('retry-button'),
  menuButton: document.getElementById('menu-button'),
  resetHistory: document.getElementById('reset-history'),
  playerName: document.getElementById('player-name'),
  roomCodeInput: document.getElementById('room-code-input'),
  roomCodeDisplay: document.getElementById('room-code-display'),
  lanAddresses: document.getElementById('lan-addresses'),
  roomList: document.getElementById('room-list'),
  refreshRoomListButton: document.getElementById('refresh-room-list'),
  roomConnectionLabel: document.getElementById('room-connection-label'),
  roomStationState: document.getElementById('room-station-state'),
  roomRosterCount: document.getElementById('room-roster-count'),
  roomPlayers: document.getElementById('room-players'),
  copyRoomInviteButton: document.getElementById('copy-room-invite'),
  roomInviteLink: document.getElementById('room-invite-link'),
  shareRoomInviteButton: document.getElementById('share-room-invite'),
  roomFriendList: document.getElementById('room-friend-list'),
  roomInviteStatus: document.getElementById('room-invite-status'),
  createRoomButton: document.getElementById('create-room-button'),
  joinRoomButton: document.getElementById('join-room-button'),
  addBotButton: document.getElementById('add-bot-button'),
  readyButton: document.getElementById('ready-button'),
  lanEnterButton: document.getElementById('lan-enter-button'),
  leaveRoomButton: document.getElementById('leave-room-button'),
  lanBackButton: document.getElementById('lan-back-button'),
  lanStatus: document.getElementById('lan-status'),
  startBotButton: document.getElementById('start-bot-button'),
  botBackButton: document.getElementById('bot-back-button'),
  botDifficultyLabel: document.getElementById('bot-difficulty-label'),
  duelMapLabel: document.getElementById('duel-map-label'),
  botMapLabel: document.getElementById('bot-map-label'),
  botStatus: document.getElementById('bot-status'),
  durationLabel: document.getElementById('duration-label'),
  sensitivity: document.getElementById('sensitivity'),
  sensitivityLabel: document.getElementById('sensitivity-label'),
  crosshairSummary: document.getElementById('crosshair-summary'),
  crosshairSize: document.getElementById('crosshair-size'),
  crosshairGap: document.getElementById('crosshair-gap'),
  crosshairThickness: document.getElementById('crosshair-thickness'),
  crosshairDot: document.getElementById('crosshair-dot'),
  statusLine: document.getElementById('status-line'),
  timeLeft: document.getElementById('time-left'),
  score: document.getElementById('score'),
  hits: document.getElementById('hits'),
  accuracy: document.getElementById('accuracy'),
  reaction: document.getElementById('reaction'),
  streak: document.getElementById('streak'),
  bestScore: document.getElementById('best-score'),
  bestAccuracy: document.getElementById('best-accuracy'),
  bestReaction: document.getElementById('best-reaction'),
  resultScore: document.getElementById('result-score'),
  resultHits: document.getElementById('result-hits'),
  resultAccuracy: document.getElementById('result-accuracy'),
  resultReaction: document.getElementById('result-reaction'),
  resultStreak: document.getElementById('result-streak'),
  resultExpired: document.getElementById('result-expired'),
  resultBest: document.getElementById('result-best'),
  recentList: document.getElementById('recent-list'),
  duelModeLabel: document.getElementById('duel-mode-label'),
  duelRoomLabel: document.getElementById('duel-room-label'),
  duelScore: document.getElementById('duel-score'),
  duelHealth: document.getElementById('duel-health'),
  duelHealthMeter: document.getElementById('duel-health-meter'),
  duelEnemyName: document.getElementById('duel-enemy-name'),
  duelEnemyScore: document.getElementById('duel-enemy-score'),
  duelEnemyHealth: document.getElementById('duel-enemy-health'),
  duelEnemyMeter: document.getElementById('duel-enemy-meter'),
  icecreamStatus: document.getElementById('icecream-status'),
  duelResultMain: document.getElementById('duel-result-main'),
  duelResultDetail: document.getElementById('duel-result-detail'),
  duelRetryButton: document.getElementById('duel-retry-button'),
  duelMenuButton: document.getElementById('duel-menu-button')
};

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const storage = readStorage();
let accountSnapshot = getAccountSnapshot();
let managedAccounts = [];
let managedAccountsLoading = false;
const duelCheats = {
  aimLock: false,
  magicBullets: false,
  fly: false,
  wallPhase: false,
  invincible: false
};

let renderer;
let scene;
let camera;
let targetGroup;
let targetBody;
let targetRing;
let targetHalo;
let weaponGroup;
let muzzleTip;
let muzzleFlash;
let muzzleLight;
let weaponModels = {};
const weaponPreviews = [];
let previewAkSource = null;
let detailedAkLoadState = 'idle';
let detailedAkRetryTimer = null;
let knifeGroup;
let icecreamGroup;
let opponentGroup;
let opponentBody;
let opponentHead;
let opponentParts = {};
let targetSpawnedAt = 0;
let currentZone = null;
let previousZoneId = '';
let yaw = 0;
let pitch = 0;
let appMode = 'menu';
let state = 'idle';
let lockIntent = null;
let audioContext = null;
let shotNoiseBuffer = null;
let audioMasterGain = null;
let audioLimiter = null;
let crosshairTimer = 0;
let hitMarkerTimer = 0;
let killFeedbackTimer = 0;
let damageVignetteTimer = 0;
let deathFlashTimer = 0;
let deathBloodTimer = 0;
let icecreamEatStartedAt = 0;
let icecreamEatUntil = 0;
let lastIcecreamBlockAt = 0;
let pausedRemainingMs = 0;
let pausedAt = 0;
let triggerHeld = false;
let nextShotAt = 0;
let sprayIndex = 0;
let spreadKick = 0;
let weaponKick = 0;
let muzzleFlashUntil = 0;
let aimingDownSights = false;
let adsBlend = 0;
let walkPhase = 0;
let playerEyeHeight = CAMERA_HEIGHT;
let playerVerticalOffset = 0;
let playerVerticalVelocity = 0;
let playerGrounded = true;
let playerCrouching = false;
let crouchHeld = false;
let jumpQueued = false;
let jumpQueuedUntil = 0;
let localHorizontalSpeed = 0;
let selectedPrimaryWeapon = storage.settings.primaryWeapon;
let equippedSlot = 'primary';
let weaponSwitchStartedAt = 0;
let weaponSwitchUntil = 0;
let weaponSwitchScale = 1;
let knifeSpinStartedAt = 0;
let knifeSpinUntil = 0;
let knifeSlashUntil = 0;
let lastKnifeSlashAt = 0;
let shotgunSpinStartedAt = 0;
let shotgunSpinUntil = 0;
let lastWeaponActionAt = 0;
let lastWheelSwitchAt = 0;
let localPlayerName = 'Player';
let botDifficulty = 'normal';
let activeDuelMap = storage.settings.duelMap;
let mobileLookPointerId = null;
let mobileLookX = 0;
let mobileLookY = 0;
let joystickPointerId = null;
let ws = null;
let lanConnected = false;
let lanRoom = null;
let lanRoomList = [];
let roomListTimer = 0;
let lanSelfId = '';
let lanSelfSlot = '';
let lanCanEnter = false;
let pendingLanSpawn = null;
let pendingLanAction = null;
let lastPoseSentAt = 0;
let feedTimer = 0;
let killFeedTimer = 0;
let killImpactTimer = 0;
const killFeedEntries = [];

const duel = {
  active: false,
  type: '',
  selfSlot: 'red',
  roomCode: '',
  health: DUEL_PLAYER_HEALTH,
  kills: 0,
  deaths: 0,
  enemyHealth: DUEL_PLAYER_HEALTH,
  enemyKills: 0,
  enemyDeaths: 0,
  enemyName: '对手',
  enemyAlive: true,
  respawningUntil: 0,
  protectedUntil: 0,
  icecreamUntil: 0,
  icecreamCooldownUntil: 0,
  icecreamPending: false,
  icecreamPendingUntil: 0,
  winnerText: ''
};

const bot = {
  position: getDuelSpawn('blue1').position.clone(),
  yaw: Math.PI,
  pitch: 0,
  health: DUEL_PLAYER_HEALTH,
  kills: 0,
  deaths: 0,
  alive: true,
  protectedUntil: 0,
  respawnAt: 0,
  nextShotAt: 0,
  burstShotsRemaining: 0,
  bulletsFired: 0,
  strafe: 1,
  nextStrafeAt: 0,
  targetVelocity: new THREE.Vector3(),
  lastTargetPosition: null,
  navRoute: [],
  navRouteIndex: 0,
  navTarget: null,
  navNextAt: 0,
  navStuckSince: 0,
  navLastPosition: new THREE.Vector3()
};

const session = {
  duration: storage.settings.duration,
  endsAt: 0,
  score: 0,
  hits: 0,
  shots: 0,
  misses: 0,
  expired: 0,
  streak: 0,
  bestStreak: 0,
  totalReaction: 0
};

let rangeArenaGroup;
let duelArenaGroup;
let ringArenaGroup;
const rangeArenaMeshes = [];
const duelArenaMeshes = [];
const ringArenaMeshes = [];
const duelArenaBlockers = [];
const ringArenaBlockers = [];
const transientObjects = [];
const moveKeys = new Set();
const moveKeyPressedAt = new Map();
const handledKeyboardEvents = new WeakSet();
const duelHitMeshes = [];
const lanOpponents = new Map();
const mobileMoveVector = new THREE.Vector2();
const shotDirection = new THREE.Vector3();
const shotRight = new THREE.Vector3();
const shotUp = new THREE.Vector3();
const shotOrigin = new THREE.Vector3();
const muzzleWorld = new THREE.Vector3();
const impactNormal = new THREE.Vector3();
const moveInput = new THREE.Vector2();
const opponentLerpPosition = new THREE.Vector3();
const shotEnd = new THREE.Vector3();
const localPosePosition = new THREE.Vector3();
const losDirection = new THREE.Vector3();
const nameplateTargetPoint = new THREE.Vector3();
const nameplateViewDirection = new THREE.Vector3();
const nameplateCameraForward = new THREE.Vector3();
const cheatTargetPoint = new THREE.Vector3();
const akSightWorld = new THREE.Vector3();
const akSightCameraSpace = new THREE.Vector3();
const opponentPoseState = {
  crouch: false,
  airborne: false,
  moving: false,
  ads: false,
  weapon: 'ak',
  speed: 0,
  crouchBlend: 0,
  walkTime: 0,
  lastX: 0,
  lastZ: 0,
  lastAt: 0
};

const BOT_NAV_SPACING = 3.4;
const BOT_NAV_REPATH_MS = 850;
const BOT_NAV_TARGET_SHIFT = 2.4;
const BOT_NAV_STUCK_MS = 520;
const botNavCache = new Map();

init();

function init() {
  createIcons({
    icons: {
      Bot, Boxes, Check, Cloud, Coins, Copy, Crosshair, House, LockKeyhole, LogIn,
      MapPin, PackageOpen, Plus, Play, RefreshCw, Radio, Send, ShieldCheck, ShoppingBag, Swords, Target,
      Trophy, UserPlus, UserRound, Users, Wifi, X, Zap
    },
    attrs: { 'aria-hidden': 'true' }
  });
  initScene();
  initUi();
  renderMenuStats();
  setOverlay('mode');
  if (getInvitedRoomCode()) {
    switchLobbyView('play');
    openLanPanel();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('blur', clearInputState);
  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('pointerlockerror', handlePointerLockError);
  document.addEventListener(LOOK_EVENT, handlePointerLook, { passive: true });
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('wheel', handleWeaponWheel, { passive: false });
  dom.canvas.addEventListener('pointerdown', handleCanvasPointerDown, { passive: false });
  window.addEventListener('pointermove', handleCanvasPointerMove, { passive: false });
  window.addEventListener('pointerup', handleCanvasPointerUp, { passive: false });
  window.addEventListener('pointercancel', handleCanvasPointerUp, { passive: false });
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state === 'running') pauseRun();
  });
  requestAnimationFrame(render);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#10131a');
  scene.fog = new THREE.Fog('#10131a', 15, 90);

  camera = new THREE.PerspectiveCamera(BASE_CAMERA_FOV, 1, 0.05, 140);
  camera.position.set(0, CAMERA_HEIGHT, 7.5);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  scene.add(new THREE.HemisphereLight('#c8f7ff', '#171017', 1.15));

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.1);
  keyLight.position.set(3, 7, 5);
  scene.add(keyLight);

  const stripLight = new THREE.PointLight('#2ee6a6', 2.6, 19);
  stripLight.position.set(-5.6, 3.7, -6);
  scene.add(stripLight);

  buildArena();
  buildTarget();
  buildWeapon();
  initWeaponPreviews();
  buildOpponent();
  resetView();
}

function buildArena() {
  rangeArenaGroup = new THREE.Group();
  duelArenaGroup = new THREE.Group();
  ringArenaGroup = new THREE.Group();
  duelArenaGroup.visible = false;
  ringArenaGroup.visible = false;
  scene.add(rangeArenaGroup, duelArenaGroup, ringArenaGroup);
  buildRangeArena();
  buildDuelPark();
  buildDuelRingMap();
  setArenaMode('range');
}

function buildRangeArena() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 28),
    new THREE.MeshStandardMaterial({ color: '#171b24', roughness: 0.82, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -5.7;
  addRangeMesh(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#1c2230', roughness: 0.76, metalness: 0.03 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.2), wallMaterial);
  backWall.position.set(0, 3.05, -16.1);
  addRangeMesh(backWall);

  const sideMaterial = new THREE.MeshStandardMaterial({ color: '#141820', roughness: 0.78, metalness: 0.03 });
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 7.2), sideMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-9, 3.05, -5.7);
  addRangeMesh(leftWall);

  const rightWall = leftWall.clone();
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = 9;
  addRangeMesh(rightWall);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 28),
    new THREE.MeshStandardMaterial({ color: '#11151d', roughness: 0.86 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 6.65, -5.7);
  addRangeMesh(ceiling);

  const grid = new THREE.GridHelper(18, 18, '#2ee6a6', '#2a3446');
  grid.position.set(0, 0.014, -5.7);
  grid.material.transparent = true;
  grid.material.opacity = 0.38;
  addRangeObject(grid);

  addZoneFrames();
  addRangeMarkers();
}

function buildDuelPark() {
  const grass = new THREE.MeshStandardMaterial({ color: '#203a28', roughness: 0.94, metalness: 0.01 });
  const path = new THREE.MeshStandardMaterial({ color: '#69736b', roughness: 0.86, metalness: 0.02 });
  const stone = new THREE.MeshStandardMaterial({ color: '#7c8584', roughness: 0.7, metalness: 0.04 });
  const darkStone = new THREE.MeshStandardMaterial({ color: '#48545a', roughness: 0.74, metalness: 0.06 });
  const hedge = new THREE.MeshStandardMaterial({ color: '#285238', roughness: 0.95, metalness: 0.01 });
  const trunk = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.78, metalness: 0.02 });
  const leaves = new THREE.MeshStandardMaterial({ color: '#357247', roughness: 0.88, metalness: 0.01 });
  const benchWood = new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 0.7, metalness: 0.02 });
  const rail = new THREE.MeshStandardMaterial({ color: '#2c3840', roughness: 0.62, metalness: 0.2 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: '#ffbd5a', transparent: true, opacity: 0.82 });
  const water = new THREE.MeshStandardMaterial({
    color: '#3194a8',
    roughness: 0.22,
    metalness: 0.02,
    transparent: true,
    opacity: 0.58,
    emissive: '#082f38',
    emissiveIntensity: 0.18
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 68), grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -12);
  addDuelMesh(ground);

  addParkPlane(4.8, 68, [0, 0.024, -12], path);
  addParkPlane(44, 4.8, [0, 0.026, -12], path);
  addParkPlane(13.4, 13.4, [0, 0.028, -12], path, Math.PI / 4, true);

  addParkBlock(44.8, 1.1, 0.5, [0, 0.55, 22.25], rail, 0);
  addParkBlock(44.8, 1.1, 0.5, [0, 0.55, -46.25], rail, 0);
  addParkBlock(0.5, 1.1, 68.8, [-22.25, 0.55, -12], rail, 0);
  addParkBlock(0.5, 1.1, 68.8, [22.25, 0.55, -12], rail, 0);

  addParkBlock(9.5, MEDIUM_COVER_HEIGHT, 1.2, [-9.8, MEDIUM_COVER_HEIGHT * 0.5, 1.8], hedge, -0.22);
  addParkBlock(8.6, MEDIUM_COVER_HEIGHT, 1.2, [10.4, MEDIUM_COVER_HEIGHT * 0.5, -26.2], hedge, 0.24);
  addParkBlock(1.2, MEDIUM_COVER_HEIGHT, 9.8, [-14.8, MEDIUM_COVER_HEIGHT * 0.5, -22.8], hedge, -0.08);
  addParkBlock(1.2, MEDIUM_COVER_HEIGHT, 10.5, [14.8, MEDIUM_COVER_HEIGHT * 0.5, -1.8], hedge, 0.08);
  addParkBlock(5.2, 0.78, 1.1, [-5.9, 0.39, -35.4], hedge, 0.12);
  addParkBlock(5.4, 0.78, 1.1, [6.1, 0.39, 9.4], hedge, -0.12);

  addParkBlock(4.8, 0.8, 1.8, [-12.2, 0.4, -9.8], darkStone, 0.18);
  addParkBlock(4.8, 0.8, 1.8, [12.2, 0.4, -14.2], darkStone, 0.18);
  addParkBlock(3.2, 1.05, 2.3, [-6.4, 0.52, -27.8], darkStone, -0.32);
  addParkBlock(3.2, 1.05, 2.3, [6.4, 0.52, 3.8], darkStone, -0.32);

  const basin = makeCylinder(2.25, 0.58, [0, 0.29, -12], stone, [0, 0, 0], 56);
  addDuelMesh(basin);
  const waterTop = new THREE.Mesh(new THREE.CylinderGeometry(2.03, 2.03, 0.08, 56), water);
  waterTop.position.set(0, 0.62, -12);
  addDuelObject(waterTop);
  const spout = makeCylinder(0.18, 1.3, [0, 1.12, -12], darkStone, [0, 0, 0], 22);
  addDuelMesh(spout);

  addBench(-6.6, -6.1, -0.42, benchWood, rail);
  addBench(6.6, -17.9, Math.PI - 0.42, benchWood, rail);
  addBench(-15.3, 10.2, Math.PI / 2, benchWood, rail);
  addBench(15.3, -34.1, -Math.PI / 2, benchWood, rail);

  addTree(-17.5, 16.4, 1.04, trunk, leaves);
  addTree(-17.8, -5.2, 0.9, trunk, leaves);
  addTree(-16.1, -37.1, 1.1, trunk, leaves);
  addTree(17.4, 12.7, 0.95, trunk, leaves);
  addTree(18.1, -8.5, 1.05, trunk, leaves);
  addTree(16.7, -40.2, 0.92, trunk, leaves);
  addTree(-7.8, 18.8, 0.82, trunk, leaves);
  addTree(8.2, -42.8, 0.82, trunk, leaves);

  addPergola(13.3, -8.4, stone, rail);
  addPergola(-13.3, -18.2, stone, rail);

  addLamp(-19, 2, rail, lampGlow);
  addLamp(19, -26, rail, lampGlow);
  addLamp(-3.8, 18.2, rail, lampGlow);
  addLamp(3.8, -42.2, rail, lampGlow);

  const grid = new THREE.GridHelper(44, 22, '#8ea17d', '#31503c');
  grid.position.set(0, 0.018, -12);
  grid.material.transparent = true;
  grid.material.opacity = 0.13;
  addDuelObject(grid);
}

function buildDuelRingMap() {
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#263b36', roughness: 0.92, metalness: 0.02 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#687578', roughness: 0.78, metalness: 0.05 });
  const wall = new THREE.MeshStandardMaterial({ color: '#3b464d', roughness: 0.72, metalness: 0.1 });
  const innerWall = new THREE.MeshStandardMaterial({ color: '#2e5941', roughness: 0.9, metalness: 0.02 });
  const cover = new THREE.MeshStandardMaterial({ color: '#8a6740', roughness: 0.74, metalness: 0.02 });
  const line = new THREE.MeshBasicMaterial({ color: '#ffbd5a', transparent: true, opacity: 0.22, side: THREE.DoubleSide });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(56, 64), floorMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -16);
  addRingMesh(ground);

  addRingPlane(48, 10, [0, 0.026, 8], concrete);
  addRingPlane(48, 10, [0, 0.026, -40], concrete);
  addRingPlane(10, 56, [-22, 0.028, -16], concrete);
  addRingPlane(10, 56, [22, 0.028, -16], concrete);

  addRingBlock(56.6, RING_OUTER_WALL_HEIGHT, 0.65, [0, RING_OUTER_WALL_HEIGHT * 0.5, 16.35], wall);
  addRingBlock(56.6, RING_OUTER_WALL_HEIGHT, 0.65, [0, RING_OUTER_WALL_HEIGHT * 0.5, -48.35], wall);
  addRingBlock(0.65, RING_OUTER_WALL_HEIGHT, 64.6, [-28.35, RING_OUTER_WALL_HEIGHT * 0.5, -16], wall);
  addRingBlock(0.65, RING_OUTER_WALL_HEIGHT, 64.6, [28.35, RING_OUTER_WALL_HEIGHT * 0.5, -16], wall);

  addRingBlock(19, RING_INNER_WALL_HEIGHT, 2.1, [0, RING_INNER_WALL_HEIGHT * 0.5, -2.5], innerWall);
  addRingBlock(19, RING_INNER_WALL_HEIGHT, 2.1, [0, RING_INNER_WALL_HEIGHT * 0.5, -29.5], innerWall);
  addRingBlock(2.1, RING_INNER_WALL_HEIGHT, 27, [-9.5, RING_INNER_WALL_HEIGHT * 0.5, -16], innerWall);
  addRingBlock(2.1, RING_INNER_WALL_HEIGHT, 27, [9.5, RING_INNER_WALL_HEIGHT * 0.5, -16], innerWall);

  addRingBlock(5.5, MEDIUM_COVER_HEIGHT, 2.4, [-20, MEDIUM_COVER_HEIGHT * 0.5, 3.4], cover, 0.32);
  addRingBlock(5.5, MEDIUM_COVER_HEIGHT, 2.4, [20, MEDIUM_COVER_HEIGHT * 0.5, -35.4], cover, 0.32);
  addRingBlock(2.4, MEDIUM_COVER_HEIGHT, 5.5, [-20, MEDIUM_COVER_HEIGHT * 0.5, -35.4], cover, -0.24);
  addRingBlock(2.4, MEDIUM_COVER_HEIGHT, 5.5, [20, MEDIUM_COVER_HEIGHT * 0.5, 3.4], cover, -0.24);
  addRingBlock(3.2, 0.86, 3.2, [-15, 0.43, -16], cover, Math.PI / 4);
  addRingBlock(3.2, 0.86, 3.2, [15, 0.43, -16], cover, Math.PI / 4);

  [
    [-24, 0, 12],
    [24, 0, 12],
    [-24, 0, -44],
    [24, 0, -44],
    [0, 0, 12],
    [0, 0, -44]
  ].forEach((position) => {
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.78, 36), line);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(position[0], 0.052, position[2]);
    addRingObject(marker);
  });

  const grid = new THREE.GridHelper(56, 28, '#a5b4a8', '#365047');
  grid.position.set(0, 0.018, -16);
  grid.material.transparent = true;
  grid.material.opacity = 0.13;
  addRingObject(grid);
}

function addParkPlane(width, depth, position, material, rotationZ = 0, circle = false) {
  const geometry = circle ? new THREE.CircleGeometry(width * 0.5, 56) : new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotationZ;
  mesh.position.set(position[0], position[1], position[2]);
  addDuelObject(mesh);
  return mesh;
}

function addParkBlock(width, height, depth, position, material, rotationY = 0) {
  const mesh = makeRoundedBox(width, height, depth, position, material, [0, rotationY, 0], Math.min(0.12, height * 0.22, width * 0.12, depth * 0.12));
  addDuelMesh(mesh);
  registerDuelBlocker(width, height, depth, position, rotationY);
  return mesh;
}

function addRingPlane(width, depth, position, material, rotationZ = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotationZ;
  mesh.position.set(position[0], position[1], position[2]);
  addRingObject(mesh);
  return mesh;
}

function addRingBlock(width, height, depth, position, material, rotationY = 0) {
  const mesh = makeRoundedBox(width, height, depth, position, material, [0, rotationY, 0], Math.min(0.12, height * 0.22, width * 0.12, depth * 0.12));
  addRingMesh(mesh);
  registerRingBlocker(width, height, depth, position, rotationY);
  return mesh;
}

function addBench(x, z, rotationY, woodMaterial, metalMaterial) {
  const seat = addParkBlock(1.75, 0.16, 0.48, [x, 0.52, z], woodMaterial, rotationY);
  const back = addParkBlock(1.75, 0.62, 0.14, [x, 0.82, z + Math.cos(rotationY) * 0.25], woodMaterial, rotationY);
  const leftLeg = makeCylinder(0.035, 0.52, [-0.72, 0.26, -0.12], metalMaterial, [0, 0, 0], 10);
  const rightLeg = makeCylinder(0.035, 0.52, [0.72, 0.26, -0.12], metalMaterial, [0, 0, 0], 10);
  const frame = new THREE.Group();
  frame.position.set(x, 0, z);
  frame.rotation.y = rotationY;
  frame.add(leftLeg, rightLeg);
  addDuelObject(frame);
  return [seat, back, leftLeg, rightLeg];
}

function addTree(x, z, scale, trunkMaterial, leafMaterial) {
  const trunk = makeCylinder(0.16 * scale, 1.85 * scale, [x, 0.92 * scale, z], trunkMaterial, [0, 0, 0], 14);
  addDuelMesh(trunk);
  registerDuelBlocker(0.62 * scale, 1.85 * scale, 0.62 * scale, [x, 0.92 * scale, z], 0);
  const crown = new THREE.Group();
  const leafGeometry = new THREE.SphereGeometry(0.9 * scale, 18, 12);
  [
    [0, 2.02 * scale, 0],
    [-0.44 * scale, 1.78 * scale, 0.16 * scale],
    [0.44 * scale, 1.82 * scale, -0.12 * scale]
  ].forEach((position) => {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(x + position[0], position[1], z + position[2]);
    crown.add(leaf);
  });
  addDuelObject(crown);
}

function addPergola(x, z, columnMaterial, roofMaterial) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const posts = [
    [-1.7, 1.15, -1.35],
    [1.7, 1.15, -1.35],
    [-1.7, 1.15, 1.35],
    [1.7, 1.15, 1.35]
  ].map((position) => makeCylinder(0.09, 2.3, position, columnMaterial, [0, 0, 0], 12));
  const roof = makeRoundedBox(4.15, 0.24, 3.25, [0, 2.38, 0], roofMaterial, [0, 0, 0], 0.06);
  posts.concat(roof).forEach((mesh) => duelArenaMeshes.push(mesh));
  posts.forEach((post) => registerDuelBlocker(0.36, 2.3, 0.36, [x + post.position.x, post.position.y, z + post.position.z], 0));
  group.add(...posts, roof);
  addDuelObject(group);
}

function addLamp(x, z, postMaterial, glowMaterial) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const post = makeCylinder(0.045, 2.8, [0, 1.4, 0], postMaterial, [0, 0, 0], 10);
  const head = makeRoundedBox(0.34, 0.28, 0.34, [0, 2.9, 0], glowMaterial, [0, Math.PI / 4, 0], 0.04);
  const light = new THREE.PointLight('#ffbd5a', 0.72, 10);
  light.position.set(0, 2.85, 0);
  duelArenaMeshes.push(post);
  registerDuelBlocker(0.28, 2.8, 0.28, [x, 1.4, z], 0);
  group.add(post, head, light);
  addDuelObject(group);
}

function registerDuelBlocker(width, height, depth, position, rotationY = 0) {
  registerBlocker(duelArenaBlockers, width, height, depth, position, rotationY);
}

function registerRingBlocker(width, height, depth, position, rotationY = 0) {
  registerBlocker(ringArenaBlockers, width, height, depth, position, rotationY);
}

function registerBlocker(target, width, height, depth, position, rotationY = 0) {
  if (height < SOLID_BLOCK_MIN_HEIGHT) return;
  target.push({
    x: position[0],
    y: position[1],
    z: position[2],
    halfX: width * 0.5,
    halfY: height * 0.5,
    halfZ: depth * 0.5,
    minY: Math.max(0, position[1] - height * 0.5),
    maxY: position[1] + height * 0.5,
    rotationY,
    cos: Math.cos(rotationY),
    sin: Math.sin(rotationY)
  });
}

function addRangeMesh(mesh) {
  rangeArenaGroup.add(mesh);
  rangeArenaMeshes.push(mesh);
  return mesh;
}

function addRangeObject(object) {
  rangeArenaGroup.add(object);
  return object;
}

function addDuelMesh(mesh) {
  duelArenaGroup.add(mesh);
  duelArenaMeshes.push(mesh);
  return mesh;
}

function addDuelObject(object) {
  duelArenaGroup.add(object);
  return object;
}

function addRingMesh(mesh) {
  ringArenaGroup.add(mesh);
  ringArenaMeshes.push(mesh);
  return mesh;
}

function addRingObject(object) {
  ringArenaGroup.add(object);
  return object;
}

function getActiveArenaMeshes() {
  if (!isDuelMode()) return rangeArenaMeshes;
  return getDuelMapId(activeDuelMap) === 'ring' ? ringArenaMeshes : duelArenaMeshes;
}

function getActiveBlockers() {
  if (!isDuelMode()) return [];
  return getDuelMapId(activeDuelMap) === 'ring' ? ringArenaBlockers : duelArenaBlockers;
}

function resolveActiveCollision(x, z, radius = PLAYER_COLLISION_RADIUS, feetY = playerVerticalOffset) {
  return resolveBlockerCollision(x, z, radius, getActiveBlockers(), feetY);
}

function resolveMapCollision(x, z, radius, mapId = getDuelMapId(activeDuelMap), feetY = 0) {
  const blockers = mapId === 'ring' ? ringArenaBlockers : duelArenaBlockers;
  return resolveBlockerCollision(x, z, radius, blockers, feetY);
}

function resolveBlockerCollision(x, z, radius, blockers, feetY = 0) {
  let resolvedX = x;
  let resolvedZ = z;
  let collided = false;

  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    blockers.forEach((blocker) => {
      if (blocker.maxY <= feetY + OBSTACLE_CLEARANCE) return;
      const next = resolvePointAgainstBlocker(resolvedX, resolvedZ, radius, blocker);
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

function getBotNavGraph(mapId = getDuelMapId(activeDuelMap)) {
  const normalizedMap = getDuelMapId(mapId);
  if (botNavCache.has(normalizedMap)) return botNavCache.get(normalizedMap);

  const config = getDuelMapConfig(normalizedMap);
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
    const z = THREE.MathUtils.lerp(minZ, maxZ, row / rows);
    for (let col = 0; col <= cols; col += 1) {
      const x = THREE.MathUtils.lerp(minX, maxX, col / cols);
      const resolved = resolveMapCollision(x, z, BOT_COLLISION_RADIUS, normalizedMap, 0);
      if (resolved.collided || Math.hypot(resolved.x - x, resolved.z - z) > 0.04) continue;
      const node = { id: `${col}:${row}`, col, row, x, z };
      nodes.push(node);
      byKey.set(node.id, node);
    }
  }

  const graph = { normalizedMap, nodes, byKey, cols, rows, minX, maxX, minZ, maxZ };
  botNavCache.set(normalizedMap, graph);
  return graph;
}

function isBotNavSegmentClear(a, b, mapId = getDuelMapId(activeDuelMap)) {
  const blockers = getDuelMapId(mapId) === 'ring' ? ringArenaBlockers : duelArenaBlockers;
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(distance / 0.42));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const x = THREE.MathUtils.lerp(a.x, b.x, t);
    const z = THREE.MathUtils.lerp(a.z, b.z, t);
    const resolved = resolveBlockerCollision(x, z, BOT_COLLISION_RADIUS, blockers, 0);
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

function findBotNavRoute(start, target, mapId = getDuelMapId(activeDuelMap)) {
  const graph = getBotNavGraph(mapId);
  const startNode = findNearestBotNavNode(graph, start);
  const targetNode = findNearestBotNavNode(graph, target);
  if (!startNode || !targetNode) return [new THREE.Vector3(target.x, start.y ?? CAMERA_HEIGHT, target.z)];
  if (isBotNavSegmentClear(start, target, mapId)) return [new THREE.Vector3(target.x, start.y ?? CAMERA_HEIGHT, target.z)];

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
  const getNeighbors = (node) => {
    const neighbors = [];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (!rowOffset && !colOffset) continue;
        const next = graph.byKey.get(`${node.col + colOffset}:${node.row + rowOffset}`);
        if (!next) continue;
        if (Math.abs(rowOffset) + Math.abs(colOffset) === 2) {
          const sideA = graph.byKey.get(`${node.col + colOffset}:${node.row}`);
          const sideB = graph.byKey.get(`${node.col}:${node.row + rowOffset}`);
          if (!sideA || !sideB) continue;
        }
        if (!isBotNavSegmentClear(node, next, mapId)) continue;
        neighbors.push(next);
      }
    }
    return neighbors;
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
        if (node) route.unshift(new THREE.Vector3(node.x, start.y ?? CAMERA_HEIGHT, node.z));
        cursor = cameFrom.get(cursor);
      }
      route.push(new THREE.Vector3(target.x, start.y ?? CAMERA_HEIGHT, target.z));
      return route.slice(1);
    }
    open.delete(currentId);
    const current = graph.byKey.get(currentId);
    getNeighbors(current).forEach((neighbor) => {
      const tentative = (gScore.get(currentId) ?? Infinity) + Math.hypot(neighbor.x - current.x, neighbor.z - current.z);
      if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) return;
      cameFrom.set(neighbor.id, currentId);
      gScore.set(neighbor.id, tentative);
      fScore.set(neighbor.id, tentative + Math.hypot(neighbor.x - targetNode.x, neighbor.z - targetNode.z));
      open.add(neighbor.id);
    });
  }
  return [new THREE.Vector3(target.x, start.y ?? CAMERA_HEIGHT, target.z)];
}

function getBotNavigationIntent(position, target, now, mapId = getDuelMapId(activeDuelMap)) {
  const targetVector = new THREE.Vector3(target.x, position.y, target.z);
  const needsRepath = !bot.navTarget || bot.navRouteIndex >= bot.navRoute.length ||
    bot.navTarget.distanceTo(targetVector) > BOT_NAV_TARGET_SHIFT || now >= bot.navNextAt ||
    (bot.navStuckSince && now - bot.navStuckSince > BOT_NAV_STUCK_MS);
  if (needsRepath) {
    bot.navRoute = findBotNavRoute(position, targetVector, mapId);
    bot.navRouteIndex = 0;
    bot.navTarget = targetVector;
    bot.navNextAt = now + BOT_NAV_REPATH_MS;
    bot.navStuckSince = 0;
  }
  let waypoint = bot.navRoute[bot.navRouteIndex] || targetVector;
  if (Math.hypot(waypoint.x - position.x, waypoint.z - position.z) < 0.75 && bot.navRouteIndex < bot.navRoute.length - 1) {
    bot.navRouteIndex += 1;
    waypoint = bot.navRoute[bot.navRouteIndex];
  }
  return waypoint;
}

function getActiveSupportHeight(x, z, maxY = Infinity) {
  let supportHeight = 0;
  getActiveBlockers().forEach((blocker) => {
    if (blocker.maxY > maxY || blocker.maxY <= supportHeight) return;
    const local = toBlockerLocal(x, z, blocker);
    if (Math.abs(local.x) > blocker.halfX + SUPPORT_EDGE_TOLERANCE) return;
    if (Math.abs(local.z) > blocker.halfZ + SUPPORT_EDGE_TOLERANCE) return;
    supportHeight = blocker.maxY;
  });
  return supportHeight;
}

function resolvePointAgainstBlocker(x, z, radius, blocker) {
  const local = toBlockerLocal(x, z, blocker);
  const halfX = blocker.halfX + radius;
  const halfZ = blocker.halfZ + radius;
  if (Math.abs(local.x) >= halfX || Math.abs(local.z) >= halfZ) return null;

  const pushX = halfX - Math.abs(local.x);
  const pushZ = halfZ - Math.abs(local.z);
  if (pushX < pushZ) {
    local.x = local.x < 0 ? -halfX : halfX;
  } else {
    local.z = local.z < 0 ? -halfZ : halfZ;
  }
  return fromBlockerLocal(local.x, local.z, blocker);
}

function findActiveBlockerHit(origin, end, padding = 0) {
  return findBlockerHit(getActiveBlockers(), origin, end, padding);
}

function findBlockerHit(blockers, origin, end, padding = 0) {
  let best = null;
  blockers.forEach((blocker) => {
    const t = segmentBlockerIntersectionT(origin, end, blocker, padding);
    if (t === null || t < 0 || t > 1) return;
    if (best && t >= best.t) return;
    best = {
      t,
      point: new THREE.Vector3(
        THREE.MathUtils.lerp(origin.x, end.x, t),
        THREE.MathUtils.lerp(origin.y ?? 0, end.y ?? 0, t),
        THREE.MathUtils.lerp(origin.z, end.z, t)
      )
    };
  });
  return best;
}

function segmentBlockerIntersectionT(origin, end, blocker, padding = 0) {
  const a = toBlockerLocal(origin.x, origin.z, blocker);
  const b = toBlockerLocal(end.x, end.z, blocker);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const originY = origin.y ?? CAMERA_HEIGHT;
  const endY = end.y ?? CAMERA_HEIGHT;
  const dy = endY - originY;
  const rect = {
    minX: -blocker.halfX - padding,
    maxX: blocker.halfX + padding,
    minZ: -blocker.halfZ - padding,
    maxZ: blocker.halfZ + padding,
    minY: blocker.minY - padding,
    maxY: blocker.maxY + padding
  };
  let tMin = 0;
  let tMax = 1;
  const checks = [
    [-dx, a.x - rect.minX],
    [dx, rect.maxX - a.x],
    [-dz, a.z - rect.minZ],
    [dz, rect.maxZ - a.z],
    [-dy, originY - rect.minY],
    [dy, rect.maxY - originY]
  ];

  for (const [p, q] of checks) {
    if (Math.abs(p) < 0.000001) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return null;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return null;
      if (t < tMax) tMax = t;
    }
  }

  if (tMax < tMin || tMax <= 0 || tMin >= 1) return null;
  return Math.max(0, tMin);
}

function toBlockerLocal(x, z, blocker) {
  const dx = x - blocker.x;
  const dz = z - blocker.z;
  return {
    x: dx * blocker.cos - dz * blocker.sin,
    z: dx * blocker.sin + dz * blocker.cos
  };
}

function fromBlockerLocal(x, z, blocker) {
  return {
    x: blocker.x + x * blocker.cos + z * blocker.sin,
    z: blocker.z - x * blocker.sin + z * blocker.cos
  };
}

function getPlayerBounds() {
  return isDuelMode() ? getDuelMapConfig(activeDuelMap).bounds : RANGE_BOUNDS;
}

function setArenaMode(mode = 'range') {
  const duelMode = mode === 'duel';
  const mapId = getDuelMapId(activeDuelMap);
  if (rangeArenaGroup) rangeArenaGroup.visible = !duelMode;
  if (duelArenaGroup) duelArenaGroup.visible = duelMode && mapId === 'park';
  if (ringArenaGroup) ringArenaGroup.visible = duelMode && mapId === 'ring';
  if (scene?.background?.set) scene.background.set(duelMode ? '#0f1712' : '#10131a');
  if (scene?.fog) {
    scene.fog.color.set(duelMode ? '#0f1712' : '#10131a');
    scene.fog.near = duelMode ? (mapId === 'ring' ? 24 : 22) : 15;
    scene.fog.far = duelMode ? (mapId === 'ring' ? 96 : 92) : 34;
  }
}

function getDuelMapId(value = DEFAULT_SETTINGS.duelMap) {
  return DUEL_MAPS[value] ? value : DEFAULT_SETTINGS.duelMap;
}

function getDuelMapConfig(value = DEFAULT_SETTINGS.duelMap) {
  return DUEL_MAPS[getDuelMapId(value)] || DUEL_MAPS.park;
}

function setDuelMap(id) {
  const nextMap = getDuelMapId(id);
  activeDuelMap = nextMap;
  storage.settings.duelMap = nextMap;
  saveStorage();
  if (isDuelMode()) setArenaMode('duel');
  syncDuelMapUi();
}

function applyRoomDuelMap(id) {
  const nextMap = getDuelMapId(id);
  if (activeDuelMap === nextMap && storage.settings.duelMap === nextMap) return;
  activeDuelMap = nextMap;
  storage.settings.duelMap = nextMap;
  saveStorage();
  if (isDuelMode()) setArenaMode('duel');
  syncDuelMapUi();
}

function getDuelSpawn(slot = 'red') {
  const team = getPlayerTeam(slot);
  const number = Math.max(1, Number(String(slot || '').match(/\d+/)?.[0]) || 1);
  const spawns = getDuelMapConfig(activeDuelMap).spawns[team] || DUEL_MAPS.park.spawns.red;
  return spawns[(number - 1) % spawns.length];
}

function getPlayerTeam(slotOrPlayer = 'red') {
  const value = typeof slotOrPlayer === 'object'
    ? slotOrPlayer.team || slotOrPlayer.slot
    : slotOrPlayer;
  return String(value || '').startsWith('blue') ? 'blue' : 'red';
}

function teamLabel(team) {
  return team === 'blue' ? '蓝方' : '红方';
}

function addZoneFrames() {
  const frameMaterial = new THREE.LineBasicMaterial({ color: '#3f4d64', transparent: true, opacity: 0.58 });
  ZONES.slice(0, 5).forEach((zone) => {
    const z = -15.98;
    const points = [
      new THREE.Vector3(zone.x[0], zone.y[0], z),
      new THREE.Vector3(zone.x[1], zone.y[0], z),
      new THREE.Vector3(zone.x[1], zone.y[1], z),
      new THREE.Vector3(zone.x[0], zone.y[1], z),
      new THREE.Vector3(zone.x[0], zone.y[0], z)
    ];
    addRangeObject(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), frameMaterial));
  });
}

function addRangeMarkers() {
  const material = new THREE.MeshBasicMaterial({ color: '#ffbd5a', transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  [-6, -10, -14].forEach((z, index) => {
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.62 + index * 0.16, 0.66 + index * 0.16, 32), material);
    marker.position.set(0, 0.045, z);
    marker.rotation.x = -Math.PI / 2;
    addRangeObject(marker);
  });
}

function buildTarget() {
  targetGroup = new THREE.Group();
  targetBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 32, 20),
    new THREE.MeshStandardMaterial({
      color: '#ff4d7d',
      emissive: '#ff255f',
      emissiveIntensity: 0.58,
      roughness: 0.24,
      metalness: 0.08
    })
  );
  targetBody.userData.kind = 'target-body';

  targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.018, 8, 48),
    new THREE.MeshBasicMaterial({ color: '#e8edf7', transparent: true, opacity: 0.84 })
  );
  targetHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.84, 0.9, 48),
    new THREE.MeshBasicMaterial({ color: '#2ee6a6', transparent: true, opacity: 0.34, side: THREE.DoubleSide })
  );

  targetGroup.add(targetBody, targetRing, targetHalo);
  scene.add(targetGroup);
  spawnPreviewTarget();
}

function buildWeapon() {
  const metal = new THREE.MeshStandardMaterial({ color: '#2c3442', roughness: 0.48, metalness: 0.72 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#0d1118', roughness: 0.55, metalness: 0.78 });
  const wornMetal = new THREE.MeshStandardMaterial({ color: '#435067', roughness: 0.42, metalness: 0.82 });
  const wood = new THREE.MeshStandardMaterial({ color: '#94552b', roughness: 0.64, metalness: 0.04 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#11131a', roughness: 0.86, metalness: 0.12 });
  const accent = new THREE.MeshStandardMaterial({ color: '#2ee6a6', roughness: 0.38, metalness: 0.18, emissive: '#0a4d38', emissiveIntensity: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c49348', roughness: 0.44, metalness: 0.58 });
  const lens = new THREE.MeshStandardMaterial({ color: '#66d8ff', roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.58, emissive: '#0d3d55', emissiveIntensity: 0.28 });
  const blade = new THREE.MeshStandardMaterial({ color: '#d7e7ff', roughness: 0.24, metalness: 0.86 });
  const bladeEdge = new THREE.MeshStandardMaterial({ color: '#f7fbff', roughness: 0.18, metalness: 0.9 });

  weaponGroup = new THREE.Group();
  weaponGroup.position.copy(WEAPON_HIP_POSITION);
  weaponGroup.rotation.copy(WEAPON_HIP_ROTATION);
  weaponGroup.scale.setScalar(0.92);

  weaponModels = {
    ak: createAkModel({ metal, darkMetal, wornMetal, wood, rubber, accent, brass }),
    sniper: createSniperModel({ metal, darkMetal, wornMetal, rubber, accent, lens }),
    shotgun: createShotgunModel({ metal, darkMetal, wornMetal, wood, rubber, accent })
  };
  knifeGroup = createClawKnifeModel({ darkMetal, rubber, blade, bladeEdge, accent });
  icecreamGroup = createIcecreamModel();

  weaponGroup.add(weaponModels.ak.group, weaponModels.sniper.group, weaponModels.shotgun.group, knifeGroup);
  camera.add(weaponGroup);
  camera.add(icecreamGroup);
  syncWeaponModel();
  window.setTimeout(() => loadDetailedAkModel(), 80);
}

async function loadDetailedAkModel() {
  if (!weaponGroup || !camera || detailedAkLoadState === 'loading' || detailedAkLoadState === 'ready') return;
  detailedAkLoadState = 'loading';
  let lastError = null;

  for (const [attemptIndex, delay] of DETAILED_AK_ATTEMPT_DELAYS.entries()) {
    if (delay) await waitForDetailedAkRetry(delay);
    try {
      const object = await loadDetailedAkSource();
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!size.z || !size.y) throw new Error('AK model has invalid bounds');

      const lengthScale = 2.02 / size.z;
      const scaleX = lengthScale * 1.12;
      object.scale.set(scaleX, lengthScale, lengthScale);
      object.position.set(-center.x * scaleX, -center.y * lengthScale, -center.z * lengthScale);
      object.rotation.y = Math.PI;
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          const materialsToTune = Array.isArray(child.material) ? child.material : [child.material];
          materialsToTune.forEach((material) => {
            material.side = THREE.FrontSide;
            material.needsUpdate = true;
          });
        }
      });

      const muzzleFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.44, 16, 1, true),
        createFlashMaterial()
      );
      muzzleFlash.rotation.x = -Math.PI / 2;
      muzzleFlash.position.set(0, 0.02, -1.25);
      muzzleFlash.visible = false;
      object.add(muzzleFlash);

      const muzzleLight = new THREE.PointLight('#ffbd5a', 0, 2.6);
      muzzleLight.position.copy(muzzleFlash.position);
      object.add(muzzleLight);

      const muzzleTip = new THREE.Object3D();
      muzzleTip.position.set(0, 0.02, -1.28);
      object.add(muzzleTip);
      const aimPoint = new THREE.Object3D();
      aimPoint.position.set(
        0,
        bounds.max.y - size.y * AK_REAR_SIGHT_REFERENCE_FROM_TOP,
        center.z + size.z * 0.012
      );
      object.add(aimPoint);

      const previous = weaponModels.ak;
      weaponGroup.remove(previous.group);
      previous.group.visible = false;
      weaponModels.ak = { group: object, muzzleTip, muzzleFlash, muzzleLight, aimPoint, detailed: true };
      weaponGroup.add(object);
      syncWeaponModel();
      previewAkSource = object;
      weaponPreviews.forEach((preview) => setWeaponPreviewModel(preview, object));
      detailedAkLoadState = 'ready';
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Detailed AK model load attempt ${attemptIndex + 1} failed.`, error);
    }
  }

  detailedAkLoadState = 'fallback';
  console.warn('Detailed AK model is unavailable for now; using the built-in model and retrying in the background.', lastError);
  window.clearTimeout(detailedAkRetryTimer);
  detailedAkRetryTimer = window.setTimeout(() => {
    detailedAkLoadState = 'idle';
    loadDetailedAkModel();
  }, DETAILED_AK_BACKGROUND_RETRY_MS);
}

async function loadDetailedAkSource() {
  const [materialText, objectText] = await Promise.all([
    fetchDetailedAkText('123456.mtl'),
    fetchDetailedAkText('ak-47.obj')
  ]);
  const materialLoader = new MTLLoader();
  const materials = materialLoader.parse(materialText, DETAILED_AK_ASSET_PATH);
  materials.preload();
  const objectLoader = new OBJLoader();
  objectLoader.setMaterials(materials);
  return objectLoader.parse(objectText);
}

async function fetchDetailedAkText(filename) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DETAILED_AK_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${DETAILED_AK_ASSET_PATH}${filename}`, {
      cache: 'force-cache',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`AK asset request failed: ${filename} (${response.status})`);
    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

function waitForDetailedAkRetry(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function initWeaponPreviews() {
  document.querySelectorAll('.weapon-silhouette .weapon-preview-canvas').forEach((canvas) => {
    const container = canvas.parentElement;
    if (!container) return;
    try {
      const previewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
      const previewScene = new THREE.Scene();
      const previewCamera = new THREE.PerspectiveCamera(28, 1, 0.01, 40);
      previewCamera.position.set(0, 0.12, 4.2);
      previewCamera.lookAt(0, 0, 0);
      previewScene.add(new THREE.HemisphereLight('#d8f5ff', '#090d12', 1.65));
      const key = new THREE.DirectionalLight('#ffffff', 2.8);
      key.position.set(2.5, 3.8, 4.5);
      previewScene.add(key);
      const rim = new THREE.PointLight('#2ee6a6', 2.2, 8);
      rim.position.set(-2.8, 1.2, 1.8);
      previewScene.add(rim);
      const preview = { canvas, container, renderer: previewRenderer, scene: previewScene, camera: previewCamera, model: null, angle: 0 };
      weaponPreviews.push(preview);
      setWeaponPreviewModel(preview, previewAkSource || weaponModels.ak?.group);
      resizeWeaponPreview(preview);
    } catch (error) {
      canvas.hidden = true;
      console.warn('Weapon preview unavailable.', error);
    }
  });
}

function setWeaponPreviewModel(preview, source) {
  if (!preview?.scene || !source) return;
  if (preview.model) preview.scene.remove(preview.model);
  const sourceClone = source.clone(true);
  sourceClone.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    if (child.material) {
      const cloneMaterial = (material) => {
        const previewMaterial = material.clone();
        previewMaterial.side = THREE.DoubleSide;
        return previewMaterial;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMaterial)
        : cloneMaterial(child.material);
    }
  });
  const model = new THREE.Group();
  model.add(sourceClone);
  model.scale.setScalar(1.1);
  model.position.set(0.04, -0.02, 0);
  model.rotation.x = -0.12;
  model.rotation.y = -Math.PI / 2 + 0.12;
  preview.scene.add(model);
  preview.model = model;
  preview.container.classList.toggle('has-3d-preview', selectedPrimaryWeapon === 'ak');
}

function resizeWeaponPreview(preview) {
  if (!preview?.renderer || !preview.container) return;
  const rect = preview.container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  preview.camera.aspect = width / height;
  preview.camera.updateProjectionMatrix();
  preview.renderer.setSize(width, height, false);
}

function renderWeaponPreviews(delta) {
  weaponPreviews.forEach((preview) => {
    if (!preview.model || preview.container.offsetParent === null) return;
    preview.angle += delta * 0.34;
    preview.model.rotation.y = -Math.PI / 2 + 0.12 + Math.sin(preview.angle) * 0.11;
    preview.renderer.render(preview.scene, preview.camera);
  });
}

function syncWeaponPreviewVisibility() {
  weaponPreviews.forEach((preview) => {
    preview.container.classList.toggle('has-3d-preview', selectedPrimaryWeapon === 'ak' && Boolean(preview.model));
  });
}

function createAkModel(materials) {
  const { metal, darkMetal, wornMetal, wood, rubber, accent, brass } = materials;
  const group = new THREE.Group();
  group.add(makeRoundedBox(0.52, 0.18, 0.48, [0, -0.02, 0.06], metal, [0, 0, 0], 0.035));
  group.add(makeRoundedBox(0.42, 0.085, 0.46, [0, 0.1, 0.0], darkMetal, [0.02, 0, 0], 0.032));
  group.add(makeRoundedBox(0.12, 0.06, 0.16, [0.28, 0.03, 0.01], brass, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.26, 0.035, 0.09, [0.02, 0.18, 0.22], darkMetal, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.2, 0.04, 0.08, [0.02, 0.185, -0.2], darkMetal, [0, 0, 0], 0.014));

  group.add(makeRoundedBox(0.42, 0.14, 0.36, [0.01, -0.045, -0.42], wood, [-0.03, 0, 0], 0.05));
  group.add(makeRoundedBox(0.34, 0.075, 0.34, [0.01, 0.075, -0.44], wood, [0.04, 0, 0], 0.035));
  group.add(makeRoundedBox(0.22, 0.12, 0.24, [0.02, -0.055, 0.4], wood, [0.05, 0, 0], 0.038));
  group.add(makeRoundedBox(0.32, 0.2, 0.18, [0.01, -0.075, 0.66], wood, [0.08, 0, 0], 0.045));
  group.add(makeRoundedBox(0.2, 0.36, 0.16, [0.09, -0.31, 0.13], rubber, [0.23, 0, -0.06], 0.045));

  const magazine = new THREE.Group();
  magazine.add(makeRoundedBox(0.19, 0.43, 0.17, [0, -0.08, 0], darkMetal, [-0.06, 0, 0], 0.035));
  magazine.add(makeRoundedBox(0.17, 0.28, 0.15, [0, -0.39, -0.06], darkMetal, [-0.22, 0, 0], 0.032));
  magazine.add(makeRoundedBox(0.14, 0.045, 0.13, [0, -0.56, -0.14], wornMetal, [-0.28, 0, 0], 0.018));
  magazine.position.set(0.03, -0.18, 0.02);
  group.add(magazine);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.009, 8, 22, Math.PI * 1.28), darkMetal);
  triggerGuard.position.set(0.03, -0.2, 0.2);
  triggerGuard.rotation.set(0.46, Math.PI / 2, -0.16);
  group.add(triggerGuard);
  group.add(makeRoundedBox(0.025, 0.095, 0.026, [0.055, -0.22, 0.16], darkMetal, [-0.22, 0, 0], 0.008));

  group.add(makeCylinder(0.04, 0.78, [0.01, 0.01, -0.86], darkMetal, [Math.PI / 2, 0, 0], 24));
  group.add(makeCylinder(0.025, 0.46, [0.01, 0.01, -1.42], darkMetal, [Math.PI / 2, 0, 0], 24));
  group.add(makeCylinder(0.024, 0.68, [0.01, 0.11, -0.78], wornMetal, [Math.PI / 2, 0, 0], 18));
  group.add(makeCylinder(0.047, 0.18, [0.01, 0.01, -1.75], wornMetal, [Math.PI / 2, 0, 0], 24));
  group.add(makeRoundedBox(0.11, 0.026, 0.035, [0.075, 0.015, -1.75], darkMetal, [0, 0, 0], 0.008));
  group.add(makeRoundedBox(0.11, 0.026, 0.035, [-0.055, 0.015, -1.75], darkMetal, [0, 0, 0], 0.008));

  group.add(makeRoundedBox(0.036, 0.13, 0.032, [0.01, 0.195, -1.17], darkMetal, [0, 0, 0], 0.012));
  group.add(makeRoundedBox(0.13, 0.025, 0.035, [0.01, 0.255, -1.17], darkMetal, [0, 0, 0], 0.01));
  const frontSightDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 10, 8),
    accent
  );
  frontSightDot.position.set(0.01, 0.285, -1.17);
  group.add(frontSightDot);

  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.44, 16, 1, true), createFlashMaterial());
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0.01, 0.01, -1.88);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight('#ffbd5a', 0, 2.6);
  muzzleLight.position.copy(muzzleFlash.position);
  group.add(muzzleLight);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0.01, 0.01, -1.9);
  group.add(muzzleTip);
  return { group, muzzleTip, muzzleFlash, muzzleLight };
}

function createSniperModel(materials) {
  const { metal, darkMetal, wornMetal, rubber, accent, lens } = materials;
  const group = new THREE.Group();
  group.add(makeRoundedBox(0.24, 0.16, 0.82, [0, -0.025, 0.03], metal, [0, 0, 0], 0.04));
  group.add(makeRoundedBox(0.19, 0.075, 0.72, [0, 0.09, -0.05], darkMetal, [0.01, 0, 0], 0.024));
  group.add(makeRoundedBox(0.3, 0.13, 0.34, [0, -0.09, 0.54], rubber, [0.06, 0, 0], 0.05));
  group.add(makeRoundedBox(0.22, 0.2, 0.12, [0, -0.13, 0.79], rubber, [0.04, 0, 0], 0.045));
  group.add(makeRoundedBox(0.2, 0.065, 0.36, [0, 0.08, 0.39], rubber, [0.03, 0, 0], 0.034));
  group.add(makeRoundedBox(0.16, 0.38, 0.14, [0.06, -0.34, 0.16], rubber, [-0.18, 0, -0.05], 0.045));
  group.add(makeRoundedBox(0.12, 0.24, 0.12, [0.02, -0.28, -0.2], darkMetal, [-0.06, 0, 0], 0.03));

  group.add(makeCylinder(0.031, 1.42, [0, 0.01, -1.08], darkMetal, [Math.PI / 2, 0, 0], 32));
  group.add(makeCylinder(0.02, 0.92, [0, 0.01, -1.62], wornMetal, [Math.PI / 2, 0, 0], 24));
  group.add(makeCylinder(0.055, 0.24, [0, 0.01, -2.15], darkMetal, [Math.PI / 2, 0, 0], 32));
  group.add(makeRoundedBox(0.13, 0.028, 0.035, [0.08, 0.012, -2.15], wornMetal, [0, 0, 0], 0.008));
  group.add(makeRoundedBox(0.13, 0.028, 0.035, [-0.08, 0.012, -2.15], wornMetal, [0, 0, 0], 0.008));

  group.add(makeRoundedBox(0.36, 0.035, 0.72, [0, 0.17, -0.2], darkMetal, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.075, 0.09, 0.12, [-0.12, 0.225, 0.08], darkMetal, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.075, 0.09, 0.12, [0.12, 0.225, 0.08], darkMetal, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.075, 0.09, 0.12, [-0.12, 0.225, -0.48], darkMetal, [0, 0, 0], 0.014));
  group.add(makeRoundedBox(0.075, 0.09, 0.12, [0.12, 0.225, -0.48], darkMetal, [0, 0, 0], 0.014));

  const scope = new THREE.Group();
  scope.add(makeCylinder(0.105, 0.64, [0, 0.31, -0.2], darkMetal, [Math.PI / 2, 0, 0], 36));
  scope.add(makeCylinder(0.145, 0.16, [0, 0.31, 0.18], darkMetal, [Math.PI / 2, 0, 0], 36));
  scope.add(makeCylinder(0.15, 0.18, [0, 0.31, -0.62], darkMetal, [Math.PI / 2, 0, 0], 36));
  scope.add(makeCylinder(0.112, 0.026, [0, 0.31, 0.275], lens, [Math.PI / 2, 0, 0], 36));
  scope.add(makeCylinder(0.118, 0.026, [0, 0.31, -0.72], lens, [Math.PI / 2, 0, 0], 36));
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), accent);
  glint.position.set(0.045, 0.36, 0.285);
  scope.add(glint);
  group.add(scope);

  const bolt = makeCylinder(0.018, 0.2, [0.22, 0.04, 0.09], wornMetal, [0, 0, Math.PI / 2], 16);
  group.add(bolt);
  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), wornMetal);
  boltKnob.position.set(0.33, 0.04, 0.09);
  group.add(boltKnob);

  const bipodLeft = makeCylinder(0.011, 0.42, [-0.1, -0.24, -0.78], darkMetal, [0.5, 0, 0.24], 10);
  const bipodRight = makeCylinder(0.011, 0.42, [0.1, -0.24, -0.78], darkMetal, [0.5, 0, -0.24], 10);
  group.add(bipodLeft, bipodRight);

  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.56, 18, 1, true), createFlashMaterial());
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.01, -2.31);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight('#ffbd5a', 0, 3.2);
  muzzleLight.position.copy(muzzleFlash.position);
  group.add(muzzleLight);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0.01, -2.34);
  group.add(muzzleTip);
  return { group, muzzleTip, muzzleFlash, muzzleLight };
}

function createShotgunModel(materials) {
  const { metal, darkMetal, wornMetal, wood, rubber, accent } = materials;
  const group = new THREE.Group();

  group.add(makeRoundedBox(0.34, 0.17, 0.62, [0, -0.02, 0.12], metal, [0, 0, 0], 0.04));
  group.add(makeRoundedBox(0.26, 0.1, 0.46, [0, 0.09, -0.08], darkMetal, [0.02, 0, 0], 0.026));
  group.add(makeRoundedBox(0.42, 0.18, 0.42, [0, -0.08, 0.58], wood, [0.06, 0, 0], 0.06));
  group.add(makeRoundedBox(0.35, 0.2, 0.18, [0, -0.12, 0.9], rubber, [0.03, 0, 0], 0.045));
  group.add(makeRoundedBox(0.17, 0.34, 0.14, [0.06, -0.34, 0.2], rubber, [-0.18, 0, -0.05], 0.045));

  const pump = new THREE.Group();
  pump.add(makeRoundedBox(0.36, 0.16, 0.62, [0, 0, 0], wood, [0, 0, 0], 0.055));
  pump.add(makeRoundedBox(0.39, 0.035, 0.5, [0, 0.095, 0], wornMetal, [0, 0, 0], 0.014));
  pump.position.set(0, -0.03, SHOTGUN_PUMP_REST_Z);
  group.add(pump);

  group.add(makeCylinder(0.039, 1.3, [-0.05, 0.01, -1.16], darkMetal, [Math.PI / 2, 0, 0], 28));
  group.add(makeCylinder(0.039, 1.3, [0.05, 0.01, -1.16], darkMetal, [Math.PI / 2, 0, 0], 28));
  group.add(makeCylinder(0.062, 0.16, [-0.05, 0.01, -1.86], wornMetal, [Math.PI / 2, 0, 0], 30));
  group.add(makeCylinder(0.062, 0.16, [0.05, 0.01, -1.86], wornMetal, [Math.PI / 2, 0, 0], 30));
  group.add(makeCylinder(0.026, 0.96, [0, -0.085, -1.05], darkMetal, [Math.PI / 2, 0, 0], 18));

  group.add(makeRoundedBox(0.2, 0.035, 0.08, [0, 0.2, -0.08], darkMetal, [0, 0, 0], 0.012));
  group.add(makeRoundedBox(0.035, 0.11, 0.034, [0, 0.18, -1.46], darkMetal, [0, 0, 0], 0.01));
  const sightDot = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), accent);
  sightDot.position.set(0, 0.245, -1.46);
  group.add(sightDot);

  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.48, 18, 1, true), createFlashMaterial());
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.01, -2.02);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight('#ffbd5a', 0, 3.4);
  muzzleLight.position.copy(muzzleFlash.position);
  group.add(muzzleLight);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0.01, -2.03);
  group.add(muzzleTip);
  return { group, muzzleTip, muzzleFlash, muzzleLight, pump };
}

function createClawKnifeModel(materials) {
  const { darkMetal, rubber, blade, bladeEdge, accent } = materials;
  const group = new THREE.Group();
  const handle = makeRoundedBox(0.09, 0.34, 0.08, [0.06, -0.07, -0.02], rubber, [0.28, 0.05, -0.46], 0.04);
  group.add(handle);
  group.add(makeRoundedBox(0.036, 0.28, 0.092, [0.025, -0.055, -0.02], darkMetal, [0.28, 0.05, -0.46], 0.018));
  group.add(makeRoundedBox(0.026, 0.2, 0.096, [0.106, -0.085, -0.02], darkMetal, [0.28, 0.05, -0.46], 0.014));

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 10, 28), darkMetal);
  ring.position.set(0.16, -0.2, 0.02);
  ring.rotation.set(1.18, 0.24, -0.36);
  group.add(ring);

  const bladeBody = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 12, 46, Math.PI * 1.28), blade);
  bladeBody.position.set(-0.055, 0.1, -0.23);
  bladeBody.rotation.set(0.62, -0.2, -1.2);
  group.add(bladeBody);

  const bladeCut = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.008, 8, 46, Math.PI * 1.14), bladeEdge);
  bladeCut.position.set(-0.068, 0.113, -0.235);
  bladeCut.rotation.set(0.62, -0.2, -1.2);
  group.add(bladeCut);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.13, 18), bladeEdge);
  tip.position.set(-0.225, 0.25, -0.35);
  tip.rotation.set(1.18, -0.22, -0.88);
  group.add(tip);

  const screwA = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), accent);
  screwA.position.set(0.045, 0.04, -0.055);
  const screwB = screwA.clone();
  screwB.position.set(0.1, -0.12, -0.005);
  group.add(screwA, screwB);
  return group;
}

function createIcecreamModel() {
  const group = new THREE.Group();
  group.visible = false;
  group.position.set(0.58, -0.78, -0.72);
  group.rotation.set(-0.34, -0.28, -0.12);

  const stick = new THREE.MeshStandardMaterial({ color: '#c99158', roughness: 0.72, metalness: 0.02 });
  const chocolate = new THREE.MeshStandardMaterial({ color: '#3a211b', roughness: 0.52, metalness: 0.04 });
  const chocolateDark = new THREE.MeshStandardMaterial({ color: '#1f100d', roughness: 0.64, metalness: 0.04 });
  const vanilla = new THREE.MeshStandardMaterial({ color: '#fff0c4', roughness: 0.58, metalness: 0.02, emissive: '#533b16', emissiveIntensity: 0.08 });
  const stripe = new THREE.MeshStandardMaterial({ color: '#95f0ff', roughness: 0.36, metalness: 0.05, emissive: '#174b55', emissiveIntensity: 0.18 });
  const nut = new THREE.MeshStandardMaterial({ color: '#d9a85f', roughness: 0.7, metalness: 0.02 });

  group.add(makeRoundedBox(0.12, 0.48, 0.055, [0, -0.42, 0.012], stick, [0, 0, 0.04], 0.024));
  group.add(makeRoundedBox(0.4, 0.64, 0.16, [0, 0.02, 0], chocolate, [0, 0, 0], 0.12));
  group.add(makeRoundedBox(0.28, 0.44, 0.022, [0.015, 0.03, -0.083], vanilla, [0, 0, 0], 0.055));
  group.add(makeRoundedBox(0.31, 0.055, 0.026, [0.005, -0.19, -0.098], stripe, [0, 0, -0.04], 0.018));
  group.add(makeRoundedBox(0.22, 0.045, 0.027, [0.005, -0.25, -0.1], vanilla, [0, 0, 0.04], 0.014));

  const biteSpots = [
    [0.15, 0.31, -0.096, 0.075],
    [0.205, 0.245, -0.098, 0.058],
    [0.095, 0.36, -0.099, 0.048]
  ];
  biteSpots.forEach(([x, y, z, radius]) => {
    const bite = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), vanilla);
    bite.scale.z = 0.18;
    bite.position.set(x, y, z);
    group.add(bite);
  });

  [
    [-0.12, 0.24, -0.092],
    [-0.06, 0.14, -0.094],
    [0.11, -0.08, -0.096],
    [0.14, 0.12, -0.094],
    [-0.15, -0.08, -0.095]
  ].forEach(([x, y, z], index) => {
    const crumb = new THREE.Mesh(new THREE.SphereGeometry(0.014 + (index % 2) * 0.005, 8, 6), index % 2 ? nut : chocolateDark);
    crumb.scale.z = 0.55;
    crumb.position.set(x, y, z);
    group.add(crumb);
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 8, 36, Math.PI * 1.62), chocolateDark);
  rim.position.set(0, 0.31, -0.088);
  rim.rotation.set(0, 0, Math.PI * 0.19);
  rim.scale.y = 0.42;
  group.add(rim);

  return group;
}

function createProtectionShield() {
  const material = new THREE.MeshBasicMaterial({
    color: '#ffbd5a',
    transparent: true,
    opacity: 0.24,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), material);
  shield.position.y = 0.9;
  shield.visible = false;
  shield.renderOrder = 3;
  return shield;
}

function createIcecreamIndicator() {
  const indicator = createIcecreamModel();
  indicator.position.set(0.38, 1.02, -0.42);
  indicator.rotation.set(-0.24, 0, 0.16);
  indicator.scale.setScalar(0.42);
  indicator.visible = false;
  indicator.renderOrder = 4;
  return indicator;
}

function createFlashMaterial() {
  return new THREE.MeshBasicMaterial({
    color: '#ffbd5a',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function buildOpponent() {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#f05a7d', roughness: 0.52, metalness: 0.06 });
  const vestMaterial = new THREE.MeshStandardMaterial({ color: '#253142', roughness: 0.74, metalness: 0.08 });
  const clothMaterial = new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.82, metalness: 0.02 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#f2b28a', roughness: 0.62, metalness: 0.02 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#171219', roughness: 0.7, metalness: 0.02 });
  const gunMaterial = new THREE.MeshStandardMaterial({ color: '#10141d', roughness: 0.58, metalness: 0.64 });

  opponentGroup = new THREE.Group();
  opponentGroup.visible = false;

  const rig = new THREE.Group();
  opponentGroup.add(rig);
  const shield = createProtectionShield();
  const icecream = createIcecreamIndicator();
  opponentGroup.add(shield, icecream);
  const nameplate = createNameplate({ name: 'BOT', team: 'blue', health: DUEL_PLAYER_HEALTH });
  opponentGroup.add(nameplate.sprite);

  opponentBody = makeCapsule(0.28, 0.6, [0, 1.04, 0], bodyMaterial, [0, 0, 0], 18);
  opponentBody.userData.hitbox = 'body';
  rig.add(opponentBody);
  duelHitMeshes.push(opponentBody);

  const vest = makeRoundedBox(0.62, 0.56, 0.24, [0, 1.04, -0.01], vestMaterial, [0.04, 0, 0], 0.06);
  rig.add(vest);

  const pelvis = makeRoundedBox(0.48, 0.24, 0.22, [0, 0.58, 0.02], clothMaterial, [0.02, 0, 0], 0.07);
  rig.add(pelvis);

  const neck = makeCapsule(0.075, 0.08, [0, 1.43, 0], headMaterial, [0, 0, 0], 12);
  rig.add(neck);

  opponentHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 16), headMaterial);
  opponentHead.position.y = 1.64;
  opponentHead.userData.hitbox = 'head';
  rig.add(opponentHead);
  duelHitMeshes.push(opponentHead);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.246, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMaterial);
  hair.position.set(0, 1.72, -0.01);
  rig.add(hair);

  const faceMark = makeRoundedBox(0.18, 0.026, 0.018, [0, 1.62, -0.226], hairMaterial, [0, 0, 0], 0.009);
  rig.add(faceMark);

  const shoulder = makeRoundedBox(0.78, 0.14, 0.18, [0, 1.27, -0.02], vestMaterial, [0.02, 0, 0], 0.04);
  rig.add(shoulder);

  const leftUpperArm = makeCapsule(0.07, 0.32, [-0.42, 1.13, -0.02], bodyMaterial, [0.14, 0, -0.24], 12);
  const rightUpperArm = makeCapsule(0.07, 0.32, [0.42, 1.13, -0.02], bodyMaterial, [0.14, 0, 0.24], 12);
  const leftForearm = makeCapsule(0.06, 0.34, [-0.28, 0.97, -0.35], bodyMaterial, [Math.PI / 2.7, 0, -0.72], 12);
  const rightForearm = makeCapsule(0.06, 0.34, [0.28, 0.97, -0.35], bodyMaterial, [Math.PI / 2.7, 0, 0.72], 12);
  rig.add(leftUpperArm, rightUpperArm, leftForearm, rightForearm);

  const leftThigh = makeCapsule(0.085, 0.4, [-0.18, 0.33, 0], clothMaterial, [0.04, 0, 0.04], 12);
  const rightThigh = makeCapsule(0.085, 0.4, [0.18, 0.33, 0], clothMaterial, [0.04, 0, -0.04], 12);
  const leftShin = makeCapsule(0.072, 0.42, [-0.18, 0.05, -0.02], clothMaterial, [0.02, 0, 0.02], 12);
  const rightShin = makeCapsule(0.072, 0.42, [0.18, 0.05, -0.02], clothMaterial, [0.02, 0, -0.02], 12);
  const leftFoot = makeRoundedBox(0.18, 0.075, 0.32, [-0.18, -0.19, -0.1], gunMaterial, [0, 0, 0.02], 0.035);
  const rightFoot = makeRoundedBox(0.18, 0.075, 0.32, [0.18, -0.19, -0.1], gunMaterial, [0, 0, -0.02], 0.035);
  rig.add(leftThigh, rightThigh, leftShin, rightShin, leftFoot, rightFoot);

  const rifle = new THREE.Group();
  rifle.add(makeRoundedBox(0.12, 0.09, 0.76, [0, 0, -0.3], gunMaterial, [0, 0, 0], 0.025));
  rifle.add(makeCylinder(0.024, 0.62, [0, 0.01, -0.98], gunMaterial, [Math.PI / 2, 0, 0], 16));
  rifle.add(makeRoundedBox(0.18, 0.12, 0.2, [0, -0.08, 0.1], gunMaterial, [0.14, 0, 0], 0.035));
  rifle.position.set(0.08, 1.02, -0.45);
  rifle.rotation.x = -0.04;
  rig.add(rifle);

  opponentParts = {
    rig,
    vest,
    pelvis,
    shoulder,
    neck,
    hair,
    faceMark,
    leftUpperArm,
    rightUpperArm,
    leftForearm,
    rightForearm,
    leftThigh,
    rightThigh,
    leftShin,
    rightShin,
    leftFoot,
    rightFoot,
    rifle,
    nameplate,
    shield,
    icecream
  };

  scene.add(opponentGroup);
}

function createLanOpponentAvatar(player) {
  const team = getPlayerTeam(player);
  const bodyColor = team === 'blue' ? '#32a6ff' : '#f05a7d';
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.52, metalness: 0.06 });
  const vestMaterial = new THREE.MeshStandardMaterial({ color: '#1f2a35', roughness: 0.74, metalness: 0.08 });
  const clothMaterial = new THREE.MeshStandardMaterial({ color: '#151d28', roughness: 0.82, metalness: 0.02 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#f2b28a', roughness: 0.62, metalness: 0.02 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#171219', roughness: 0.7, metalness: 0.02 });
  const gunMaterial = new THREE.MeshStandardMaterial({ color: '#10141d', roughness: 0.58, metalness: 0.64 });

  const group = new THREE.Group();
  group.visible = false;
  const rig = new THREE.Group();
  group.add(rig);
  const shield = createProtectionShield();
  const icecream = createIcecreamIndicator();
  group.add(shield, icecream);

  const body = makeCapsule(0.28, 0.6, [0, 1.04, 0], bodyMaterial, [0, 0, 0], 18);
  body.userData.hitbox = 'body';
  body.userData.playerId = player.id;
  body.userData.team = team;
  body.userData.playerName = player.name || '玩家';
  rig.add(body);

  const vest = makeRoundedBox(0.62, 0.56, 0.24, [0, 1.04, -0.01], vestMaterial, [0.04, 0, 0], 0.06);
  const pelvis = makeRoundedBox(0.48, 0.24, 0.22, [0, 0.58, 0.02], clothMaterial, [0.02, 0, 0], 0.07);
  const shoulder = makeRoundedBox(0.78, 0.14, 0.18, [0, 1.27, -0.02], vestMaterial, [0.02, 0, 0], 0.04);
  rig.add(vest, pelvis, shoulder);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 16), headMaterial);
  head.position.y = 1.64;
  head.userData.hitbox = 'head';
  head.userData.playerId = player.id;
  head.userData.team = team;
  head.userData.playerName = player.name || '玩家';
  rig.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.246, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMaterial);
  hair.position.set(0, 1.72, -0.01);
  rig.add(hair);

  const leftUpperArm = makeCapsule(0.07, 0.32, [-0.42, 1.13, -0.02], bodyMaterial, [0.14, 0, -0.24], 12);
  const rightUpperArm = makeCapsule(0.07, 0.32, [0.42, 1.13, -0.02], bodyMaterial, [0.14, 0, 0.24], 12);
  const leftForearm = makeCapsule(0.06, 0.34, [-0.28, 0.97, -0.35], bodyMaterial, [Math.PI / 2.7, 0, -0.72], 12);
  const rightForearm = makeCapsule(0.06, 0.34, [0.28, 0.97, -0.35], bodyMaterial, [Math.PI / 2.7, 0, 0.72], 12);
  rig.add(leftUpperArm, rightUpperArm, leftForearm, rightForearm);

  const leftThigh = makeCapsule(0.085, 0.4, [-0.18, 0.33, 0], clothMaterial, [0.04, 0, 0.04], 12);
  const rightThigh = makeCapsule(0.085, 0.4, [0.18, 0.33, 0], clothMaterial, [0.04, 0, -0.04], 12);
  const leftShin = makeCapsule(0.072, 0.42, [-0.18, 0.05, -0.02], clothMaterial, [0.02, 0, 0.02], 12);
  const rightShin = makeCapsule(0.072, 0.42, [0.18, 0.05, -0.02], clothMaterial, [0.02, 0, -0.02], 12);
  const leftFoot = makeRoundedBox(0.18, 0.075, 0.32, [-0.18, -0.19, -0.1], gunMaterial, [0, 0, 0.02], 0.035);
  const rightFoot = makeRoundedBox(0.18, 0.075, 0.32, [0.18, -0.19, -0.1], gunMaterial, [0, 0, -0.02], 0.035);
  rig.add(leftThigh, rightThigh, leftShin, rightShin, leftFoot, rightFoot);

  const rifle = new THREE.Group();
  rifle.add(makeRoundedBox(0.12, 0.09, 0.76, [0, 0, -0.3], gunMaterial, [0, 0, 0], 0.025));
  rifle.add(makeCylinder(0.024, 0.62, [0, 0.01, -0.98], gunMaterial, [Math.PI / 2, 0, 0], 16));
  rifle.position.set(0.08, 1.02, -0.45);
  rig.add(rifle);

  const nameplate = createNameplate({
    name: player.name || '玩家',
    team,
    health: player.health ?? DUEL_PLAYER_HEALTH
  });
  group.add(nameplate.sprite);

  const avatar = {
    id: player.id,
    team,
    name: player.name || '玩家',
    health: player.health ?? DUEL_PLAYER_HEALTH,
    group,
    body,
    head,
    nameplate,
    shield,
    icecream,
    targetPosition: new THREE.Vector3(),
    state: {
      crouch: false,
      airborne: false,
      moving: false,
      ads: false,
      speed: 0,
      spawnProtectedUntil: 0,
      icecreamUntil: 0,
      icecreamEatUntil: 0,
      crouchBlend: 0,
      walkTime: 0,
      lastAt: 0,
      lastX: 0,
      lastZ: 0
    },
    parts: {
      rig,
      body,
      head,
      hair,
      vest,
      pelvis,
      shoulder,
      leftUpperArm,
      rightUpperArm,
      leftForearm,
      rightForearm,
      leftThigh,
      rightThigh,
      leftShin,
      rightShin,
      leftFoot,
      rightFoot,
      rifle
    }
  };
  scene.add(group);
  lanOpponents.set(player.id, avatar);
  return avatar;
}

function createNameplate({ name = '玩家', team = 'red', health = DUEL_PLAYER_HEALTH } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = NAMEPLATE_CANVAS_WIDTH;
  canvas.height = NAMEPLATE_CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, 2.28, 0);
  sprite.scale.set(1.9, 0.48, 1);
  sprite.renderOrder = 4;

  const plate = {
    sprite,
    canvas,
    context,
    texture,
    name: '',
    team: '',
    health: -1
  };
  updateNameplate(plate, { name, team, health });
  return plate;
}

function updateNameplate(plate, { name = '玩家', team = 'red', health = DUEL_PLAYER_HEALTH } = {}) {
  if (!plate?.context) return;
  const safeName = String(name || '玩家').trim().slice(0, 16) || '玩家';
  const safeHealth = THREE.MathUtils.clamp(Number.isFinite(Number(health)) ? Number(health) : DUEL_PLAYER_HEALTH, 0, DUEL_PLAYER_HEALTH);
  if (plate.name === safeName && plate.team === team && Math.round(plate.health) === Math.round(safeHealth)) return;

  plate.name = safeName;
  plate.team = team;
  plate.health = safeHealth;

  const ctx = plate.context;
  const width = plate.canvas.width;
  const height = plate.canvas.height;
  const teamColor = team === 'blue' ? '#32a6ff' : '#ff4d7d';
  const ratio = safeHealth / DUEL_PLAYER_HEALTH;
  const healthColor = ratio > 0.55 ? '#2ee6a6' : ratio > 0.25 ? '#ffbd5a' : '#ff4d7d';

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
  fillCanvasRoundRect(ctx, 20, 14, width - 40, height - 28, 20);
  ctx.shadowBlur = 0;

  ctx.fillStyle = teamColor;
  fillCanvasRoundRect(ctx, 34, 29, 14, 14, 7);

  ctx.font = '700 32px Arial, sans-serif';
  ctx.fillStyle = '#f4f7fb';
  ctx.textBaseline = 'middle';
  ctx.fillText(safeName, 58, 37);

  ctx.font = '700 26px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText(String(Math.round(safeHealth)), width - 38, 37);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(244, 247, 251, 0.18)';
  fillCanvasRoundRect(ctx, 34, 72, width - 68, 20, 10);
  ctx.fillStyle = healthColor;
  fillCanvasRoundRect(ctx, 34, 72, Math.max(12, (width - 68) * ratio), 20, 10);
  ctx.strokeStyle = 'rgba(244, 247, 251, 0.28)';
  ctx.lineWidth = 2;
  strokeCanvasRoundRect(ctx, 34, 72, width - 68, 20, 10);
  ctx.restore();

  plate.texture.needsUpdate = true;
}

function updateNameplateVisibility() {
  const showDuelLabels = state === 'running' && isDuelMode();

  if (opponentParts.nameplate?.sprite) {
    opponentParts.nameplate.sprite.visible = showDuelLabels &&
      Boolean(opponentGroup?.visible) &&
      canSeeCombatantNameplate(opponentGroup, opponentPoseState.crouchBlend);
  }

  lanOpponents.forEach((avatar) => {
    if (!avatar.nameplate?.sprite) return;
    avatar.nameplate.sprite.visible = showDuelLabels &&
      Boolean(avatar.group?.visible) &&
      canSeeCombatantNameplate(avatar.group, avatar.state.crouchBlend);
  });
}

function canSeeCombatantNameplate(group, crouchBlend = 0) {
  if (!group?.visible || !camera) return false;
  camera.getWorldDirection(nameplateCameraForward);
  const crouchDrop = THREE.MathUtils.clamp(Number(crouchBlend) || 0, 0, 1) * 0.38;
  return canSeeCombatantPoint(group.position.x, group.position.y + 1.62 - crouchDrop * 0.88, group.position.z) ||
    canSeeCombatantPoint(group.position.x, group.position.y + 1.08 - crouchDrop, group.position.z);
}

function canSeeCombatantPoint(x, y, z) {
  nameplateTargetPoint.set(x, y, z);
  nameplateViewDirection.copy(nameplateTargetPoint).sub(camera.position);
  if (nameplateViewDirection.lengthSq() < 0.04) return true;
  nameplateViewDirection.normalize();
  if (nameplateCameraForward.dot(nameplateViewDirection) <= 0.02) return false;
  return !findActiveBlockerHit(camera.position, nameplateTargetPoint, 0.015);
}

function fillCanvasRoundRect(ctx, x, y, width, height, radius) {
  drawCanvasRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function strokeCanvasRoundRect(ctx, x, y, width, height, radius) {
  drawCanvasRoundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function drawCanvasRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function makeBox(width, height, depth, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return mesh;
}

function makeRoundedBox(width, height, depth, position, material, rotation = [0, 0, 0], radius = 0.025) {
  const safeRadius = Math.min(radius, width * 0.48, height * 0.48, depth * 0.48);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, safeRadius), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return mesh;
}

function makeCylinder(radius, length, position, material, rotation = [Math.PI / 2, 0, 0], radialSegments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.position.set(position[0], position[1], position[2]);
  return mesh;
}

function makeCapsule(radius, length, position, material, rotation = [0, 0, 0], radialSegments = 12) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, radialSegments), material);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.position.set(position[0], position[1], position[2]);
  return mesh;
}

function initUi() {
  dom.rangeModeButton.addEventListener('click', openRangePanel);
  dom.lanModeButton.addEventListener('click', openLanPanel);
  dom.botModeButton.addEventListener('click', openBotPanel);
  dom.startBackButton.addEventListener('click', showMainMenu);
  dom.lanBackButton.addEventListener('click', showMainMenu);
  dom.botBackButton.addEventListener('click', showMainMenu);
  dom.startButton.addEventListener('click', () => requestGameLock('range-start'));
  dom.resumeButton.addEventListener('click', resumeCurrentMode);
  dom.retryButton.addEventListener('click', () => requestGameLock('range-start'));
  dom.menuButton.addEventListener('click', showMainMenu);
  dom.quitButton.addEventListener('click', quitCurrentMode);
  dom.resetHistory.addEventListener('click', resetHistory);
  dom.createRoomButton.addEventListener('click', createLanRoom);
  dom.joinRoomButton.addEventListener('click', joinLanRoom);
  dom.refreshRoomListButton?.addEventListener('click', requestLanRoomList);
  dom.roomList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-join-room]');
    if (!button) return;
    joinLanRoomByCode(button.dataset.joinRoom);
  });
  dom.copyRoomInviteButton?.addEventListener('click', () => copyRoomInvite());
  dom.shareRoomInviteButton?.addEventListener('click', () => copyRoomInvite());
  dom.roomFriendList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-invite-friend]');
    if (!button) return;
    inviteFriendToRoom(button.dataset.inviteFriend);
  });
  dom.addBotButton.addEventListener('click', addLanBot);
  dom.readyButton.addEventListener('click', toggleLanReady);
  dom.lanEnterButton.addEventListener('click', () => requestGameLock('lan-enter'));
  dom.leaveRoomButton.addEventListener('click', leaveLanRoom);
  dom.startBotButton.addEventListener('click', () => requestGameLock('bot-start'));
  dom.duelRetryButton.addEventListener('click', retryDuel);
  dom.duelMenuButton.addEventListener('click', showMainMenu);
  dom.mobileControlsToggle.addEventListener('click', toggleMobileControls);
  dom.cheatPanel?.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cheat]');
    if (!input || !canUseCheats()) return;
    duelCheats[input.dataset.cheat] = Boolean(input.checked);
    syncCheatUi();
  });
  document.addEventListener('contextmenu', handleContextMenu);

  dom.roomCodeInput.addEventListener('input', () => {
    dom.roomCodeInput.value = dom.roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });

  document.querySelectorAll('[data-duration]').forEach((button) => {
    button.addEventListener('click', () => {
      storage.settings.duration = Number(button.dataset.duration);
      saveStorage();
      syncSettingsUi();
    });
  });

  dom.sensitivity.addEventListener('input', () => {
    storage.settings.sensitivity = Number(dom.sensitivity.value);
    saveStorage();
    syncSettingsUi();
  });

  [dom.crosshairSize, dom.crosshairGap, dom.crosshairThickness].forEach((input) => {
    input.addEventListener('input', () => {
      storage.settings.crosshair.size = Number(dom.crosshairSize.value);
      storage.settings.crosshair.gap = Number(dom.crosshairGap.value);
      storage.settings.crosshair.thickness = Number(dom.crosshairThickness.value);
      storage.settings.crosshair = sanitizeCrosshair(storage.settings.crosshair);
      saveStorage();
      syncSettingsUi();
    });
  });

  dom.crosshairDot.addEventListener('click', () => {
    storage.settings.crosshair.dot = !storage.settings.crosshair.dot;
    saveStorage();
    syncSettingsUi();
  });

  document.querySelectorAll('[data-crosshair-color]').forEach((button) => {
    button.addEventListener('click', () => {
      storage.settings.crosshair.color = button.dataset.crosshairColor;
      storage.settings.crosshair = sanitizeCrosshair(storage.settings.crosshair);
      saveStorage();
      syncSettingsUi();
    });
  });

  document.querySelectorAll('[data-bot-difficulty]').forEach((button) => {
    button.addEventListener('click', () => {
      botDifficulty = button.dataset.botDifficulty;
      syncBotDifficultyUi();
    });
  });

  document.querySelectorAll('[data-duel-map]').forEach((button) => {
    button.addEventListener('click', () => {
      if (appMode === 'lan' && lanRoom) {
        dom.lanStatus.textContent = '已在房间内，地图以当前房间为准。';
        return;
      }
      setDuelMap(button.dataset.duelMap);
    });
  });

  initLobbyUi();
  initMobileControls();
  syncSettingsUi();
  syncBotDifficultyUi();
  syncDuelMapUi();
  syncMobileControls();
  updateWeaponUi();
  exposeDebugState();
}

function initLobbyUi() {
  document.querySelectorAll('[data-lobby-view]').forEach((button) => {
    button.addEventListener('click', () => switchLobbyView(button.dataset.lobbyView));
  });

  dom.quickPlayButton?.addEventListener('click', () => {
    botDifficulty = 'normal';
    setDuelMap('park');
    openBotPanel();
    requestGameLock('bot-start');
  });

  document.querySelectorAll('[data-equip-weapon]').forEach((button) => {
    button.addEventListener('click', () => equipLobbyWeapon(button.dataset.equipWeapon));
  });

  dom.accountButton?.addEventListener('click', openAccountDialog);
  dom.profileAccountButton?.addEventListener('click', openAccountDialog);
  dom.copyFriendCodeButton?.addEventListener('click', async () => {
    const code = getFriendCode();
    const copied = await copyText(code);
    if (dom.friendsStatus) dom.friendsStatus.textContent = copied ? `好友码 ${code} 已复制。` : `好友码：${code}`;
  });
  dom.addFriendButton?.addEventListener('click', handleAddFriend);
  dom.friendCodeInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleAddFriend();
  });
  dom.friendsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-friend]');
    if (!button) return;
    handleRemoveFriend(button.dataset.removeFriend);
  });
  dom.accountDialog?.addEventListener('click', (event) => {
    if (event.target === dom.accountDialog) dom.accountDialog.close();
  });
  dom.refreshAdminAccounts?.addEventListener('click', () => refreshManagedAccounts());
  dom.adminAccountList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-save-account]');
    if (!button) return;
    saveManagedAccount(button.dataset.saveAccount, button.closest('.admin-account-row'));
  });

  dom.localProfileForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    updateAccountProfile(dom.profileNameInput.value)
      .then((snapshot) => {
        accountSnapshot = snapshot;
        syncLobbyData();
        dom.accountMessage.textContent = snapshot.signedIn ? '云端档案已保存。' : '本地档案已保存。';
      })
      .catch((error) => {
        dom.accountMessage.textContent = error?.message || '档案保存失败。';
      });
  });

  dom.cloudAccountForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleCloudAccountAction('signin');
  });

  dom.cloudAccountForm?.querySelector('[data-account-action="signup"]')?.addEventListener('click', (event) => {
    handleCloudAccountAction(event.currentTarget.dataset.accountAction);
  });

  switchLobbyView('home');
  syncLobbyData();
  restoreAccountSession().then((snapshot) => {
    accountSnapshot = snapshot;
    syncLobbyData();
  }).catch(() => {});
}

function switchLobbyView(viewName = 'home') {
  const validView = document.querySelector(`[data-lobby-panel="${viewName}"]`) ? viewName : 'home';
  document.querySelectorAll('[data-lobby-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.lobbyPanel === validView);
  });
  document.querySelectorAll('[data-lobby-view]').forEach((button) => {
    const active = button.dataset.lobbyView === validView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  syncLobbyData();
}

function equipLobbyWeapon(weaponId) {
  if (!LOBBY_WEAPON_STATS[weaponId]) return;
  storage.settings.primaryWeapon = weaponId;
  saveStorage();
  selectPrimaryWeapon(weaponId);
  syncLobbyData();
}

function openAccountDialog() {
  if (!dom.accountDialog) return;
  accountSnapshot = getAccountSnapshot();
  dom.profileNameInput.value = accountSnapshot.displayName;
  dom.accountMessage.textContent = '';
  syncLobbyData();
  if (typeof dom.accountDialog.showModal === 'function') dom.accountDialog.showModal();
  else dom.accountDialog.setAttribute('open', '');
}

async function handleCloudAccountAction(action) {
  if (!dom.accountMessage) return;
  dom.accountMessage.textContent = '正在连接账号服务...';
  try {
    if (action === 'signout') {
      accountSnapshot = await signOutAccount();
      dom.accountMessage.textContent = '已退出云端账号。';
    } else {
      const credentials = {
        email: dom.accountEmail.value,
        password: dom.accountPassword.value,
        displayName: dom.profileNameInput.value
      };
      if (credentials.password.length < 8) throw new Error('密码至少需要 8 个字符。');
      accountSnapshot = action === 'signup'
        ? await signUpWithPassword(credentials)
        : await signInWithPassword(credentials);
      dom.accountMessage.textContent = accountSnapshot.confirmationRequired
        ? '注册成功，请先在邮箱中完成确认。'
        : '云端账号已连接。';
    }
  } catch (error) {
    dom.accountMessage.textContent = error?.message || '账号操作失败。';
  }
  syncLobbyData();
}

function syncLobbyData() {
  accountSnapshot = getAccountSnapshot();
  const displayName = accountSnapshot.displayName;
  const initial = Array.from(displayName)[0]?.toUpperCase() || 'P';
  const best = storage.best;
  const latest = storage.recent?.[0];
  const weapon = LOBBY_WEAPON_STATS[selectedPrimaryWeapon] || LOBBY_WEAPON_STATS.ak;
  const totalHits = (storage.recent || []).reduce((sum, result) => sum + (result.hits || 0), 0);

  if (dom.accountName) dom.accountName.textContent = displayName;
  if (dom.accountState) dom.accountState.textContent = accountSnapshot.signedIn ? 'CLOUD ACCOUNT' : 'LOCAL PROFILE';
  if (dom.accountAvatar) dom.accountAvatar.textContent = initial;
  if (dom.playerCredits) dom.playerCredits.textContent = accountSnapshot.credits.toLocaleString('zh-CN');
  if (dom.profileName) dom.profileName.textContent = displayName;
  if (dom.profileAvatar) dom.profileAvatar.textContent = initial;
  if (dom.profileId) dom.profileId.textContent = accountSnapshot.id.toUpperCase();
  if (dom.profileAccountState) dom.profileAccountState.textContent = accountSnapshot.signedIn
    ? `云端账号 · ${roleLabel(accountSnapshot.role)}`
    : '本地档案';
  if (dom.profileCloudState) dom.profileCloudState.textContent = accountSnapshot.signedIn ? 'ONLINE' : 'LOCAL';
  if (dom.profileSessions) dom.profileSessions.textContent = String(storage.recent?.length || 0);
  if (dom.profileBest) dom.profileBest.textContent = best ? String(best.score) : '--';
  if (dom.homeBestScore) dom.homeBestScore.textContent = best ? String(best.score) : '--';
  if (dom.homeAccuracy) dom.homeAccuracy.textContent = latest ? `${Math.round(latest.accuracy * 100)}%` : '--';
  if (dom.homePrimary) dom.homePrimary.textContent = weapon.label;
  if (dom.homeWeaponName) dom.homeWeaponName.textContent = weapon.label;
  if (dom.homeWeaponArt) {
    dom.homeWeaponArt.dataset.weaponArt = selectedPrimaryWeapon;
    dom.homeWeaponArt.querySelector('span').textContent = weapon.short;
  }
  if (dom.homeWeaponType) dom.homeWeaponType.textContent = weapon.type;
  if (dom.homeWeaponCaliber) dom.homeWeaponCaliber.textContent = weapon.caliber;
  if (dom.homeWeaponMode) dom.homeWeaponMode.textContent = weapon.mode;
  if (dom.missionHits) dom.missionHits.textContent = `${Math.min(30, totalHits)} / 30`;
  if (dom.inventoryWeaponName) dom.inventoryWeaponName.textContent = weapon.label;
  if (dom.inventoryWeaponArt) {
    dom.inventoryWeaponArt.dataset.weaponArt = selectedPrimaryWeapon;
    dom.inventoryWeaponArt.querySelector('span').textContent = weapon.short;
  }
  syncWeaponPreviewVisibility();
  document.querySelectorAll('[data-equip-weapon]').forEach((button) => {
    const equipped = button.dataset.equipWeapon === selectedPrimaryWeapon;
    button.classList.toggle('active', equipped);
    const stateLabel = button.querySelector('em');
    if (stateLabel) stateLabel.textContent = equipped ? '已装备' : '已拥有';
  });
  if (dom.weaponPower) dom.weaponPower.value = weapon.power;
  if (dom.weaponRate) dom.weaponRate.value = weapon.rate;
  if (dom.weaponControl) dom.weaponControl.value = weapon.control;
  if (dom.playerName && !dom.playerName.matches(':focus')) dom.playerName.value = displayName;

  const cloudTitle = dom.accountCloudStatus?.querySelector('b');
  const cloudDetail = dom.accountCloudStatus?.querySelector('small');
  if (cloudTitle) cloudTitle.textContent = accountSnapshot.signedIn
    ? '云端档案已连接'
    : accountSnapshot.cloudConfigured ? '云端账号服务就绪' : isVercelDeployment ? '等待云端配置' : '本地开发模式';
  if (cloudDetail) cloudDetail.textContent = accountSnapshot.signedIn
    ? accountSnapshot.email
    : accountSnapshot.cloudConfigured
      ? '可以登录或注册新账号'
      : isVercelDeployment
        ? '配置 Supabase 环境变量后可登录和注册'
        : '配置云端环境后可登录和注册';

  const signInButton = dom.cloudAccountForm?.querySelector('[data-account-action="signin"]');
  const secondaryButton = dom.cloudAccountForm?.querySelector('[data-account-action="signup"], [data-account-action="signout"]');
  if (signInButton) {
    signInButton.disabled = !accountSnapshot.cloudConfigured || accountSnapshot.signedIn;
    signInButton.textContent = accountSnapshot.signedIn ? '已登录' : '登录';
  }
  if (secondaryButton) {
    secondaryButton.dataset.accountAction = accountSnapshot.signedIn ? 'signout' : 'signup';
    secondaryButton.disabled = !accountSnapshot.cloudConfigured;
    secondaryButton.textContent = accountSnapshot.signedIn ? '退出账号' : '注册';
  }
  const adminVisible = accountSnapshot.signedIn && canManageAccounts();
  if (dom.adminPanel) dom.adminPanel.hidden = !adminVisible;
  if (adminVisible && managedAccountsLoadedFor !== accountSnapshot.id && !managedAccountsLoading) {
    refreshManagedAccounts();
  }
  syncCheatUi();
  renderFriends();
  renderRoomInvites();
}

let managedAccountsLoadedFor = '';

async function refreshManagedAccounts() {
  if (!dom.adminAccountList || !canManageAccounts()) return;
  managedAccountsLoading = true;
  if (dom.adminStatus) dom.adminStatus.textContent = '正在读取账号列表...';
  try {
    managedAccounts = await listManagedAccounts();
    managedAccountsLoadedFor = accountSnapshot.id;
    renderManagedAccounts();
    if (dom.adminStatus) dom.adminStatus.textContent = `共 ${managedAccounts.length} 个账号。`;
  } catch (error) {
    if (dom.adminStatus) dom.adminStatus.textContent = error?.message || '账号列表读取失败。';
  } finally {
    managedAccountsLoading = false;
  }
}

function renderManagedAccounts() {
  if (!dom.adminAccountList) return;
  dom.adminAccountList.replaceChildren();
  if (!managedAccounts.length) {
    const empty = document.createElement('div');
    empty.className = 'friends-empty';
    empty.textContent = '还没有可管理的云端账号。';
    dom.adminAccountList.append(empty);
    return;
  }
  managedAccounts.forEach((account) => {
    const row = document.createElement('div');
    row.className = 'admin-account-row';
    const name = document.createElement('strong');
    name.textContent = account.displayName;
    const email = document.createElement('small');
    email.textContent = account.email || account.id;
    const role = document.createElement('select');
    role.setAttribute('aria-label', `${account.displayName} 角色`);
    role.innerHTML = '<option value="player">普通</option><option value="admin">管理员</option><option value="owner">懂帝特权</option>';
    role.value = account.role;
    role.dataset.accountRole = '';
    const status = document.createElement('select');
    status.setAttribute('aria-label', `${account.displayName} 状态`);
    status.innerHTML = '<option value="active">正常</option><option value="suspended">停用</option>';
    status.value = account.status;
    status.dataset.accountStatus = '';
    const credits = document.createElement('input');
    credits.type = 'number';
    credits.min = '0';
    credits.max = '999999';
    credits.step = '1';
    credits.value = String(account.credits);
    credits.setAttribute('aria-label', `${account.displayName} 训练币`);
    credits.dataset.accountCredits = '';
    const save = document.createElement('button');
    save.className = 'secondary-action';
    save.type = 'button';
    save.dataset.saveAccount = account.id;
    save.textContent = '保存';
    row.append(name, email, role, status, credits, save);
    dom.adminAccountList.append(row);
  });
}

async function saveManagedAccount(id, row) {
  if (!row || !canManageAccounts()) return;
  const button = row.querySelector('[data-save-account]');
  const role = row.querySelector('[data-account-role]')?.value;
  const status = row.querySelector('[data-account-status]')?.value;
  const credits = row.querySelector('[data-account-credits]')?.value;
  if (button) button.disabled = true;
  if (dom.adminStatus) dom.adminStatus.textContent = '正在保存账号设置...';
  try {
    const updated = await updateManagedAccount({ id, role, status, credits });
    managedAccounts = managedAccounts.map((account) => account.id === id ? updated : account);
    renderManagedAccounts();
    if (dom.adminStatus) dom.adminStatus.textContent = `${updated.displayName} 已更新。`;
    if (id === accountSnapshot.id) {
      accountSnapshot = await restoreAccountSession();
      syncLobbyData();
    }
  } catch (error) {
    if (dom.adminStatus) dom.adminStatus.textContent = error?.message || '账号设置保存失败。';
    if (button) button.disabled = false;
  }
}

function roleLabel(role) {
  return role === 'owner' ? '懂帝特权' : role === 'admin' ? '管理员' : '普通玩家';
}

function syncCheatUi() {
  const visible = isDuelMode() && canUseCheats() && appMode === 'bot';
  if (dom.cheatPanel) dom.cheatPanel.hidden = !visible;
  if (!visible) return;
  dom.cheatPanel.querySelectorAll('[data-cheat]').forEach((input) => {
    input.checked = Boolean(duelCheats[input.dataset.cheat]);
  });
  if (dom.cheatStatus) dom.cheatStatus.textContent = '仅人机对战 · 本机生效';
}

function isCheatEnabled(name) {
  return appMode === 'bot' && duel.active && canUseCheats() && Boolean(duelCheats[name]);
}

function renderFriends() {
  if (!dom.friendCode || !dom.friendsList) return;
  dom.friendCode.textContent = accountSnapshot.friendCode || getFriendCode();
  const friends = getFriends();
  dom.friendsList.replaceChildren();
  if (!friends.length) {
    const empty = document.createElement('div');
    empty.className = 'friends-empty';
    empty.textContent = '暂无好友。把好友码发给队友，或在上方输入好友码添加。';
    dom.friendsList.append(empty);
    return;
  }
  friends.forEach((friend) => {
    const row = document.createElement('div');
    row.className = 'friend-row';
    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const name = document.createElement('strong');
    name.textContent = friend.displayName;
    const code = document.createElement('code');
    code.textContent = friend.code;
    identity.append(name, code);
    const remove = document.createElement('button');
    remove.className = 'icon-action';
    remove.type = 'button';
    remove.dataset.removeFriend = friend.id;
    remove.setAttribute('aria-label', `删除好友 ${friend.displayName}`);
    remove.title = '删除好友';
    remove.innerHTML = '<i data-lucide="x"></i>';
    row.append(identity, remove);
    dom.friendsList.append(row);
  });
  createIcons({ icons: { X }, attrs: { 'aria-hidden': 'true' } });
}

async function handleAddFriend() {
  const code = dom.friendCodeInput?.value?.trim();
  const name = dom.friendNameInput?.value?.trim();
  if (!code) {
    if (dom.friendsStatus) dom.friendsStatus.textContent = '先输入好友码。';
    return;
  }
  if (dom.addFriendButton) dom.addFriendButton.disabled = true;
  try {
    accountSnapshot = await addFriend(code, name);
    if (dom.friendCodeInput) dom.friendCodeInput.value = '';
    if (dom.friendNameInput) dom.friendNameInput.value = '';
    if (dom.friendsStatus) dom.friendsStatus.textContent = '好友已添加，可以在房间内发送邀请。';
    syncLobbyData();
  } catch (error) {
    if (dom.friendsStatus) dom.friendsStatus.textContent = error?.message || '添加好友失败。';
  } finally {
    if (dom.addFriendButton) dom.addFriendButton.disabled = false;
  }
}

async function handleRemoveFriend(friendId) {
  try {
    accountSnapshot = await removeFriend(friendId);
    if (dom.friendsStatus) dom.friendsStatus.textContent = '好友已删除。';
    syncLobbyData();
  } catch (error) {
    if (dom.friendsStatus) dom.friendsStatus.textContent = error?.message || '删除好友失败。';
  }
}

function buildRoomInviteUrl(friendCode = '') {
  if (!lanRoom?.code) return '';
  const url = new URL(window.location.href);
  url.searchParams.set('room', lanRoom.code);
  if (friendCode) url.searchParams.set('from', accountSnapshot.friendCode || getFriendCode());
  return url.toString();
}

function renderRoomInvites() {
  if (!dom.roomInviteLink || !dom.roomFriendList) return;
  const inRoom = Boolean(lanRoom?.code);
  const link = buildRoomInviteUrl();
  dom.roomInviteLink.value = link || '加入房间后生成邀请链接';
  if (dom.copyRoomInviteButton) dom.copyRoomInviteButton.disabled = !inRoom;
  if (dom.shareRoomInviteButton) dom.shareRoomInviteButton.disabled = !inRoom;
  dom.roomFriendList.replaceChildren();
  if (!inRoom) {
    const empty = document.createElement('span');
    empty.className = 'room-friends-empty';
    empty.textContent = '加入房间后可邀请好友。';
    dom.roomFriendList.append(empty);
    return;
  }
  const friends = getFriends();
  if (!friends.length) {
    const empty = document.createElement('span');
    empty.className = 'room-friends-empty';
    empty.textContent = '还没有好友，去个人中心添加。';
    dom.roomFriendList.append(empty);
    return;
  }
  friends.forEach((friend) => {
    const row = document.createElement('div');
    row.className = 'room-friend-row';
    const identity = document.createElement('span');
    identity.textContent = friend.displayName;
    const button = document.createElement('button');
    button.className = 'secondary-action';
    button.type = 'button';
    button.dataset.inviteFriend = friend.id;
    button.innerHTML = '<i data-lucide="send"></i> 邀请';
    row.append(identity, button);
    dom.roomFriendList.append(row);
  });
  createIcons({ icons: { Send }, attrs: { 'aria-hidden': 'true' } });
}

async function copyRoomInvite(friendCode = '') {
  const link = buildRoomInviteUrl(friendCode);
  if (!link) {
    if (dom.roomInviteStatus) dom.roomInviteStatus.textContent = '先加入一个房间。';
    return false;
  }
  const copied = await copyText(link);
  if (dom.roomInviteStatus) dom.roomInviteStatus.textContent = copied ? '房间邀请链接已复制，发给好友即可加入。' : link;
  return copied;
}

async function inviteFriendToRoom(friendId) {
  const friend = getFriends().find((entry) => entry.id === friendId || entry.code === friendId);
  const copied = await copyRoomInvite(friend?.code || '');
  if (dom.roomInviteStatus && copied) dom.roomInviteStatus.textContent = `已为 ${friend?.displayName || '好友'} 复制邀请链接。`;
}

async function copyText(value) {
  const text = String(value || '');
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy clipboard path.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { copied = false; }
  area.remove();
  return copied;
}

function showMainMenu() {
  stopRoomListPolling();
  cleanupDuel(true);
  setArenaMode('range');
  appMode = 'menu';
  state = 'idle';
  clearInputState();
  setOverlay('mode');
  switchLobbyView('home');
  dom.hud.hidden = true;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  clearKillFeed();
  dom.targetClock.hidden = true;
  dom.statusLine.textContent = '浏览器会在训练开始时请求鼠标锁定。触屏按键打开后可直接进局，且不显示蹲伏键。';
  dom.lanStatus.textContent = lanConnected ? '已连接本地局域网对战服务。' : '局域网服务会跟随 Vite 本地服务器启动。';
  if (opponentGroup) opponentGroup.visible = false;
  spawnPreviewTarget();
  resetView();
  syncCheatUi();
}

function openRangePanel() {
  stopRoomListPolling();
  cleanupDuel(true);
  setArenaMode('range');
  appMode = 'range';
  state = 'idle';
  clearInputState();
  setOverlay('start');
  dom.hud.hidden = true;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  clearKillFeed();
  dom.targetClock.hidden = true;
  if (opponentGroup) opponentGroup.visible = false;
  spawnPreviewTarget();
  renderMenuStats();
  syncCheatUi();
}

function openLanPanel() {
  cleanupDuel(false);
  setArenaMode('duel');
  appMode = 'lan';
  state = 'lobby';
  clearInputState();
  setOverlay('lan');
  dom.hud.hidden = true;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  clearKillFeed();
  dom.targetClock.hidden = true;
  if (opponentGroup) opponentGroup.visible = false;
  targetGroup.visible = false;
  if (isVercelDeployment && !configuredDuelWsUrl) {
    showRealtimeConfigNotice();
  } else {
    connectLan();
    startRoomListPolling();
  }
  syncLanUi();
  syncCheatUi();
  const invitedRoom = getInvitedRoomCode();
  if (invitedRoom) {
    dom.roomCodeInput.value = invitedRoom;
    dom.lanStatus.textContent = `已读取房间邀请 ${dom.roomCodeInput.value}，点击“加入”进入。`;
  }
}

function getInvitedRoomCode() {
  return String(new URLSearchParams(window.location.search).get('room') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function openBotPanel() {
  stopRoomListPolling();
  cleanupDuel(true);
  setArenaMode('duel');
  appMode = 'bot';
  state = 'lobby';
  clearInputState();
  setOverlay('bot');
  dom.hud.hidden = true;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  clearKillFeed();
  dom.targetClock.hidden = true;
  if (opponentGroup) opponentGroup.visible = false;
  targetGroup.visible = false;
  syncBotDifficultyUi();
  syncCheatUi();
}

function resumeCurrentMode() {
  if (appMode === 'range') {
    requestGameLock('range-resume');
    return;
  }
  if (appMode === 'bot' || appMode === 'lan') requestGameLock('duel-resume');
}

function quitCurrentMode() {
  if (appMode === 'range') {
    finishRun();
    return;
  }
  finishDuel(false, '已退出', '本轮对枪已结束。');
}

function syncBotDifficultyUi() {
  const setting = BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal;
  dom.botDifficultyLabel.textContent = setting.label;
  document.querySelectorAll('[data-bot-difficulty]').forEach((button) => {
    const selected = button.dataset.botDifficulty === botDifficulty;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function initMobileControls() {
  if (!dom.mobileControls) return;
  dom.touchJoystick?.addEventListener('pointerdown', handleJoystickPointerDown, { passive: false });
  window.addEventListener('pointermove', handleJoystickPointerMove, { passive: false });
  window.addEventListener('pointerup', handleJoystickPointerUp, { passive: false });
  window.addEventListener('pointercancel', handleJoystickPointerUp, { passive: false });

  dom.mobileControls.querySelectorAll('[data-mobile-action]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      if (!mobileControlsEnabled() || state !== 'running') return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      handleMobileAction(button.dataset.mobileAction, true);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      button.addEventListener(type, (event) => {
        event.preventDefault();
        handleMobileAction(button.dataset.mobileAction, false);
      });
    });
  });
}

function handleJoystickPointerDown(event) {
  if (!mobileControlsEnabled() || state !== 'running') return;
  event.preventDefault();
  joystickPointerId = event.pointerId;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  updateJoystickVector(event);
}

function handleJoystickPointerMove(event) {
  if (event.pointerId !== joystickPointerId) return;
  event.preventDefault();
  updateJoystickVector(event);
}

function handleJoystickPointerUp(event) {
  if (event.pointerId !== joystickPointerId) return;
  resetJoystick();
}

function updateJoystickVector(event) {
  const rect = dom.touchJoystick?.getBoundingClientRect();
  if (!rect) return;
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const radius = rect.width * 0.36;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const length = Math.hypot(rawX, rawY);
  const scale = length > radius ? radius / length : 1;
  const knobX = rawX * scale;
  const knobY = rawY * scale;
  const deadZone = 0.11;
  const normalizedX = knobX / radius;
  const normalizedY = -knobY / radius;
  const strength = Math.hypot(normalizedX, normalizedY);
  if (strength < deadZone) {
    mobileMoveVector.set(0, 0);
  } else {
    const adjusted = (strength - deadZone) / (1 - deadZone);
    mobileMoveVector.set(normalizedX / strength * adjusted, normalizedY / strength * adjusted);
  }
  if (dom.touchJoystickKnob) {
    dom.touchJoystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }
}

function resetJoystick() {
  joystickPointerId = null;
  mobileMoveVector.set(0, 0);
  if (dom.touchJoystickKnob) dom.touchJoystickKnob.style.transform = 'translate(-50%, -50%)';
}

function handleMobileAction(action, down) {
  if (action === 'fire') {
    triggerHeld = down;
    if (down) fireWeapon(performance.now());
    return;
  }
  if (!down) return;
  if (action === 'ads') {
    toggleAimDownSights();
    return;
  }
  if (action === 'jump') {
    queueJump();
    return;
  }
  handleWeaponAction(action);
}

function toggleMobileControls() {
  storage.settings.mobileControls = !storage.settings.mobileControls;
  saveStorage();
  syncSettingsUi();
  syncMobileControls();
  if (!mobileControlsEnabled() && state === 'running' && !isPointerLockActive()) pauseRun();
}

function mobileControlsEnabled() {
  return Boolean(storage.settings.mobileControls);
}

function isPointerLockActive() {
  return document.pointerLockElement === dom.canvas;
}

function hasGameInput() {
  return isPointerLockActive() || mobileControlsEnabled();
}

function syncMobileControls() {
  const enabled = mobileControlsEnabled();
  document.body.classList.toggle('has-mobile-controls', enabled);
  dom.mobileControlsToggle.textContent = enabled ? '触屏按键 开' : '触屏按键 关';
  dom.mobileControlsToggle.setAttribute('aria-pressed', String(enabled));
  if (dom.mobileControls) dom.mobileControls.hidden = !enabled || state !== 'running';
  if (!enabled || state !== 'running') mobileLookPointerId = null;
}

function requestGameLock(intent) {
  ensureAudio();
  lockIntent = intent;
  dom.canvas.focus();

  if (mobileControlsEnabled()) {
    dom.statusLine.textContent = '触屏按键已开启。';
    runLockIntent();
    return;
  }

  if (!dom.canvas.requestPointerLock) {
    dom.statusLine.textContent = '当前浏览器不支持鼠标锁定，建议使用新版 Chrome 或 Edge。';
    lockIntent = null;
    return;
  }

  dom.statusLine.textContent = '正在请求鼠标锁定...';

  try {
    dom.canvas.requestPointerLock();
  } catch {
    handlePointerLockError();
  }
}

function handlePointerLockChange() {
  const locked = document.pointerLockElement === dom.canvas;
  document.body.classList.toggle('is-locked', locked);
  if (locked) dom.canvas.focus();

  if (locked && lockIntent) runLockIntent();

  if (!locked) {
    clearInputState();
    if (state === 'running' && !mobileControlsEnabled()) pauseRun();
    syncMobileControls();
  }
}

function handlePointerLockError() {
  lockIntent = null;
  dom.statusLine.textContent = '鼠标锁定失败。请点击画面后再试一次，或检查浏览器权限。';
}

function runLockIntent() {
  const intent = lockIntent;
  lockIntent = null;
  if (intent === 'range-start') {
    beginRun();
    return;
  }
  if (intent === 'range-resume') {
    resumeRangeRun();
    return;
  }
  if (intent === 'bot-start') {
    beginBotDuel();
    return;
  }
  if (intent === 'lan-enter') {
    enterLanDuel();
    return;
  }
  if (intent === 'duel-resume') resumeDuelRun();
}

function beginRun() {
  setArenaMode('range');
  appMode = 'range';
  Object.assign(session, {
    duration: storage.settings.duration,
    endsAt: performance.now() + storage.settings.duration * 1000,
    score: 0,
    hits: 0,
    shots: 0,
    misses: 0,
    expired: 0,
    streak: 0,
    bestStreak: 0,
    totalReaction: 0
  });
  clearInputState();
  nextShotAt = 0;
  sprayIndex = 0;
  spreadKick = 0;
  weaponKick = 0;
  muzzleFlashUntil = 0;
  adsBlend = 0;
  walkPhase = 0;

  resetView();
  equippedSlot = 'primary';
  syncWeaponModel();
  if (opponentGroup) opponentGroup.visible = false;
  targetGroup.visible = true;
  state = 'running';
  setOverlay(null);
  dom.hud.hidden = false;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  dom.targetClock.hidden = false;
  spawnTarget();
  updateStats();
}

function pauseRun() {
  if (state !== 'running') return;
  clearInputState();
  pausedAt = performance.now();
  pausedRemainingMs = Math.max(0, session.endsAt - pausedAt);
  state = 'paused';
  setOverlay('pause');
  dom.hud.hidden = appMode !== 'range';
  dom.duelHud.hidden = !isDuelMode();
  dom.duelFeed.hidden = !isDuelMode();
  dom.targetClock.hidden = true;
  syncCheatUi();
}

function resumeRangeRun() {
  clearInputState();
  state = 'running';
  session.endsAt = performance.now() + pausedRemainingMs;
  pausedAt = 0;
  targetSpawnedAt = performance.now();
  setOverlay(null);
  dom.hud.hidden = false;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  dom.targetClock.hidden = false;
}

function finishRun() {
  if (state === 'ended') return;
  state = 'ended';
  clearInputState();
  if (document.pointerLockElement === dom.canvas) document.exitPointerLock();
  dom.hud.hidden = true;
  dom.targetClock.hidden = true;

  const result = makeResult();
  saveResult(result);
  renderResult(result);
  renderMenuStats();
  setOverlay('result');
}

function showMenu() {
  setArenaMode('range');
  state = 'idle';
  clearInputState();
  setOverlay('start');
  dom.hud.hidden = true;
  dom.targetClock.hidden = true;
  dom.statusLine.textContent = '浏览器会在训练开始时请求鼠标锁定。触屏按键打开后可直接进局，且不显示蹲伏键。';
  spawnPreviewTarget();
}

function handlePointerLook(event) {
  if (state !== 'running' || !isPointerLockActive()) return;
  syncModifierKeys(event);
  let movementX = Number(event.movementX) || 0;
  let movementY = Number(event.movementY) || 0;
  if (!movementX && !movementY) return;
  if (Math.max(Math.abs(movementX), Math.abs(movementY)) > LOOK_SPIKE_LIMIT) return;

  movementX = THREE.MathUtils.clamp(movementX, -MAX_LOOK_DELTA, MAX_LOOK_DELTA);
  movementY = THREE.MathUtils.clamp(movementY, -MAX_LOOK_DELTA, MAX_LOOK_DELTA);
  applyLookDelta(movementX, movementY);
}

function handleCanvasPointerDown(event) {
  if (!mobileControlsEnabled() || state !== 'running' || isPointerLockActive()) return;
  if (event.target !== dom.canvas) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  mobileLookPointerId = event.pointerId;
  mobileLookX = event.clientX;
  mobileLookY = event.clientY;
  dom.canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleCanvasPointerMove(event) {
  if (!mobileControlsEnabled() || state !== 'running' || event.pointerId !== mobileLookPointerId) return;
  const movementX = THREE.MathUtils.clamp(event.clientX - mobileLookX, -MAX_LOOK_DELTA, MAX_LOOK_DELTA);
  const movementY = THREE.MathUtils.clamp(event.clientY - mobileLookY, -MAX_LOOK_DELTA, MAX_LOOK_DELTA);
  mobileLookX = event.clientX;
  mobileLookY = event.clientY;
  applyLookDelta(movementX, movementY, 1.18);
  event.preventDefault();
}

function handleCanvasPointerUp(event) {
  if (event.pointerId === mobileLookPointerId) mobileLookPointerId = null;
}

function applyLookDelta(movementX, movementY, scale = 1) {
  const weapon = getPrimaryWeapon();
  const adsSensitivity = equippedSlot === 'primary' ? THREE.MathUtils.lerp(1, weapon.adsSensitivityScale, adsBlend) : 1;
  const sensitivity = storage.settings.sensitivity * 0.00046 * adsSensitivity * scale;
  yaw -= movementX * sensitivity;
  pitch -= movementY * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch, -1.06, 1.06);
  applyView();
}

function handleMouseDown(event) {
  if (state !== 'running' || !hasGameInput()) return;
  if (mobileControlsEnabled() && !isPointerLockActive()) return;
  if (!isPointerLockActive() && event.target !== dom.canvas) return;
  syncModifierKeys(event);
  event.preventDefault();
  if (event.button === 2) {
    toggleAimDownSights();
    return;
  }
  if (event.button === 0) {
    triggerHeld = true;
    fireWeapon(performance.now());
  }
}

function handleMouseUp(event) {
  syncModifierKeys(event);
  if (event.button === 0) triggerHeld = false;
}

function handleContextMenu(event) {
  if (event.target === dom.canvas || isPointerLockActive()) event.preventDefault();
}

function handleWeaponWheel(event) {
  if (state !== 'running' || !isPointerLockActive() || (isDuelMode() && duel.health <= 0)) return;
  syncModifierKeys(event);
  if (Math.abs(event.deltaY) < 1 && Math.abs(event.deltaX) < 1) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastWheelSwitchAt < 220) return;
  lastWheelSwitchAt = now;
  if (equippedSlot === 'knife') {
    equipPrimaryWeapon();
  } else {
    cyclePrimaryWeapon();
  }
}

function handleKeyDown(event) {
  if (!claimKeyboardEvent(event)) return;
  syncModifierKeys(event);
  const action = normalizeActionKey(event);
  const inputActive = isPointerLockActive();
  if (action && state === 'running' && inputActive && event.repeat) {
    event.preventDefault();
    return;
  }
  if (action && inputActive && handleWeaponAction(action)) {
    event.preventDefault();
    return;
  }

  const code = normalizeMoveKey(event);
  if (!code) return;
  if (state !== 'running' || !inputActive) return;
  event.preventDefault();
  setMoveKey(code, true, event.repeat);
}

function handleKeyUp(event) {
  if (!claimKeyboardEvent(event)) return;
  syncModifierKeys(event);
  const action = normalizeActionKey(event);
  if (action && state === 'running' && isPointerLockActive() && performance.now() - lastWeaponActionAt > 120) {
    if (handleWeaponAction(action)) {
      event.preventDefault();
      return;
    }
  }

  const code = normalizeMoveKey(event);
  if (!code) return;
  setMoveKey(code, false);
  if (state === 'running') event.preventDefault();
}

function claimKeyboardEvent(event) {
  if (!event || typeof event !== 'object') return true;
  if (handledKeyboardEvents.has(event)) return false;
  handledKeyboardEvents.add(event);
  return true;
}

function normalizeMoveKey(event) {
  const keyCode = Number(event.keyCode || event.which || 0);
  if (event.code === 'KeyW' || event.code === 'ArrowUp') return 'KeyW';
  if (event.code === 'KeyA' || event.code === 'ArrowLeft') return 'KeyA';
  if (event.code === 'KeyS' || event.code === 'ArrowDown') return 'KeyS';
  if (event.code === 'KeyD' || event.code === 'ArrowRight') return 'KeyD';
  if (event.code === 'Space') return 'Space';
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') return 'Shift';
  if (keyCode === 87 || keyCode === 38) return 'KeyW';
  if (keyCode === 65 || keyCode === 37) return 'KeyA';
  if (keyCode === 83 || keyCode === 40) return 'KeyS';
  if (keyCode === 68 || keyCode === 39) return 'KeyD';
  if (keyCode === 32) return 'Space';
  if (keyCode === 16) return 'Shift';

  const key = String(event.key || '').toLowerCase();
  if (key === 'w') return 'KeyW';
  if (key === 'a') return 'KeyA';
  if (key === 's') return 'KeyS';
  if (key === 'd') return 'KeyD';
  if (key === ' ') return 'Space';
  if (key === 'shift') return 'Shift';
  return '';
}

function normalizeActionKey(event) {
  const keyCode = Number(event.keyCode || event.which || 0);
  if (event.code === 'KeyB' || String(event.key || '').toLowerCase() === 'b') return 'cycle-primary';
  if (event.code === 'KeyQ' || String(event.key || '').toLowerCase() === 'q') return 'knife';
  if (event.code === 'KeyE' || String(event.key || '').toLowerCase() === 'e') return 'primary';
  if (event.code === 'KeyF' || String(event.key || '').toLowerCase() === 'f') return 'icecream';
  if (event.code === 'Digit1' || event.key === '1') return 'weapon-ak';
  if (event.code === 'Digit2' || event.key === '2') return 'weapon-sniper';
  if (event.code === 'Digit3' || event.key === '3') return 'weapon-shotgun';
  if (keyCode === 66) return 'cycle-primary';
  if (keyCode === 81) return 'knife';
  if (keyCode === 69) return 'primary';
  if (keyCode === 70) return 'icecream';
  if (keyCode === 49) return 'weapon-ak';
  if (keyCode === 50) return 'weapon-sniper';
  if (keyCode === 51) return 'weapon-shotgun';
  return '';
}

function handleWeaponAction(action) {
  if (state !== 'running' || !hasGameInput() || (isDuelMode() && duel.health <= 0)) return false;
  lastWeaponActionAt = performance.now();

  if (action === 'icecream') {
    return useIcecream(lastWeaponActionAt);
  }
  if (action === 'cycle-primary') {
    cyclePrimaryWeapon();
    return true;
  }
  if (action === 'weapon-ak') {
    selectPrimaryWeapon('ak');
    return true;
  }
  if (action === 'weapon-sniper') {
    selectPrimaryWeapon('sniper');
    return true;
  }
  if (action === 'weapon-shotgun') {
    selectPrimaryWeapon('shotgun');
    return true;
  }
  if (action === 'knife') {
    equipKnife();
    return true;
  }
  if (action === 'primary') {
    equipPrimaryWeapon();
    return true;
  }
  return false;
}

function clearInputState() {
  triggerHeld = false;
  aimingDownSights = false;
  moveKeys.clear();
  moveKeyPressedAt.clear();
  resetJoystick();
  crouchHeld = false;
  jumpQueued = false;
  jumpQueuedUntil = 0;
  playerCrouching = false;
}

function setMoveKey(code, down, repeated = false) {
  if (code === 'Space') {
    if (down && !repeated) queueJump();
    return;
  }

  if (code === 'Shift') {
    crouchHeld = down;
    return;
  }

  if (down) {
    moveKeys.add(code);
    moveKeyPressedAt.set(code, performance.now());
  } else {
    moveKeys.delete(code);
    moveKeyPressedAt.delete(code);
  }
}

function syncModifierKeys(event) {
  if (!event) return;
  const shiftDown = typeof event.getModifierState === 'function'
    ? event.getModifierState('Shift') || event.shiftKey === true
    : Boolean(event.shiftKey);
  if (!shiftDown) crouchHeld = false;
}

function queueJump() {
  jumpQueued = true;
  jumpQueuedUntil = performance.now() + 140;
}

function consumeJumpQueue() {
  jumpQueued = false;
  jumpQueuedUntil = 0;
}

function resolveMoveAxis(positiveKey, negativeKey) {
  const positiveDown = moveKeys.has(positiveKey);
  const negativeDown = moveKeys.has(negativeKey);
  if (positiveDown && negativeDown) {
    return (moveKeyPressedAt.get(positiveKey) || 0) >= (moveKeyPressedAt.get(negativeKey) || 0) ? 1 : -1;
  }
  return Number(positiveDown) - Number(negativeDown);
}

function getPrimaryWeapon() {
  return WEAPONS[selectedPrimaryWeapon] || WEAPONS.ak;
}

function getCurrentWeapon() {
  if (equippedSlot === 'knife') {
    return { id: 'knife', label: '爪刀', slotLabel: '近战', automatic: false, fireInterval: KNIFE_ATTACK_INTERVAL };
  }
  return getPrimaryWeapon();
}

function isSniperScoped() {
  return state === 'running' &&
    equippedSlot === 'primary' &&
    selectedPrimaryWeapon === 'sniper' &&
    aimingDownSights &&
    hasGameInput();
}

function selectPrimaryWeapon(id) {
  if (!WEAPONS[id]) return;
  const fromKnife = equippedSlot === 'knife';
  const changed = equippedSlot !== 'primary' || selectedPrimaryWeapon !== id;
  selectedPrimaryWeapon = id;
  storage.settings.primaryWeapon = id;
  saveStorage();
  equippedSlot = 'primary';
  aimingDownSights = false;
  triggerHeld = false;
  sprayIndex = 0;
  spreadKick = 0;
  shotgunSpinUntil = 0;
  syncWeaponModel();
  if (changed) playWeaponSwitchAnimation(fromKnife ? 115 : WEAPON_SWITCH_DURATION, fromKnife ? 0.34 : 1);
  updateWeaponUi();
}

function cyclePrimaryWeapon() {
  const currentIndex = PRIMARY_WEAPON_ORDER.indexOf(selectedPrimaryWeapon);
  selectPrimaryWeapon(PRIMARY_WEAPON_ORDER[(currentIndex + 1) % PRIMARY_WEAPON_ORDER.length] || 'ak');
}

function equipKnife() {
  const changed = equippedSlot !== 'knife';
  equippedSlot = 'knife';
  aimingDownSights = false;
  triggerHeld = false;
  sprayIndex = 0;
  spreadKick = 0;
  shotgunSpinUntil = 0;
  knifeSpinStartedAt = performance.now();
  knifeSpinUntil = knifeSpinStartedAt + KNIFE_SPIN_DURATION;
  syncWeaponModel();
  if (changed) playWeaponSwitchAnimation(250, 0.56);
  updateWeaponUi();
}

function equipPrimaryWeapon() {
  const fromKnife = equippedSlot === 'knife';
  const changed = equippedSlot !== 'primary';
  equippedSlot = 'primary';
  aimingDownSights = false;
  triggerHeld = false;
  shotgunSpinUntil = 0;
  syncWeaponModel();
  if (changed) playWeaponSwitchAnimation(fromKnife ? 115 : WEAPON_SWITCH_DURATION, fromKnife ? 0.34 : 1);
  updateWeaponUi();
}

function syncWeaponModel() {
  updateWeaponModelVisibility();
  Object.values(weaponModels).forEach((model) => {
    if (model.muzzleFlash) model.muzzleFlash.visible = false;
    if (model.muzzleLight) model.muzzleLight.intensity = 0;
  });

  const model = weaponModels[selectedPrimaryWeapon] || weaponModels.ak;
  muzzleTip = model?.muzzleTip || null;
  muzzleFlash = model?.muzzleFlash || null;
  muzzleLight = model?.muzzleLight || null;
  resetShotgunPump();
  updateAimDownSights(0, true);
  updateWeaponUi();
}

function updateWeaponModelVisibility() {
  const hideScopedSniper = isSniperScoped();
  Object.entries(weaponModels).forEach(([id, model]) => {
    model.group.visible = equippedSlot === 'primary' && id === selectedPrimaryWeapon && !(id === 'sniper' && hideScopedSniper);
  });
  if (knifeGroup) knifeGroup.visible = equippedSlot === 'knife';
}

function playWeaponSwitchAnimation(duration = WEAPON_SWITCH_DURATION, scale = 1) {
  weaponSwitchStartedAt = performance.now();
  weaponSwitchUntil = weaponSwitchStartedAt + duration;
  weaponSwitchScale = scale;
  playWeaponSwitchSound();
}

function toggleAimDownSights() {
  if (equippedSlot !== 'primary') return;
  aimingDownSights = !aimingDownSights;
  playAdsSound(aimingDownSights);
  updateAimDownSights(0);
  updateWeaponModelVisibility();
  updateWeaponUi();
}

function updateWeaponUi(now = performance.now()) {
  const weapon = getCurrentWeapon();
  const running = state === 'running';
  const sniperScoped = isSniperScoped();
  dom.weaponIndicator.hidden = !running || sniperScoped;
  dom.scopeOverlay.hidden = !sniperScoped;
  dom.weaponSlotLabel.textContent = weapon.slotLabel;
  dom.weaponNameLabel.textContent = weapon.label;
  updateIcecreamUi(now);
  syncMobileControls();
}

function useIcecream(now = performance.now()) {
  if (!isDuelMode() || !duel.active || state !== 'running' || duel.health <= 0) return false;
  if (duel.icecreamPending) {
    pushDuelFeed('正在吃巧乐兹。');
    return true;
  }
  if (now < duel.icecreamCooldownUntil) {
    const remaining = Math.ceil((duel.icecreamCooldownUntil - now) / 1000);
    pushDuelFeed(`巧乐兹冷却中：${remaining} 秒。`);
    playMissSound();
    updateIcecreamUi(now);
    return true;
  }

  if (appMode === 'lan') {
    duel.icecreamPending = true;
    duel.icecreamPendingUntil = now + 1500;
    pushDuelFeed('正在确认巧乐兹。');
    sendLan({ type: 'use-icecream' });
    updateIcecreamUi(now);
    return true;
  }

  activateIcecream(now, ICECREAM_INVULN_MS, ICECREAM_COOLDOWN_MS, { animate: true, sound: true });
  return true;
}

function activateIcecream(now = performance.now(), durationMs = ICECREAM_INVULN_MS, cooldownMs = ICECREAM_COOLDOWN_MS, options = {}) {
  const { animate = false, sound = false, announce = true } = options;
  duel.icecreamPending = false;
  duel.icecreamPendingUntil = 0;
  duel.icecreamUntil = Math.max(duel.icecreamUntil, now + durationMs);
  duel.icecreamCooldownUntil = Math.max(duel.icecreamCooldownUntil, now + cooldownMs);
  duel.protectedUntil = Math.max(duel.protectedUntil, duel.icecreamUntil);
  if (animate) triggerIcecreamAnimation(now);
  if (sound) playIcecreamSound();
  if (announce) pushDuelFeed('吃下巧乐兹，5 秒免伤。');
  updateIcecreamUi(now);
}

function triggerIcecreamAnimation(now = performance.now()) {
  icecreamEatStartedAt = now;
  icecreamEatUntil = now + ICECREAM_ANIMATION_MS;
  if (icecreamGroup) icecreamGroup.visible = true;
}

function updateIcecreamUi(now = performance.now()) {
  const visible = state === 'running' && isDuelMode() && duel.active && duel.health > 0;
  if (duel.icecreamPending && duel.icecreamPendingUntil && now > duel.icecreamPendingUntil) {
    duel.icecreamPending = false;
    duel.icecreamPendingUntil = 0;
  }
  const active = visible && now < duel.icecreamUntil;
  const cooldown = visible && !active && now < duel.icecreamCooldownUntil;
  const pending = visible && duel.icecreamPending;

  document.body.classList.toggle('is-icecream-protected', active);
  if (!dom.icecreamStatus) return;

  dom.icecreamStatus.hidden = !visible;
  dom.icecreamStatus.classList.toggle('active', active);
  dom.icecreamStatus.classList.toggle('cooldown', cooldown);
  dom.icecreamStatus.classList.toggle('pending', pending);
  if (!visible) return;

  if (pending) {
    dom.icecreamStatus.textContent = '巧乐兹 正在确认';
  } else if (active) {
    dom.icecreamStatus.textContent = `巧乐兹 免伤 ${Math.ceil((duel.icecreamUntil - now) / 1000)}s`;
  } else if (cooldown) {
    dom.icecreamStatus.textContent = `F 巧乐兹 ${Math.ceil((duel.icecreamCooldownUntil - now) / 1000)}s`;
  } else {
    dom.icecreamStatus.textContent = 'F 巧乐兹 可用';
  }
}

function showIcecreamBlockFeedback(now = performance.now()) {
  if (now - lastIcecreamBlockAt < 700) return;
  lastIcecreamBlockAt = now;
  playIcecreamBlockSound();
  pushDuelFeed('巧乐兹免伤挡住伤害。');
}

function fireWeapon(now) {
  if (equippedSlot === 'knife') {
    slashKnife(now);
    return;
  }

  if (isDuelMode()) {
    fireDuelWeapon(now);
    return;
  }

  const weapon = getPrimaryWeapon();
  if (weapon.id === 'shotgun') {
    fireShotgunRange(now);
    return;
  }
  if (now < nextShotAt) return;
  nextShotAt = now + weapon.fireInterval;
  session.shots += 1;
  sprayIndex += 1;
  spreadKick = Math.min(1, spreadKick + 0.18);

  const shot = castBallisticShot();
  showMuzzleFlash(now);
  playShotSound(weapon.id);
  applyAkRecoil();
  spawnTracer(shot.start, shot.end, shot.targetHit);
  if (!shot.targetHit) spawnImpact(shot.end, shot.normal);

  if (shot.targetHit) {
    const reaction = performance.now() - targetSpawnedAt;
    session.hits += 1;
    session.streak += 1;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
    session.totalReaction += reaction;
    session.score += scoreHit(reaction, session.streak);
    flashCrosshair('hit');
    showHitMarker(false);
    playHitSound(false);
    spawnHitEffect(targetGroup.position.clone(), true);
    spawnTarget();
  } else {
    session.misses += 1;
    session.streak = 0;
    flashCrosshair('miss');
    playMissSound();
  }

  updateStats();
}

function fireDuelWeapon(now) {
  if (!duel.active || duel.health <= 0 || now < nextShotAt) return;
  const weapon = getPrimaryWeapon();
  if (weapon.id === 'shotgun') {
    fireShotgunDuel(now);
    return;
  }
  nextShotAt = now + weapon.fireInterval;
  sprayIndex += 1;
  spreadKick = Math.min(1, spreadKick + 0.18);

  const shot = castDuelShot();
  showMuzzleFlash(now);
  playShotSound(weapon.id);
  applyAkRecoil();
  spawnTracer(shot.start, shot.end, Boolean(shot.hitbox));
  if (!shot.hitbox) spawnImpact(shot.end, shot.normal);

  if (appMode === 'bot' && shot.hitbox && bot.alive) {
    damageBot(getWeaponDamage(shot.hitbox), shot.hitbox === 'head');
  }
  if (appMode === 'lan') {
    sendLan({
      type: 'shot',
      weapon: weapon.id,
      origin: vectorPayload(shot.origin),
      direction: vectorPayload(shot.direction),
      targetId: shot.targetId || ''
    });
  }

  updateDuelHud();
}

function fireShotgunRange(now) {
  const weapon = getPrimaryWeapon();
  if (now < nextShotAt) return;
  nextShotAt = now + weapon.fireInterval;
  session.shots += 1;
  sprayIndex = 1;
  spreadKick = Math.min(1, spreadKick + 0.42);

  const pellets = castShotgunPellets(false);
  const hitPellet = pellets.find((pellet) => pellet.targetHit);
  showMuzzleFlash(now);
  playShotSound(weapon.id);
  applyAkRecoil();
  triggerShotgunSpin(now);
  pellets.forEach((pellet) => {
    spawnTracer(pellet.start, pellet.end, pellet.targetHit);
    if (!pellet.targetHit) spawnImpact(pellet.end, pellet.normal);
  });

  if (hitPellet) {
    const reaction = performance.now() - targetSpawnedAt;
    session.hits += 1;
    session.streak += 1;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
    session.totalReaction += reaction;
    session.score += scoreHit(reaction, session.streak);
    flashCrosshair('hit');
    showHitMarker(false);
    playHitSound(false);
    spawnHitEffect(targetGroup.position.clone(), true);
    spawnTarget();
  } else {
    session.misses += 1;
    session.streak = 0;
    flashCrosshair('miss');
    playMissSound();
  }

  updateStats();
}

function fireShotgunDuel(now) {
  const weapon = getPrimaryWeapon();
  nextShotAt = now + weapon.fireInterval;
  sprayIndex = 1;
  spreadKick = Math.min(1, spreadKick + 0.42);

  const pellets = castShotgunPellets(true);
  showMuzzleFlash(now);
  playShotSound(weapon.id);
  applyAkRecoil();
  triggerShotgunSpin(now);

  let totalDamage = 0;
  let headshot = false;
  pellets.forEach((pellet) => {
    spawnTracer(pellet.start, pellet.end, Boolean(pellet.hitbox));
    if (!pellet.hitbox) spawnImpact(pellet.end, pellet.normal);
    if (appMode === 'bot' && pellet.hitbox && bot.alive) {
      totalDamage += getWeaponDamage(pellet.hitbox);
      headshot ||= pellet.hitbox === 'head';
    }
  });

  if (appMode === 'bot' && totalDamage > 0) {
    damageBot(totalDamage, headshot);
  }

  if (appMode === 'lan') {
    const firstPellet = pellets[0];
    sendLan({
      type: 'shot',
      weapon: weapon.id,
      origin: vectorPayload(firstPellet?.origin || shotOrigin),
      direction: vectorPayload(firstPellet?.direction || shotDirection),
      pellets: pellets.map((pellet) => vectorPayload(pellet.direction))
    });
  }

  updateDuelHud();
}

function castShotgunPellets(duelShot = false) {
  const pellets = [];
  const weapon = getPrimaryWeapon();
  const pelletCount = weapon.pellets || SHOTGUN_PELLETS;
  const spread = currentSpread();
  for (let index = 0; index < pelletCount; index += 1) {
    const pelletSpread = spread * randomBetween(0.78, 1.18);
    pellets.push(duelShot ? castDuelShot(pelletSpread) : castBallisticShot(pelletSpread));
  }
  return pellets;
}

function triggerShotgunSpin(now) {
  shotgunSpinStartedAt = now;
  shotgunSpinUntil = now + SHOTGUN_SPIN_DURATION;
}

function slashKnife(now) {
  if (now - lastKnifeSlashAt < KNIFE_ATTACK_INTERVAL) return;
  lastKnifeSlashAt = now;
  knifeSlashUntil = now + KNIFE_SLASH_DURATION;
  weaponKick = Math.min(1.1, weaponKick + 0.5);
  playKnifeSound();

  if (isDuelMode() && opponentGroup?.visible && camera.position.distanceTo(opponentGroup.position) < 1.65) {
    if (appMode === 'bot' && bot.alive) damageBot(55, false);
  }
}

function getWeaponDamage(hitbox) {
  const weapon = getPrimaryWeapon();
  return hitbox === 'head' ? weapon.headDamage : weapon.bodyDamage;
}

function castDuelShot(spreadOverride = currentSpread()) {
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  muzzleTip.getWorldPosition(muzzleWorld);
  camera.getWorldPosition(shotOrigin);
  camera.getWorldDirection(shotDirection);
  shotRight.setFromMatrixColumn(camera.matrixWorld, 0);
  shotUp.setFromMatrixColumn(camera.matrixWorld, 1);

  const spread = spreadOverride;
  shotDirection
    .addScaledVector(shotRight, randomBetween(-spread, spread))
    .addScaledVector(shotUp, randomBetween(-spread, spread))
    .normalize();

  const aimLock = isCheatEnabled('aimLock') || isCheatEnabled('magicBullets');
  const bypassMap = isCheatEnabled('wallPhase') || isCheatEnabled('magicBullets');
  if (aimLock && opponentGroup?.visible && opponentHead) {
    opponentHead.getWorldPosition(cheatTargetPoint);
    shotDirection.copy(cheatTargetPoint).sub(shotOrigin).normalize();
  }

  raycaster.set(shotOrigin, shotDirection);
  raycaster.near = 0.04;
  raycaster.far = 80;

  const shotObjects = bypassMap && appMode === 'bot'
    ? duelHitMeshes
    : getDuelShotObjects();
  const hit = selectDuelShotIntersection(raycaster.intersectObjects(shotObjects, false));
  const rawEnd = hit ? hit.point.clone() : shotOrigin.clone().addScaledVector(shotDirection, 80);
  const blockerHit = bypassMap && appMode === 'bot' ? null : findActiveBlockerHit(shotOrigin, rawEnd, 0.02);
  const blockedByMap = Boolean(blockerHit);
  const end = blockedByMap ? blockerHit.point.clone() : rawEnd;
  let normal = null;
  if (!blockedByMap && hit?.face) {
    normal = impactNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize().clone();
  }
  return {
    origin: shotOrigin.clone(),
    direction: shotDirection.clone(),
    start: muzzleWorld.clone(),
    end,
    normal,
    hitbox: blockedByMap ? '' : (hit?.object?.userData?.hitbox || ''),
    targetId: blockedByMap ? '' : (hit?.object?.userData?.playerId || ''),
    targetName: blockedByMap ? '' : (hit?.object?.userData?.playerName || '')
  };
}

function getDuelShotObjects() {
  const arenaMeshes = getActiveArenaMeshes();
  if (appMode === 'lan') return getLanHitMeshes().concat(arenaMeshes);
  return opponentGroup?.visible ? duelHitMeshes.concat(arenaMeshes) : arenaMeshes;
}

function getLanHitMeshes() {
  const meshes = [];
  lanOpponents.forEach((avatar) => {
    if (!avatar.group.visible) return;
    meshes.push(avatar.body, avatar.head);
  });
  return meshes;
}

function selectDuelShotIntersection(hits) {
  for (const hit of hits) {
    if (!hit.object?.userData?.hitbox) return hit;
    if (isValidDuelHitTarget(hit.object)) return hit;
  }
  return null;
}

function isValidDuelHitTarget(object) {
  if (appMode !== 'lan') return true;
  const playerId = object.userData.playerId;
  const avatar = lanOpponents.get(playerId);
  if (!avatar?.group.visible) return false;
  return avatar.team !== getPlayerTeam(duel.selfSlot);
}

function castBallisticShot(spreadOverride = currentSpread()) {
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  muzzleTip.getWorldPosition(muzzleWorld);
  camera.getWorldPosition(shotOrigin);
  camera.getWorldDirection(shotDirection);
  shotRight.setFromMatrixColumn(camera.matrixWorld, 0);
  shotUp.setFromMatrixColumn(camera.matrixWorld, 1);

  const spread = spreadOverride;
  const horizontal = randomBetween(-spread, spread);
  const vertical = randomBetween(-spread, spread);
  shotDirection.addScaledVector(shotRight, horizontal).addScaledVector(shotUp, vertical).normalize();
  raycaster.set(shotOrigin, shotDirection);
  raycaster.near = 0.04;
  raycaster.far = 80;

  const hit = raycaster.intersectObjects([targetBody].concat(rangeArenaMeshes), false)[0];
  const end = hit ? hit.point.clone() : shotOrigin.clone().addScaledVector(shotDirection, 44);
  let normal = null;
  if (hit?.face) {
    normal = impactNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize().clone();
  }
  return {
    origin: shotOrigin.clone(),
    direction: shotDirection.clone(),
    start: muzzleWorld.clone(),
    end,
    normal,
    targetHit: hit?.object === targetBody
  };
}

function currentSpread() {
  if (equippedSlot === 'knife') return 0;
  const weapon = getPrimaryWeapon();
  if (weapon.id === 'sniper' && aimingDownSights) return SNIPER_ADS_SPREAD;
  const hipSpread = Math.min(weapon.maxSpread, weapon.baseSpread + Math.max(0, sprayIndex - 1) * weapon.spreadStep);
  let spread = hipSpread * THREE.MathUtils.lerp(1, weapon.adsSpreadScale, adsBlend);
  if (isPlayerAirborne()) {
    const hipInfluence = 1 - THREE.MathUtils.smoothstep(adsBlend, 0.58, 0.96);
    spread = spread * THREE.MathUtils.lerp(1, AIR_HIP_SPREAD_MULTIPLIER, hipInfluence) + AIR_HIP_SPREAD_BONUS * hipInfluence;
  } else if (playerCrouching) {
    spread *= CROUCH_SPREAD_SCALE;
  }
  return spread;
}

function applyAkRecoil() {
  const weapon = getPrimaryWeapon();
  if (weapon.id === 'sniper') {
    const recoilScale = aimingDownSights ? 0.78 : 1;
    pitch = THREE.MathUtils.clamp(pitch + SNIPER_RECOIL * recoilScale, -1.06, 1.06);
    yaw += randomBetween(-0.018, 0.018) * recoilScale;
    weaponKick = Math.min(1.65, weaponKick + 0.92);
    applyView();
    return;
  }

  if (weapon.id === 'shotgun') {
    const recoilScale = THREE.MathUtils.lerp(weapon.recoilScale, weapon.adsRecoilScale, adsBlend);
    pitch = THREE.MathUtils.clamp(pitch + 0.055 * recoilScale, -1.06, 1.06);
    yaw += randomBetween(-0.026, 0.026) * recoilScale;
    weaponKick = Math.min(1.9, weaponKick + 1.05 * recoilScale);
    applyView();
    return;
  }

  const recoilScale = THREE.MathUtils.lerp(weapon.recoilScale, weapon.adsRecoilScale, adsBlend);
  const climb = Math.min(0.023, 0.010 + sprayIndex * 0.0009) * recoilScale;
  pitch = THREE.MathUtils.clamp(pitch + climb, -1.06, 1.06);
  yaw += (randomBetween(-0.008, 0.008) + Math.sin(sprayIndex * 1.74) * 0.0025) * recoilScale;
  weaponKick = Math.min(1.35, weaponKick + 0.38 * recoilScale);
  applyView();
}

function showMuzzleFlash(now) {
  muzzleFlashUntil = now + 42;
  if (muzzleFlash) {
    muzzleFlash.visible = true;
    muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    muzzleFlash.scale.setScalar(randomBetween(0.82, 1.28));
  }
  if (muzzleLight) muzzleLight.intensity = 3.8;
}

function spawnTarget() {
  const candidates = ZONES.filter((zone) => zone.id !== previousZoneId);
  currentZone = candidates[Math.floor(Math.random() * candidates.length)];
  previousZoneId = currentZone.id;

  targetGroup.position.set(
    randomBetween(currentZone.x[0], currentZone.x[1]),
    randomBetween(currentZone.y[0], currentZone.y[1]),
    randomBetween(currentZone.z[0], currentZone.z[1])
  );
  targetGroup.visible = true;
  targetGroup.scale.setScalar(1);
  targetSpawnedAt = performance.now();
  dom.targetZone.textContent = currentZone.label;
}

function spawnPreviewTarget() {
  currentZone = ZONES[0];
  targetGroup.position.set(0, 1.8, -7.2);
  targetGroup.visible = true;
  targetSpawnedAt = performance.now();
  dom.targetZone.textContent = currentZone.label;
}

function expireTarget() {
  session.expired += 1;
  session.streak = 0;
  flashCrosshair('miss');
  spawnHitEffect(targetGroup.position.clone(), false);
  spawnTarget();
  updateStats();
}

function render() {
  const delta = clock.getDelta();
  const now = performance.now();

  if (state === 'running') {
    if (triggerHeld && getCurrentWeapon().automatic && now >= nextShotAt) fireWeapon(now);
    updateMovement(delta);
    if (appMode === 'range') {
      if (now >= session.endsAt) {
        finishRun();
      } else if (now - targetSpawnedAt > TARGET_LIFETIME) {
        expireTarget();
      }
    } else if (appMode === 'bot') {
      updateBotDuel(delta, now);
    } else if (appMode === 'lan') {
      updateLanDuel(now);
    }
  } else {
    triggerHeld = false;
  }
  sprayIndex = triggerHeld ? sprayIndex : Math.max(0, sprayIndex - delta * 7.5);
  const firingSpreadKick = triggerHeld ? Math.min(1, sprayIndex / 12) : 0;
  const airborneHipKick = isPlayerAirborne() && equippedSlot === 'primary'
    ? Math.max(0, 1 - adsBlend) * 0.9
    : 0;
  spreadKick = THREE.MathUtils.damp(spreadKick, Math.max(firingSpreadKick, airborneHipKick), 14, delta);
  updateAimDownSights(delta);
  updateWeaponUi(now);
  updateSpawnProtectionUi(now);

  animateTarget(now);
  animateOpponent(delta);
  updateNameplateVisibility();
  animateWeapon(delta, now);
  animateIcecream(now);
  animateTransients(delta);
  updateDynamicCrosshair();
  updateTargetClock(now);
  renderer.render(scene, camera);
  renderWeaponPreviews(delta);
  requestAnimationFrame(render);
}

function animateTarget(now) {
  if (!targetGroup.visible) return;
  const age = now - targetSpawnedAt;
  const pulse = 1 + Math.sin(age * 0.009) * 0.045;
  const urgency = THREE.MathUtils.clamp(age / TARGET_LIFETIME, 0, 1);
  targetBody.scale.setScalar(pulse);
  targetBody.material.emissiveIntensity = 0.56 + urgency * 0.62;
  targetRing.rotation.z += 0.018;
  targetRing.lookAt(camera.position);
  targetHalo.lookAt(camera.position);
  targetHalo.scale.setScalar(1.08 + urgency * 0.56);
  targetHalo.material.opacity = 0.34 * (1 - urgency * 0.65);
}

function animateTransients(delta) {
  for (let index = transientObjects.length - 1; index >= 0; index -= 1) {
    const item = transientObjects[index];
    item.age += delta;
    const progress = item.age / item.life;
    if (item.kind === 'billboard') {
      item.mesh.lookAt(camera.position);
      item.mesh.scale.setScalar(1 + progress * 1.8);
    }
    item.mesh.material.opacity = Math.max(0, item.opacity * (1 - progress));
    if (progress >= 1) {
      scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      transientObjects.splice(index, 1);
    }
  }
}

function updateMovement(delta) {
  if (isDuelMode() && duel.health <= 0) {
    localHorizontalSpeed = 0;
    return;
  }

  const now = performance.now();
  const usingJoystick = mobileControlsEnabled() && mobileMoveVector.lengthSq() > 0.002;
  const forward = usingJoystick ? mobileMoveVector.y : resolveMoveAxis('KeyW', 'KeyS');
  const strafe = usingJoystick ? mobileMoveVector.x : resolveMoveAxis('KeyD', 'KeyA');
  const flyEnabled = isCheatEnabled('fly');
  let wantsCrouch = crouchHeld && playerGrounded;

  if (!flyEnabled && playerGrounded) {
    const supportHeight = getActiveSupportHeight(camera.position.x, camera.position.z, playerVerticalOffset + OBSTACLE_CLEARANCE);
    if (playerVerticalOffset > supportHeight + OBSTACLE_CLEARANCE) {
      playerGrounded = false;
      playerVerticalVelocity = Math.min(0, playerVerticalVelocity);
    } else {
      playerVerticalOffset = supportHeight;
    }
  }

  if (jumpQueued && now > jumpQueuedUntil) consumeJumpQueue();

  if (flyEnabled) {
    playerGrounded = true;
    playerVerticalVelocity = 0;
    playerCrouching = false;
    wantsCrouch = false;
    if (jumpQueued) {
      playerVerticalOffset = Math.min(12, playerVerticalOffset + 1.8);
      consumeJumpQueue();
      playJumpSound();
    }
    if (crouchHeld) playerVerticalOffset = Math.max(0, playerVerticalOffset - 5.5 * delta);
  }

  if (!flyEnabled && jumpQueued && playerGrounded) {
    crouchHeld = false;
    wantsCrouch = false;
    playerGrounded = false;
    playerCrouching = false;
    playerVerticalVelocity = JUMP_VELOCITY;
    playJumpSound();
    consumeJumpQueue();
  }

  if (!flyEnabled && !playerGrounded) {
    const previousFeetY = playerVerticalOffset;
    playerVerticalVelocity -= GRAVITY * delta;
    const nextFeetY = playerVerticalOffset + playerVerticalVelocity * delta;
    const supportHeight = getActiveSupportHeight(
      camera.position.x,
      camera.position.z,
      previousFeetY + OBSTACLE_CLEARANCE
    );
    const landedOnSupport = playerVerticalVelocity <= 0 &&
      previousFeetY >= supportHeight - OBSTACLE_CLEARANCE &&
      nextFeetY <= supportHeight;
    playerVerticalOffset = Math.max(0, nextFeetY);
    if (landedOnSupport || (playerVerticalOffset <= 0 && playerVerticalVelocity <= 0)) {
      playerVerticalOffset = landedOnSupport ? supportHeight : 0;
      playerVerticalVelocity = 0;
      playerGrounded = true;
    }
  }

  playerCrouching = wantsCrouch && playerGrounded && !flyEnabled;
  const targetEyeHeight = playerCrouching ? CROUCH_CAMERA_HEIGHT : CAMERA_HEIGHT;
  playerEyeHeight = THREE.MathUtils.damp(playerEyeHeight, targetEyeHeight, 18, delta);

  if (Math.abs(forward) < 0.01 && Math.abs(strafe) < 0.01) {
    localHorizontalSpeed = 0;
    applyPlayerEyeHeight(0);
    return;
  }

  moveInput.set(strafe, forward);
  const inputStrength = Math.min(1, moveInput.length());
  if (moveInput.lengthSq() > 1) moveInput.normalize();

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const moveX = moveInput.x * cos - moveInput.y * sin;
  const moveZ = -moveInput.x * sin - moveInput.y * cos;
  let speed = THREE.MathUtils.lerp(MOVE_SPEED, ADS_MOVE_SPEED, adsBlend);
  if (playerCrouching) speed = Math.min(speed, CROUCH_MOVE_SPEED);
  if (!playerGrounded) speed *= AIR_MOVE_SPEED_SCALE;

  const bounds = getPlayerBounds();
  const movementSpeed = speed * inputStrength;
  const previousX = camera.position.x;
  const previousZ = camera.position.z;
  const nextX = THREE.MathUtils.clamp(camera.position.x + moveX * movementSpeed * delta, bounds.minX, bounds.maxX);
  const resolvedX = isCheatEnabled('wallPhase') ? { x: nextX, z: camera.position.z } : resolveActiveCollision(nextX, camera.position.z, PLAYER_COLLISION_RADIUS);
  camera.position.x = THREE.MathUtils.clamp(resolvedX.x, bounds.minX, bounds.maxX);
  camera.position.z = THREE.MathUtils.clamp(resolvedX.z, bounds.minZ, bounds.maxZ);

  const nextZ = THREE.MathUtils.clamp(camera.position.z + moveZ * movementSpeed * delta, bounds.minZ, bounds.maxZ);
  const resolvedZ = isCheatEnabled('wallPhase') ? { x: camera.position.x, z: nextZ } : resolveActiveCollision(camera.position.x, nextZ, PLAYER_COLLISION_RADIUS);
  camera.position.x = THREE.MathUtils.clamp(resolvedZ.x, bounds.minX, bounds.maxX);
  camera.position.z = THREE.MathUtils.clamp(resolvedZ.z, bounds.minZ, bounds.maxZ);

  walkPhase += delta * movementSpeed;
  localHorizontalSpeed = Math.hypot(camera.position.x - previousX, camera.position.z - previousZ) / Math.max(delta, 0.001);
  const bobScale = (playerGrounded ? 1 : 0) * (playerCrouching ? 0.42 : 1) * (1 - adsBlend * 0.78);
  applyPlayerEyeHeight(Math.sin(walkPhase * 8.6) * 0.018 * bobScale);
}

function applyPlayerEyeHeight(bob = 0) {
  camera.position.y = playerEyeHeight + playerVerticalOffset + bob;
}

function resetPlayerMotion(eyeY = CAMERA_HEIGHT) {
  playerEyeHeight = CAMERA_HEIGHT;
  playerVerticalOffset = Math.max(0, eyeY - CAMERA_HEIGHT);
  playerVerticalVelocity = 0;
  playerGrounded = true;
  playerCrouching = false;
  crouchHeld = false;
  jumpQueued = false;
  jumpQueuedUntil = 0;
  localHorizontalSpeed = 0;
  camera.position.y = CAMERA_HEIGHT + playerVerticalOffset;
}

function isPlayerAirborne() {
  return !playerGrounded || playerVerticalOffset > 0.025;
}

function getLocalPosePosition() {
  localPosePosition.set(camera.position.x, playerEyeHeight + playerVerticalOffset, camera.position.z);
  return localPosePosition;
}

function updateAimDownSights(delta, snap = false) {
  const aiming = aimingDownSights && equippedSlot === 'primary' && state === 'running' && hasGameInput();
  const targetBlend = aiming ? 1 : 0;
  const weapon = getPrimaryWeapon();

  if (snap || weapon.id === 'sniper') {
    adsBlend = targetBlend;
  } else {
    adsBlend = THREE.MathUtils.damp(adsBlend, targetBlend, 17, Math.max(delta, 1 / 240));
  }

  const nextFov = THREE.MathUtils.lerp(BASE_CAMERA_FOV, weapon.adsFov, adsBlend);
  if (Math.abs(camera.fov - nextFov) > 0.01) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
  document.body.classList.toggle('is-ads', adsBlend > 0.55);
  document.body.classList.toggle('is-scoped', aiming && weapon.id === 'sniper');
  updateWeaponModelVisibility();
}

function isDuelMode() {
  return appMode === 'lan' || appMode === 'bot';
}

function setupDuel(type, roomCode = '') {
  setArenaMode('duel');
  duel.active = true;
  duel.type = type;
  duel.roomCode = roomCode;
  duel.health = DUEL_PLAYER_HEALTH;
  duel.kills = 0;
  duel.deaths = 0;
  duel.enemyHealth = DUEL_PLAYER_HEALTH;
  duel.enemyKills = 0;
  duel.enemyDeaths = 0;
  duel.enemyAlive = true;
  duel.respawningUntil = 0;
  duel.protectedUntil = performance.now() + SPAWN_PROTECTION_MS;
  duel.icecreamUntil = 0;
  duel.icecreamCooldownUntil = 0;
  duel.icecreamPending = false;
  duel.icecreamPendingUntil = 0;
  duel.winnerText = '';
  clearKillFeed();
  icecreamEatUntil = 0;
  if (icecreamGroup) icecreamGroup.visible = false;
  nextShotAt = 0;
  sprayIndex = 0;
  spreadKick = 0;
  weaponKick = 0;
  muzzleFlashUntil = 0;
  equippedSlot = 'primary';
  syncWeaponModel();
  targetGroup.visible = false;
  if (opponentGroup) opponentGroup.visible = type === 'bot';
  clearLanOpponents();
  setOverlay(null);
  dom.hud.hidden = true;
  dom.duelHud.hidden = false;
  dom.duelFeed.hidden = false;
  dom.killFeed.hidden = false;
  dom.targetClock.hidden = true;
  state = 'running';
  updateDuelHud();
  syncCheatUi();
}

function beginBotDuel() {
  appMode = 'bot';
  setupDuel('bot', 'BOT');
  placeLocalPlayer(getDuelSpawn('red1'));
  resetBot();
  pushDuelFeed('人机对战开始。');
}

function resetBot() {
  const spawn = getDuelSpawn('blue1');
  bot.position.copy(spawn.position);
  bot.yaw = spawn.yaw;
  bot.pitch = 0;
  bot.health = DUEL_PLAYER_HEALTH;
  bot.kills = 0;
  bot.deaths = 0;
  bot.alive = true;
  bot.protectedUntil = performance.now() + SPAWN_PROTECTION_MS;
  bot.respawnAt = 0;
  bot.burstShotsRemaining = 0;
  bot.bulletsFired = 0;
  bot.nextShotAt = performance.now() + ((BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal).openingDelay || 520);
  bot.strafe = Math.random() > 0.5 ? 1 : -1;
  bot.nextStrafeAt = performance.now() + 900;
  bot.targetVelocity.set(0, 0, 0);
  bot.lastTargetPosition = camera.position.clone();
  bot.navRoute = [];
  bot.navRouteIndex = 0;
  bot.navTarget = null;
  bot.navNextAt = 0;
  bot.navStuckSince = 0;
  bot.navLastPosition.copy(bot.position);
  duel.enemyName = getBotDisplayName();
  duel.enemyHealth = bot.health;
  duel.enemyKills = bot.kills;
  duel.enemyDeaths = bot.deaths;
  duel.enemyAlive = bot.alive;
  setOpponentPose({ position: vectorPayload(bot.position), yaw: bot.yaw, pitch: bot.pitch, ads: false, crouch: false, airborne: false, moving: false, speed: 0 }, true);
}

function updateBotDuel(delta, now) {
  if (!duel.active) return;
  if (duel.health <= 0) {
    if (duel.respawningUntil && now >= duel.respawningUntil) respawnLocalPlayer();
    updateDuelHud();
    return;
  }

  if (!bot.alive) {
    if (bot.respawnAt && now >= bot.respawnAt) respawnBot();
    updateDuelHud();
    return;
  }

  const setting = BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal;
  if (bot.lastTargetPosition) {
    bot.targetVelocity.copy(camera.position).sub(bot.lastTargetPosition).divideScalar(Math.max(delta, 0.001));
    bot.targetVelocity.y = 0;
    bot.targetVelocity.clampLength(0, 7.5);
  } else {
    bot.targetVelocity.set(0, 0, 0);
  }
  bot.lastTargetPosition = camera.position.clone();

  const toPlayer = camera.position.clone().sub(bot.position);
  toPlayer.y = 0;
  const distance = Math.max(0.001, toPlayer.length());
  const forward = toPlayer.clone().normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const previousX = bot.position.x;
  const previousZ = bot.position.z;

  const botEye = bot.position.clone();
  botEye.y += 0.02;
  const sightTarget = getBotVisibleTargetPoint(botEye);
  const botCanSee = Boolean(sightTarget);
  const movementTarget = botCanSee
    ? camera.position
    : getBotNavigationIntent(bot.position, camera.position, now, activeDuelMap);
  const moveDirection = movementTarget.clone().sub(bot.position);
  moveDirection.y = 0;
  if (moveDirection.lengthSq() > 0.01) moveDirection.normalize();
  const moveRight = new THREE.Vector3(moveDirection.z, 0, -moveDirection.x);

  if (now >= bot.nextStrafeAt) {
    bot.strafe = Math.random() > 0.5 ? 1 : -1;
    bot.nextStrafeAt = now + randomBetween(setting.strafeMin, setting.strafeMax);
  }

  const distanceIntent = !botCanSee
    ? 1
    : distance > setting.rangeFar ? setting.advance : distance < setting.rangeClose ? setting.retreat : 0.04;
  const lateralIntent = bot.strafe + Math.sin(now * 0.008) * setting.dodgeJitter;
  bot.position.addScaledVector(botCanSee ? right : moveRight, lateralIntent * setting.moveSpeed * delta);
  bot.position.addScaledVector(botCanSee ? forward : moveDirection, distanceIntent * setting.moveSpeed * delta);
  const bounds = getDuelMapConfig(activeDuelMap).bounds;
  bot.position.x = THREE.MathUtils.clamp(bot.position.x, bounds.minX, bounds.maxX);
  bot.position.z = THREE.MathUtils.clamp(bot.position.z, bounds.minZ, bounds.maxZ);
  const resolvedBot = resolveMapCollision(bot.position.x, bot.position.z, BOT_COLLISION_RADIUS, activeDuelMap);
  if (resolvedBot.collided) {
    bot.position.x = THREE.MathUtils.clamp(resolvedBot.x, bounds.minX, bounds.maxX);
    bot.position.z = THREE.MathUtils.clamp(resolvedBot.z, bounds.minZ, bounds.maxZ);
    bot.strafe *= -1;
    bot.nextStrafeAt = now + randomBetween(setting.strafeMin, setting.strafeMax);
  }
  bot.yaw = Math.atan2(-forward.x, -forward.z);
  bot.pitch = THREE.MathUtils.clamp((camera.position.y - bot.position.y) / Math.max(1, distance), -0.35, 0.35);
  const botSpeed = Math.hypot(bot.position.x - previousX, bot.position.z - previousZ) / Math.max(delta, 0.001);
  const intendedSpeed = Math.abs(distanceIntent) * setting.moveSpeed;
  if (!botCanSee && intendedSpeed > 0.55 && botSpeed < 0.08) {
    bot.navStuckSince = bot.navStuckSince || now;
  } else if (botSpeed > 0.12) {
    bot.navStuckSince = 0;
  }
  setOpponentPose({ position: vectorPayload(bot.position), yaw: bot.yaw, pitch: bot.pitch, ads: false, crouch: false, airborne: false, moving: botSpeed > 0.08, speed: botSpeed });

  if (!botCanSee) {
    if (!setting.prefireOnSight) {
      bot.burstShotsRemaining = 0;
      bot.nextShotAt = Math.max(bot.nextShotAt, now + Math.max(120, setting.openingDelay * 0.55));
    }
  } else if (now >= bot.nextShotAt) {
    const fired = botFire(setting);
    scheduleBotNextShot(setting, now, fired);
  }

  updateDuelHud();
}

function botFire(setting) {
  const origin = bot.position.clone();
  origin.y += 0.02;
  const bulletNumber = bot.bulletsFired + 1;
  const magicShot = Boolean(setting.magicEvery && bulletNumber % setting.magicEvery === 0);
  const magicTarget = magicShot ? getMagicBotTarget(setting) : null;
  const visibleTarget = getBotVisibleTargetPoint(origin);
  const target = magicTarget?.point || visibleTarget || camera.position.clone();
  if (!magicShot && setting.leadTime > 0) target.addScaledVector(bot.targetVelocity, setting.leadTime);
  if (!magicShot && !visibleTarget) target.y += randomBetween(-0.24 + setting.headBias, 0.12 + setting.headBias * 0.62);
  if (!hasLineOfSight(origin, target, 0.03)) return false;
  const direction = target.sub(origin).normalize();
  if (!magicShot) {
    direction.x += randomBetween(-setting.aimError, setting.aimError);
    direction.y += randomBetween(-setting.aimError * 0.42, setting.aimError * 0.42);
    direction.z += randomBetween(-setting.aimError, setting.aimError);
    direction.normalize();
  }
  bot.bulletsFired = bulletNumber;

  shotEnd.copy(origin).addScaledVector(direction, 44);

  const hit = testLocalPlayerHit(origin, direction);
  if (!hit) {
    const blockerHit = findActiveBlockerHit(origin, shotEnd, 0.02);
    spawnTracer(origin, blockerHit?.point || shotEnd, false);
    return false;
  }
  const hitPoint = origin.clone().addScaledVector(direction, hit.t);
  const blockerHit = findActiveBlockerHit(origin, hitPoint, 0.02);
  if (blockerHit) {
    spawnTracer(origin, blockerHit.point, false);
    return false;
  }
  spawnTracer(origin, shotEnd, false);
  const headshot = hit.headshot || Boolean(magicTarget?.headshot);
  damageLocalPlayer(headshot ? DUEL_HEAD_DAMAGE : DUEL_BODY_DAMAGE, headshot, magicShot ? '炼狱 BOT' : 'BOT');
  return true;
}

function getBotVisibleTargetPoint(origin) {
  const metrics = getPostureMetrics(playerCrouching);
  const head = camera.position.clone();
  head.y = playerVerticalOffset + metrics.headY;
  if (hasLineOfSight(origin, head, 0.02)) return head;
  const chest = camera.position.clone();
  chest.y = playerVerticalOffset + metrics.bodyEnd - 0.16;
  if (hasLineOfSight(origin, chest, 0.02)) return chest;
  return null;
}

function getMagicBotTarget(setting) {
  const metrics = getPostureMetrics(playerCrouching);
  const forceHead = Math.random() < (setting.magicHeadshotChance || 0);
  const point = camera.position.clone();
  point.y = playerVerticalOffset + (forceHead ? metrics.headY : Math.max(metrics.bodyStart, metrics.bodyEnd - 0.08));
  return { point, headshot: forceHead };
}

function scheduleBotNextShot(setting, now, fired) {
  if (!fired) {
    bot.burstShotsRemaining = 0;
    bot.nextShotAt = now + Math.max(120, setting.openingDelay * 0.5);
    return;
  }

  if (bot.burstShotsRemaining > 0) {
    bot.burstShotsRemaining -= 1;
    bot.nextShotAt = now + (bot.burstShotsRemaining > 0 ? setting.burstDelay : randomBetween(setting.fireMin, setting.fireMax));
    return;
  }

  bot.burstShotsRemaining = Math.random() < setting.burstChance ? Math.max(0, setting.burstShots - 1) : 0;
  bot.nextShotAt = now + (bot.burstShotsRemaining > 0 ? setting.burstDelay : randomBetween(setting.fireMin, setting.fireMax));
}

function hasLineOfSight(origin, target, padding = 0.25) {
  if (findActiveBlockerHit(origin, target, padding)) return false;
  scene.updateMatrixWorld(true);
  losDirection.copy(target).sub(origin);
  const distance = losDirection.length();
  if (distance <= 0.1) return true;
  losDirection.normalize();
  raycaster.set(origin, losDirection);
  raycaster.near = 0.08;
  raycaster.far = Math.max(0.08, distance - padding);
  return raycaster.intersectObjects(getActiveArenaMeshes(), false).length === 0;
}

function damageBot(damage, headshot) {
  if (!bot.alive || !duel.active) return;
  if (performance.now() < bot.protectedUntil) return;
  bot.health = Math.max(0, bot.health - damage);
  duel.enemyHealth = bot.health;
  updateNameplate(opponentParts.nameplate, { name: getBotDisplayName(), team: 'blue', health: bot.health });
  flashCrosshair('hit');
  showHitMarker(headshot);
  playHitSound(headshot);
  pushDuelFeed(headshot ? '爆头命中 BOT。' : '命中 BOT。');

  if (bot.health > 0) return;
  bot.alive = false;
  bot.deaths += 1;
  duel.kills += 1;
  duel.enemyDeaths = bot.deaths;
  duel.enemyAlive = false;
  bot.respawnAt = performance.now() + DUEL_RESPAWN_DELAY;
  if (opponentGroup) opponentGroup.visible = false;
  pushDuelFeed('击杀 BOT。');
  addKillFeedEntry(localPlayerName || accountSnapshot.displayName || '你', getBotDisplayName(), headshot);
  showKillFeedback({ headshot, label: headshot ? '爆头击杀' : '击杀' });
  spawnHitEffect(bot.position.clone(), true);

  if (duel.kills >= DUEL_MAX_KILLS) finishDuel(true, '胜利', `你 ${duel.kills} : ${bot.kills} BOT`);
}

function respawnBot() {
  const spawn = getDuelSpawn('blue1');
  bot.position.copy(spawn.position);
  bot.yaw = spawn.yaw;
  bot.pitch = 0;
  bot.health = DUEL_PLAYER_HEALTH;
  bot.alive = true;
  bot.protectedUntil = performance.now() + SPAWN_PROTECTION_MS;
  bot.respawnAt = 0;
  bot.navRoute = [];
  bot.navRouteIndex = 0;
  bot.navTarget = null;
  bot.navNextAt = 0;
  bot.navStuckSince = 0;
  bot.navLastPosition.copy(bot.position);
  bot.burstShotsRemaining = 0;
  bot.nextShotAt = performance.now() + ((BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal).openingDelay || 420);
  bot.targetVelocity.set(0, 0, 0);
  bot.lastTargetPosition = camera.position.clone();
  duel.enemyHealth = bot.health;
  duel.enemyName = getBotDisplayName();
  duel.enemyAlive = true;
  setOpponentPose({ position: vectorPayload(bot.position), yaw: bot.yaw, pitch: bot.pitch, ads: false, crouch: false, airborne: false, moving: false, speed: 0 }, true);
  pushDuelFeed('BOT 已复活。');
}

function damageLocalPlayer(damage, headshot, attackerName) {
  const now = performance.now();
  if (duel.health <= 0 || !duel.active) return;
  if (isCheatEnabled('invincible')) return;
  if (now < duel.protectedUntil) {
    if (now < duel.icecreamUntil) showIcecreamBlockFeedback(now);
    return;
  }
  duel.health = Math.max(0, duel.health - damage);
  flashCrosshair('miss');
  showDamageVignette(headshot);
  playDamageSound(headshot);
  pushDuelFeed(headshot ? `${attackerName} 爆头命中你。` : `${attackerName} 命中你。`);

  if (duel.health > 0) {
    updateDuelHud();
    return;
  }

  duel.deaths += 1;
  duel.respawningUntil = now + DUEL_RESPAWN_DELAY;
  clearInputState();
  showDeathFlash();
  playDeathSound();
  addKillFeedEntry(getBotDisplayName(), localPlayerName || accountSnapshot.displayName || '你', headshot);

  if (appMode === 'bot') {
    bot.kills += 1;
    duel.enemyKills = bot.kills;
    pushDuelFeed('你被 BOT 击杀。');
    if (bot.kills >= DUEL_MAX_KILLS) finishDuel(false, '落败', `你 ${duel.kills} : ${bot.kills} BOT`);
  }
  updateDuelHud();
}

function respawnLocalPlayer() {
  placeLocalPlayer(getDuelSpawn(duel.selfSlot || 'red1'));
  duel.health = DUEL_PLAYER_HEALTH;
  duel.respawningUntil = 0;
  duel.protectedUntil = performance.now() + SPAWN_PROTECTION_MS;
  duel.icecreamUntil = 0;
  duel.icecreamPending = false;
  duel.icecreamPendingUntil = 0;
  if (appMode === 'bot') {
    bot.targetVelocity.set(0, 0, 0);
    bot.lastTargetPosition = camera.position.clone();
  }
  pushDuelFeed('你已复活，1 秒保护。');
  updateDuelHud();
}

function placeLocalPlayer(spawn) {
  clearInputState();
  camera.position.copy(spawn.position);
  resetPlayerMotion(spawn.position.y);
  yaw = spawn.yaw;
  pitch = 0;
  adsBlend = 0;
  walkPhase = 0;
  camera.fov = BASE_CAMERA_FOV;
  camera.updateProjectionMatrix();
  applyView();
  document.body.classList.remove('is-ads', 'is-scoped');
  updateWeaponModelVisibility();
  updateWeaponUi();
}

function testLocalPlayerHit(origin, direction) {
  const metrics = getPostureMetrics(playerCrouching);
  const feetY = playerVerticalOffset;
  const bodyStart = camera.position.clone();
  bodyStart.y = feetY + metrics.bodyStart;
  const bodyEnd = camera.position.clone();
  bodyEnd.y = feetY + metrics.bodyEnd;
  const headCenter = camera.position.clone();
  headCenter.y = feetY + metrics.headY;

  const head = raySphereDistance(origin, direction, headCenter, metrics.headRadius);
  if (head.hit && head.t > 0 && head.t < 80) return { headshot: true, t: head.t };

  const body = raySegmentDistance(origin, direction, bodyStart, bodyEnd);
  if (body.distance <= metrics.bodyRadius && body.tRay > 0 && body.tRay < 80) return { headshot: false, t: body.tRay };
  return null;
}

function enterLanDuel() {
  if (!lanRoom?.started) {
    setOverlay('lan');
    dom.lanStatus.textContent = '对局还没开始。双方都准备后再进入。';
    return;
  }

  appMode = 'lan';
  if (lanRoom.map) applyRoomDuelMap(lanRoom.map);
  duel.selfSlot = lanSelfSlot || 'red';
  setupDuel('lan', lanRoom.code);
  const spawn = pendingLanSpawn
    ? { position: vectorFromPayload(pendingLanSpawn.position), yaw: pendingLanSpawn.yaw }
    : getDuelSpawn(duel.selfSlot || 'red1');
  placeLocalPlayer(spawn);
  applyLanRoom(lanRoom);
  sendPose();
  pushDuelFeed('已进入局域网对枪。');
}

function resumeDuelRun() {
  if (!duel.active) return;
  const now = performance.now();
  if (appMode === 'bot' && pausedAt > 0) {
    const pausedDuration = Math.max(0, now - pausedAt);
    if (duel.protectedUntil > pausedAt) duel.protectedUntil += pausedDuration;
    if (duel.icecreamUntil > pausedAt) duel.icecreamUntil += pausedDuration;
    if (duel.icecreamCooldownUntil > pausedAt) duel.icecreamCooldownUntil += pausedDuration;
    if (duel.icecreamPendingUntil > pausedAt) duel.icecreamPendingUntil += pausedDuration;
    if (icecreamEatUntil > pausedAt) {
      icecreamEatStartedAt += pausedDuration;
      icecreamEatUntil += pausedDuration;
    }
  }
  pausedAt = 0;
  clearInputState();
  state = 'running';
  setOverlay(null);
  dom.hud.hidden = true;
  dom.duelHud.hidden = false;
  dom.duelFeed.hidden = false;
  dom.targetClock.hidden = true;
}

function finishDuel(won, mainText, detailText) {
  if (!isDuelMode()) return;
  duel.active = false;
  document.body.classList.remove('is-spawn-protected');
  state = 'ended';
  clearInputState();
  if (document.pointerLockElement === dom.canvas) document.exitPointerLock();
  dom.hud.hidden = true;
  dom.duelHud.hidden = true;
  dom.duelFeed.hidden = true;
  dom.killFeed.hidden = true;
  if (dom.spawnShield) dom.spawnShield.hidden = true;
  dom.targetClock.hidden = true;
  dom.duelResultMain.textContent = mainText || (won ? '胜利' : '结束');
  dom.duelResultDetail.textContent = detailText || '本轮对枪结束。';
  dom.duelRetryButton.textContent = appMode === 'bot' ? '再战 BOT' : '回到房间';
  syncCheatUi();
  setOverlay('duel-result');
}

function retryDuel() {
  if (appMode === 'bot') {
    requestGameLock('bot-start');
    return;
  }
  openLanPanel();
}

function cleanupDuel(leaveRoom = true) {
  if (document.pointerLockElement === dom.canvas) document.exitPointerLock();
  clearInputState();
  duel.active = false;
  document.body.classList.remove('is-spawn-protected');
  if (dom.spawnShield) dom.spawnShield.hidden = true;
  lanCanEnter = false;
  pendingLanSpawn = null;
  lastPoseSentAt = 0;
  if (opponentGroup) opponentGroup.visible = false;
  clearLanOpponents();
  if (leaveRoom && lanRoom) {
    sendLan({ type: 'leave-room' });
    lanRoom = null;
    lanSelfSlot = '';
  }
}

function updateDuelHud() {
  const isBot = appMode === 'bot';
  const botSetting = BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal;
  dom.duelModeLabel.textContent = isBot ? '人机对战' : '局域网 5v5';
  dom.duelRoomLabel.textContent = isBot
    ? `${botSetting.label} BOT · ${getDuelMapConfig(activeDuelMap).label}`
    : `${getDuelMapConfig(activeDuelMap).label} · 房间 ${duel.roomCode || lanRoom?.code || '----'}`;
  dom.duelScore.textContent = String(duel.kills);
  dom.duelHealth.textContent = String(Math.round(duel.health));
  dom.duelHealthMeter.value = duel.health;
  dom.duelEnemyName.textContent = duel.enemyName || (isBot ? 'BOT' : '对手');
  dom.duelEnemyScore.textContent = String(duel.enemyKills);
  dom.duelEnemyHealth.textContent = String(Math.round(duel.enemyHealth));
  dom.duelEnemyMeter.value = duel.enemyHealth;
}

function getBotDisplayName() {
  const setting = BOT_SETTINGS[botDifficulty] || BOT_SETTINGS.normal;
  return `${setting.label} BOT`;
}

function pushDuelFeed(message) {
  dom.duelFeed.textContent = message;
  dom.duelFeed.hidden = false;
  window.clearTimeout(feedTimer);
  feedTimer = window.setTimeout(() => {
    if (state === 'running') dom.duelFeed.hidden = true;
  }, 1600);
}

function addKillFeedEntry(killer, victim, headshot = false) {
  if (!dom.killFeed || !dom.killFeedItems) return;
  const entry = {
    id: `${performance.now()}-${Math.random()}`,
    killer: String(killer || '玩家'),
    victim: String(victim || '对手'),
    headshot: Boolean(headshot)
  };
  killFeedEntries.unshift(entry);
  killFeedEntries.splice(5);
  dom.killFeedItems.replaceChildren();
  killFeedEntries.forEach((item) => {
    const row = document.createElement('div');
    row.className = `kill-feed-row${item.headshot ? ' headshot' : ''}`;
    const killerName = document.createElement('strong');
    killerName.textContent = item.killer;
    const marker = document.createElement('span');
    marker.className = 'kill-feed-marker';
    marker.innerHTML = `<i data-lucide="zap"></i><span>${item.headshot ? '爆头' : '击杀'}</span>`;
    const victimName = document.createElement('b');
    victimName.textContent = item.victim;
    row.append(killerName, marker, victimName);
    dom.killFeedItems.append(row);
  });
  dom.killFeed.hidden = false;
  createIcons({ icons: { Zap }, attrs: { 'aria-hidden': 'true' } });
  dom.killFeed.classList.remove('impact');
  void dom.killFeed.offsetWidth;
  dom.killFeed.classList.add('impact');
  document.body.classList.remove('kill-impact');
  void document.body.offsetWidth;
  document.body.classList.add('kill-impact');
  window.clearTimeout(killFeedTimer);
  window.clearTimeout(killImpactTimer);
  killImpactTimer = window.setTimeout(() => document.body.classList.remove('kill-impact'), 300);
  killFeedTimer = window.setTimeout(() => {
    killFeedEntries.splice(0, killFeedEntries.length);
    dom.killFeed.hidden = true;
  }, 5200);
}

function clearKillFeed() {
  killFeedEntries.splice(0, killFeedEntries.length);
  window.clearTimeout(killFeedTimer);
  window.clearTimeout(killImpactTimer);
  document.body.classList.remove('kill-impact');
  if (dom.killFeedItems) dom.killFeedItems.replaceChildren();
  if (dom.killFeed) dom.killFeed.hidden = true;
}

function updateSpawnProtectionUi(now = performance.now()) {
  const active = isDuelMode() && duel.active && duel.health > 0 && now < duel.protectedUntil && now >= duel.icecreamUntil;
  document.body.classList.toggle('is-spawn-protected', active);
  if (dom.spawnShield) {
    dom.spawnShield.hidden = !active;
    if (active) {
      const remaining = Math.max(0, Math.ceil((duel.protectedUntil - now) / 1000));
      const label = dom.spawnShield.querySelector('span');
      if (label) label.textContent = `复活保护 ${remaining}s`;
    }
  }
}

function activateLanOpponentIcecream(playerId, durationMs = ICECREAM_INVULN_MS) {
  const avatar = lanOpponents.get(playerId);
  if (!avatar) return;
  const now = performance.now();
  avatar.state.icecreamUntil = Math.max(avatar.state.icecreamUntil || 0, now + durationMs);
  avatar.state.icecreamEatUntil = now + ICECREAM_ANIMATION_MS;
  avatar.icecream.visible = true;
}

function getPostureMetrics(crouch = false) {
  return crouch
    ? { eyeHeight: CROUCH_CAMERA_HEIGHT, bodyStart: 0.22, bodyEnd: 1.03, bodyRadius: 0.46, headY: 1.18, headRadius: 0.25 }
    : { eyeHeight: CAMERA_HEIGHT, bodyStart: 0.28, bodyEnd: 1.48, bodyRadius: 0.42, headY: 1.68, headRadius: 0.28 };
}

function setOpponentPose(pose, snap = false) {
  if (!opponentGroup || !pose?.position) return;
  opponentGroup.visible = true;
  const now = performance.now();
  const metrics = getPostureMetrics(Boolean(pose.crouch));
  opponentLerpPosition.set(pose.position.x, pose.position.y - metrics.eyeHeight, pose.position.z);
  const hadPose = opponentPoseState.lastAt > 0;
  const elapsed = Math.max(0.016, (now - (opponentPoseState.lastAt || now)) / 1000);
  const measuredSpeed = hadPose
    ? Math.hypot(opponentLerpPosition.x - opponentPoseState.lastX, opponentLerpPosition.z - opponentPoseState.lastZ) / elapsed
    : 0;

  if (snap) opponentGroup.position.copy(opponentLerpPosition);
  opponentPoseState.crouch = Boolean(pose.crouch);
  opponentPoseState.airborne = Boolean(pose.airborne) || opponentLerpPosition.y > 0.05;
  opponentPoseState.moving = Boolean(pose.moving) || measuredSpeed > 0.08;
  opponentPoseState.ads = Boolean(pose.ads);
  opponentPoseState.weapon = pose.weapon || 'ak';
  opponentPoseState.speed = THREE.MathUtils.damp(
    opponentPoseState.speed,
    Number.isFinite(pose.speed) ? Math.max(0, pose.speed) : measuredSpeed,
    10,
    elapsed
  );
  opponentPoseState.lastX = opponentLerpPosition.x;
  opponentPoseState.lastZ = opponentLerpPosition.z;
  opponentPoseState.lastAt = now;
  opponentGroup.rotation.y = pose.yaw || 0;
  if (opponentBody.material.emissive) opponentBody.material.emissive.set(pose.ads ? '#321a22' : '#000000');
  opponentBody.material.emissiveIntensity = pose.ads ? 0.22 : 0;
  updateNameplate(opponentParts.nameplate, { name: getBotDisplayName(), team: 'blue', health: bot.health });
}

function animateOpponent(delta) {
  if (opponentGroup?.visible) {
    opponentGroup.position.lerp(opponentLerpPosition, 1 - Math.exp(-16 * delta));
    animateOpponentRig(delta);
  }
  lanOpponents.forEach((avatar) => animateLanOpponent(avatar, delta));
}

function animateOpponentRig(delta) {
  if (!opponentParts.rig) return;
  const crouch = THREE.MathUtils.damp(opponentPoseState.crouchBlend, opponentPoseState.crouch ? 1 : 0, 13, delta);
  opponentPoseState.crouchBlend = crouch;
  const speedRatio = THREE.MathUtils.clamp(opponentPoseState.speed / MOVE_SPEED, 0, 1.15);
  const groundedWalk = opponentPoseState.moving && !opponentPoseState.airborne ? speedRatio : 0;
  opponentPoseState.walkTime += delta * (5.5 + groundedWalk * 6.5);
  const stride = Math.sin(opponentPoseState.walkTime) * 0.46 * groundedWalk;
  const counter = Math.cos(opponentPoseState.walkTime) * 0.12 * groundedWalk;
  const crouchDrop = crouch * 0.38;
  const crouchLean = crouch * 0.18;
  const adsLift = opponentPoseState.ads ? 0.1 : 0;
  if (opponentParts.shield) {
    const shieldActive = appMode === 'bot' && performance.now() < bot.protectedUntil;
    opponentParts.shield.visible = shieldActive;
    if (shieldActive) {
      opponentParts.shield.rotation.y += delta * 0.85;
      opponentParts.shield.material.opacity = 0.2 + Math.sin(performance.now() * 0.012) * 0.06;
    }
  }

  opponentBody.position.y = 1.04 - crouchDrop;
  opponentBody.scale.set(1 + crouch * 0.05, 1 - crouch * 0.22, 1 + crouch * 0.04);
  opponentBody.rotation.x = crouchLean + counter * 0.12;
  opponentHead.position.y = 1.64 - crouchDrop * 0.88;
  opponentHead.rotation.x = crouchLean * 0.4;
  opponentParts.hair.position.y = 1.72 - crouchDrop * 0.88;
  opponentParts.faceMark.position.y = 1.62 - crouchDrop * 0.88;
  opponentParts.neck.position.y = 1.43 - crouchDrop * 0.9;
  opponentParts.vest.position.y = 1.04 - crouchDrop;
  opponentParts.vest.rotation.x = 0.04 + crouchLean;
  opponentParts.pelvis.position.y = 0.58 - crouchDrop * 0.78;
  opponentParts.shoulder.position.y = 1.27 - crouchDrop;

  opponentParts.leftUpperArm.position.y = 1.13 - crouchDrop;
  opponentParts.rightUpperArm.position.y = 1.13 - crouchDrop;
  opponentParts.leftForearm.position.y = 0.97 - crouchDrop + adsLift;
  opponentParts.rightForearm.position.y = 0.97 - crouchDrop + adsLift;
  opponentParts.leftUpperArm.rotation.set(0.14 - stride * 0.28, 0, -0.24);
  opponentParts.rightUpperArm.rotation.set(0.14 + stride * 0.28, 0, 0.24);
  opponentParts.leftForearm.rotation.set(Math.PI / 2.7 - adsLift * 0.5, 0, -0.72 - stride * 0.12);
  opponentParts.rightForearm.rotation.set(Math.PI / 2.7 - adsLift * 0.5, 0, 0.72 + stride * 0.12);

  opponentParts.leftThigh.position.y = 0.33 - crouchDrop * 0.42;
  opponentParts.rightThigh.position.y = 0.33 - crouchDrop * 0.42;
  opponentParts.leftShin.position.y = 0.05 - crouchDrop * 0.16;
  opponentParts.rightShin.position.y = 0.05 - crouchDrop * 0.16;
  opponentParts.leftFoot.position.y = -0.19;
  opponentParts.rightFoot.position.y = -0.19;
  opponentParts.leftThigh.rotation.set(0.04 + stride + crouch * 0.44, 0, 0.04);
  opponentParts.rightThigh.rotation.set(0.04 - stride + crouch * 0.44, 0, -0.04);
  opponentParts.leftShin.rotation.set(0.02 - stride * 0.65 - crouch * 0.58, 0, 0.02);
  opponentParts.rightShin.rotation.set(0.02 + stride * 0.65 - crouch * 0.58, 0, -0.02);
  opponentParts.leftFoot.rotation.x = Math.max(0, -stride) * 0.3;
  opponentParts.rightFoot.rotation.x = Math.max(0, stride) * 0.3;

  opponentParts.rifle.position.y = 1.02 - crouchDrop + adsLift;
  opponentParts.rifle.rotation.x = -0.04 - adsLift * 0.85 + crouchLean * 0.4;
  if (opponentParts.nameplate?.sprite) opponentParts.nameplate.sprite.position.y = 2.28 - crouchDrop * 0.92;
}

function syncLanOpponents(players = []) {
  if (state !== 'running') {
    lanOpponents.forEach((avatar) => { avatar.group.visible = false; });
    return;
  }
  const seen = new Set();
  players.forEach((player) => {
    if (!player?.id || player.id === lanSelfId) return;
    seen.add(player.id);
    if (player.alive === false || !player.pose?.position) {
      const avatar = lanOpponents.get(player.id);
      if (avatar) avatar.group.visible = false;
      return;
    }
    setLanOpponentPose(player);
  });

  lanOpponents.forEach((avatar, id) => {
    if (!seen.has(id)) removeLanOpponent(id);
  });
}

function setLanOpponentPose(player, snap = false) {
  const pose = player.pose;
  if (!pose?.position) return;
  const avatar = lanOpponents.get(player.id) || createLanOpponentAvatar(player);
  const now = performance.now();
  const metrics = getPostureMetrics(Boolean(pose.crouch));
  avatar.name = player.name || avatar.name;
  avatar.team = getPlayerTeam(player);
  avatar.health = player.health ?? avatar.health ?? DUEL_PLAYER_HEALTH;
  avatar.state.spawnProtectedUntil = player.spawnProtected ? Math.max(avatar.state.spawnProtectedUntil || 0, now + SPAWN_PROTECTION_MS) : 0;
  if (player.icecreamProtected) {
    if (!(avatar.state.icecreamUntil > now)) avatar.state.icecreamEatUntil = now + ICECREAM_ANIMATION_MS;
    avatar.state.icecreamUntil = Math.max(avatar.state.icecreamUntil || 0, now + ICECREAM_INVULN_MS);
  } else {
    avatar.state.icecreamUntil = 0;
    avatar.state.icecreamEatUntil = 0;
  }
  avatar.body.userData.playerName = avatar.name;
  avatar.head.userData.playerName = avatar.name;
  updateNameplate(avatar.nameplate, {
    name: avatar.name,
    team: avatar.team,
    health: avatar.health
  });
  avatar.group.visible = true;
  avatar.targetPosition.set(pose.position.x, pose.position.y - metrics.eyeHeight, pose.position.z);

  const hadPose = avatar.state.lastAt > 0;
  const elapsed = Math.max(0.016, (now - (avatar.state.lastAt || now)) / 1000);
  const measuredSpeed = hadPose
    ? Math.hypot(avatar.targetPosition.x - avatar.state.lastX, avatar.targetPosition.z - avatar.state.lastZ) / elapsed
    : 0;

  if (snap || !hadPose) avatar.group.position.copy(avatar.targetPosition);
  avatar.group.rotation.y = pose.yaw || 0;
  avatar.state.crouch = Boolean(pose.crouch);
  avatar.state.airborne = Boolean(pose.airborne) || avatar.targetPosition.y > 0.05;
  avatar.state.moving = Boolean(pose.moving) || measuredSpeed > 0.08;
  avatar.state.ads = Boolean(pose.ads);
  avatar.state.speed = THREE.MathUtils.damp(
    avatar.state.speed,
    Number.isFinite(pose.speed) ? Math.max(0, pose.speed) : measuredSpeed,
    10,
    elapsed
  );
  avatar.state.lastX = avatar.targetPosition.x;
  avatar.state.lastZ = avatar.targetPosition.z;
  avatar.state.lastAt = now;

  if (avatar.body.material.emissive) avatar.body.material.emissive.set(pose.ads ? '#321a22' : '#000000');
  avatar.body.material.emissiveIntensity = pose.ads ? 0.22 : 0;
}

function animateLanOpponent(avatar, delta) {
  if (!avatar?.group.visible) return;
  avatar.group.position.lerp(avatar.targetPosition, 1 - Math.exp(-16 * delta));
  animateLanOpponentRig(avatar, delta);
}

function animateLanOpponentRig(avatar, delta) {
  const parts = avatar.parts;
  const state = avatar.state;
  const crouch = THREE.MathUtils.damp(state.crouchBlend, state.crouch ? 1 : 0, 13, delta);
  state.crouchBlend = crouch;
  const speedRatio = THREE.MathUtils.clamp(state.speed / MOVE_SPEED, 0, 1.15);
  const groundedWalk = state.moving && !state.airborne ? speedRatio : 0;
  state.walkTime += delta * (5.5 + groundedWalk * 6.5);
  const stride = Math.sin(state.walkTime) * 0.46 * groundedWalk;
  const counter = Math.cos(state.walkTime) * 0.12 * groundedWalk;
  const crouchDrop = crouch * 0.38;
  const crouchLean = crouch * 0.18;
  const adsLift = state.ads ? 0.1 : 0;
  const now = performance.now();
  const spawnProtected = now < (state.spawnProtectedUntil || 0);
  const icecreamProtected = now < (state.icecreamUntil || 0);
  if (avatar.shield) {
    avatar.shield.visible = spawnProtected || icecreamProtected;
    if (avatar.shield.visible) {
      avatar.shield.material.color.set(icecreamProtected ? '#95f0ff' : '#ffbd5a');
      avatar.shield.material.opacity = 0.2 + Math.sin(now * 0.012) * 0.06;
      avatar.shield.rotation.y += delta * 0.85;
    }
  }
  if (avatar.icecream) {
    avatar.icecream.visible = now < (state.icecreamEatUntil || 0);
    if (avatar.icecream.visible) {
      const remaining = Math.max(0, state.icecreamEatUntil - now);
      avatar.icecream.position.y = 1.05 + Math.sin(remaining * 0.018) * 0.04;
      avatar.icecream.rotation.z = 0.16 + Math.sin(remaining * 0.012) * 0.12;
    }
  }

  parts.body.position.y = 1.04 - crouchDrop;
  parts.body.scale.set(1 + crouch * 0.05, 1 - crouch * 0.22, 1 + crouch * 0.04);
  parts.body.rotation.x = crouchLean + counter * 0.12;
  parts.head.position.y = 1.64 - crouchDrop * 0.88;
  parts.hair.position.y = 1.72 - crouchDrop * 0.88;
  parts.vest.position.y = 1.04 - crouchDrop;
  parts.pelvis.position.y = 0.58 - crouchDrop * 0.78;
  parts.shoulder.position.y = 1.27 - crouchDrop;

  parts.leftUpperArm.position.y = 1.13 - crouchDrop;
  parts.rightUpperArm.position.y = 1.13 - crouchDrop;
  parts.leftForearm.position.y = 0.97 - crouchDrop + adsLift;
  parts.rightForearm.position.y = 0.97 - crouchDrop + adsLift;
  parts.leftUpperArm.rotation.set(0.14 - stride * 0.28, 0, -0.24);
  parts.rightUpperArm.rotation.set(0.14 + stride * 0.28, 0, 0.24);
  parts.leftForearm.rotation.set(Math.PI / 2.7 - adsLift * 0.5, 0, -0.72 - stride * 0.12);
  parts.rightForearm.rotation.set(Math.PI / 2.7 - adsLift * 0.5, 0, 0.72 + stride * 0.12);

  parts.leftThigh.position.y = 0.33 - crouchDrop * 0.42;
  parts.rightThigh.position.y = 0.33 - crouchDrop * 0.42;
  parts.leftShin.position.y = 0.05 - crouchDrop * 0.16;
  parts.rightShin.position.y = 0.05 - crouchDrop * 0.16;
  parts.leftThigh.rotation.set(0.04 + stride + crouch * 0.44, 0, 0.04);
  parts.rightThigh.rotation.set(0.04 - stride + crouch * 0.44, 0, -0.04);
  parts.leftShin.rotation.set(0.02 - stride * 0.65 - crouch * 0.58, 0, 0.02);
  parts.rightShin.rotation.set(0.02 + stride * 0.65 - crouch * 0.58, 0, -0.02);
  parts.leftFoot.rotation.x = Math.max(0, -stride) * 0.3;
  parts.rightFoot.rotation.x = Math.max(0, stride) * 0.3;

  parts.rifle.position.y = 1.02 - crouchDrop + adsLift;
  parts.rifle.rotation.x = -0.04 - adsLift * 0.85 + crouchLean * 0.4;
  if (avatar.nameplate?.sprite) avatar.nameplate.sprite.position.y = 2.28 - crouchDrop * 0.92;
}

function removeLanOpponent(id) {
  const avatar = lanOpponents.get(id);
  if (!avatar) return;
  scene.remove(avatar.group);
  disposeObject3D(avatar.group);
  lanOpponents.delete(id);
}

function clearLanOpponents() {
  Array.from(lanOpponents.keys()).forEach(removeLanOpponent);
}

function disposeObject3D(object) {
  object.traverse((child) => {
    if (!child.isMesh && !child.isSprite) return;
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        material?.map?.dispose?.();
        material?.dispose?.();
      });
    } else {
      child.material?.map?.dispose?.();
      child.material?.dispose?.();
    }
  });
}

function connectLan() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (isVercelDeployment && !configuredDuelWsUrl) {
    showRealtimeConfigNotice();
    pendingLanAction = null;
    return;
  }

  ws = new WebSocket(getDuelWsUrl());
  dom.lanStatus.textContent = '正在连接局域网对战服务...';

  ws.addEventListener('open', () => {
    lanConnected = true;
    dom.lanStatus.textContent = '已连接局域网对战服务。';
    if (dom.roomConnectionLabel) dom.roomConnectionLabel.textContent = '已连接';
    requestLanRoomList();
    syncLanUi();
    if (pendingLanAction) {
      const action = pendingLanAction;
      pendingLanAction = null;
      action();
    }
  });
  ws.addEventListener('message', (event) => handleLanMessage(event.data));
  ws.addEventListener('close', () => {
    lanConnected = false;
    lanCanEnter = false;
    if (dom.roomConnectionLabel) dom.roomConnectionLabel.textContent = '已断开';
    dom.lanStatus.textContent = '局域网连接已断开，重新打开 LAN 模块会自动连接。';
    syncLanUi();
    if (appMode === 'lan' && state === 'running') finishDuel(false, '断开', '局域网连接已断开。');
  });
  ws.addEventListener('error', () => {
    if (dom.roomConnectionLabel) dom.roomConnectionLabel.textContent = '连接失败';
    dom.lanStatus.textContent = '无法连接局域网服务。请用 pnpm run lan 或 pnpm run dev 启动项目。';
  });
}

function showRealtimeConfigNotice() {
  lanConnected = false;
  if (dom.roomConnectionLabel) dom.roomConnectionLabel.textContent = '未配置';
  if (dom.lanStatus) dom.lanStatus.textContent = '房间大厅需要配置 VITE_DUEL_WS_URL。Vercel 前端已上线，请先部署实时服务。';
  syncLanUi();
}

function getDuelWsUrl() {
  if (configuredDuelWsUrl) return configuredDuelWsUrl;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/duel-ws`;
}

function startRoomListPolling() {
  stopRoomListPolling();
  requestLanRoomList();
  roomListTimer = window.setInterval(requestLanRoomList, 5000);
}

function stopRoomListPolling() {
  if (roomListTimer) window.clearInterval(roomListTimer);
  roomListTimer = 0;
}

function requestLanRoomList() {
  if (isVercelDeployment && !configuredDuelWsUrl) {
    showRealtimeConfigNotice();
    return;
  }
  if (ws?.readyState === WebSocket.OPEN) {
    sendLan({ type: 'list-rooms' });
  } else {
    connectLan();
  }
}

function handleLanMessage(payload) {
  let message = null;
  try {
    message = JSON.parse(payload);
  } catch {
    return;
  }

  if (message.type === 'server-info') {
    lanSelfId = message.id || lanSelfId;
    renderLanAddresses(message.addresses || []);
    requestLanRoomList();
    return;
  }
  if (message.type === 'room-list') {
    lanRoomList = Array.isArray(message.rooms) ? message.rooms : [];
    renderLanRoomList();
    return;
  }
  if (message.type === 'joined-room') {
    lanSelfId = message.selfId || lanSelfId;
    lanSelfSlot = message.slot || lanSelfSlot;
    if (message.map) applyRoomDuelMap(message.map);
    dom.roomCodeDisplay.textContent = message.roomCode || '----';
    dom.roomCodeInput.value = message.roomCode || '';
    dom.lanStatus.textContent = '已加入房间，等待玩家或人机。';
    return;
  }
  if (message.type === 'room-update' || message.type === 'match-start') {
    lanRoom = message.room;
    if (lanRoom?.map) applyRoomDuelMap(lanRoom.map);
    applyLanRoom(lanRoom);
    syncLanUi();
    if (lanRoom?.started) {
      lanCanEnter = true;
      dom.lanEnterButton.hidden = false;
      dom.lanStatus.textContent = '对局已开始，点击进入对枪。';
    }
    return;
  }
  if (message.type === 'spawn') {
    pendingLanSpawn = message;
    if (message.map) applyRoomDuelMap(message.map);
    if (appMode === 'lan' && state === 'running') {
      placeLocalPlayer({ position: vectorFromPayload(message.position), yaw: message.yaw || 0 });
      duel.health = message.health || DUEL_PLAYER_HEALTH;
      duel.protectedUntil = performance.now() + Number(message.protectionMs || SPAWN_PROTECTION_MS);
      pushDuelFeed('你已复活，1 秒保护。');
      updateDuelHud();
    }
    return;
  }
  if (message.type === 'snapshot') {
    if (message.map) applyRoomDuelMap(message.map);
    applyLanSnapshot(message);
    return;
  }
  if (message.type === 'shot') {
    spawnRemoteShot(message);
    return;
  }
  if (message.type === 'hit-confirm') {
    duel.enemyHealth = message.health;
    flashCrosshair('hit');
    showHitMarker(Boolean(message.headshot));
    playHitSound(Boolean(message.headshot));
    pushDuelFeed(message.headshot ? `爆头命中 ${message.victimName || '敌人'}。` : `命中 ${message.victimName || '敌人'}。`);
    updateDuelHud();
    return;
  }
  if (message.type === 'icecream-used') {
    const durationMs = Number(message.durationMs) || ICECREAM_INVULN_MS;
    const cooldownMs = Number(message.cooldownMs) || ICECREAM_COOLDOWN_MS;
    if (!message.playerId || message.playerId === lanSelfId) {
      activateIcecream(performance.now(), durationMs, cooldownMs, { announce: true, animate: true, sound: true });
    } else {
      activateLanOpponentIcecream(message.playerId, durationMs);
      pushDuelFeed(`${message.playerName || '敌人'} 吃下巧乐兹。`);
    }
    return;
  }
  if (message.type === 'icecream-denied') {
    const now = performance.now();
    duel.icecreamPending = false;
    duel.icecreamPendingUntil = 0;
    duel.icecreamCooldownUntil = Math.max(duel.icecreamCooldownUntil, now + Number(message.remainingMs || 0));
    pushDuelFeed(`巧乐兹冷却中：${Math.ceil(Number(message.remainingMs || 0) / 1000)} 秒。`);
    updateIcecreamUi(now);
    return;
  }
  if (message.type === 'icecream-blocked') {
    showIcecreamBlockFeedback(performance.now());
    return;
  }
  if (message.type === 'damage') {
    duel.health = message.health;
    if (duel.health <= 0) clearInputState();
    showDamageVignette(Boolean(message.headshot));
    playDamageSound(Boolean(message.headshot));
    pushDuelFeed(message.headshot ? `${message.attackerName || '敌人'} 爆头命中你。` : `${message.attackerName || '敌人'} 命中你。`);
    if (duel.health <= 0) {
      showDeathFlash();
      playDeathSound();
    }
    updateDuelHud();
    return;
  }
  if (message.type === 'kill') {
    addKillFeedEntry(message.killerName, message.victimName, Boolean(message.headshot));
    if (message.killerId === lanSelfId) {
      showKillFeedback({ headshot: Boolean(message.headshot), label: message.headshot ? '爆头击杀' : '击杀' });
    }
    pushDuelFeed(`${message.killerName} 击杀 ${message.victimName}`);
    return;
  }
  if (message.type === 'respawn') {
    pushDuelFeed(`${message.playerName} 已复活。`);
    return;
  }
  if (message.type === 'match-over') {
    lanRoom = message.room || lanRoom;
    const selfTeam = getPlayerTeam(lanSelfSlot || duel.selfSlot);
    const won = message.winnerTeam ? message.winnerTeam === selfTeam : message.winnerId === lanSelfId;
    finishDuel(won, won ? '胜利' : '落败', won ? '我方赢下了这轮局域网对枪。' : '敌方赢下了这轮局域网对枪。');
    syncLanUi();
    return;
  }
  if (message.type === 'match-event') {
    dom.lanStatus.textContent = message.message;
    if (state === 'running') pushDuelFeed(message.message);
    return;
  }
  if (message.type === 'error') {
    dom.lanStatus.textContent = message.message || '局域网服务返回错误。';
  }
}

function createLanRoom() {
  localPlayerName = sanitizePlayerName(dom.playerName.value);
  sendLanWhenReady({ type: 'create-room', name: localPlayerName, map: getDuelMapId(activeDuelMap) });
}

function joinLanRoom() {
  localPlayerName = sanitizePlayerName(dom.playerName.value);
  const roomCode = dom.roomCodeInput.value.trim().toUpperCase();
  if (!roomCode) {
    dom.lanStatus.textContent = '先输入房间码。';
    return;
  }
  sendLanWhenReady({ type: 'join-room', name: localPlayerName, roomCode });
}

function joinLanRoomByCode(roomCode) {
  dom.roomCodeInput.value = String(roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  joinLanRoom();
}

function toggleLanReady() {
  const self = lanRoom?.players?.find((player) => player.id === lanSelfId);
  sendLan({ type: self?.ready ? 'unready' : 'ready' });
}

function addLanBot() {
  sendLan({ type: 'add-bot' });
}

function leaveLanRoom() {
  sendLan({ type: 'leave-room' });
  lanRoom = null;
  lanCanEnter = false;
  pendingLanSpawn = null;
  clearLanOpponents();
  dom.roomCodeDisplay.textContent = '----';
  dom.roomPlayers.textContent = '尚未加入房间';
  dom.lanStatus.textContent = '已离开房间。';
  requestLanRoomList();
  syncLanUi();
  syncDuelMapUi();
}

function sendLanWhenReady(message) {
  if (ws?.readyState === WebSocket.OPEN) {
    sendLan(message);
    return;
  }
  pendingLanAction = () => sendLan(message);
  connectLan();
}

function sendLan(message) {
  if (ws?.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(message));
}

function updateLanDuel(now) {
  if (!duel.active || !lanRoom?.started) return;
  if (now - lastPoseSentAt >= DUEL_POSE_INTERVAL) {
    sendPose();
    lastPoseSentAt = now;
  }
  updateDuelHud();
}

function sendPose() {
  if (appMode !== 'lan' || !duel.active || duel.health <= 0) return;
  sendLan({
    type: 'pose',
    position: vectorPayload(getLocalPosePosition()),
    yaw,
    pitch,
    ads: adsBlend > 0.55,
    weapon: equippedSlot === 'primary' ? selectedPrimaryWeapon : 'knife',
    crouch: playerCrouching,
    airborne: isPlayerAirborne(),
    moving: localHorizontalSpeed > 0.1,
    speed: localHorizontalSpeed
  });
}

function applyLanRoom(room) {
  if (!room) return;
  const players = room.players || [];
  const self = players.find((player) => player.id === lanSelfId);
  const selfTeam = getPlayerTeam(self || lanSelfSlot || duel.selfSlot);
  const enemyTeam = selfTeam === 'blue' ? 'red' : 'blue';
  const enemies = players.filter((player) => player.id !== lanSelfId && getPlayerTeam(player) === enemyTeam);
  const aliveEnemies = enemies.filter((player) => player.alive !== false);
  const teamKills = room.teamKills || aggregateTeamKills(players);

  if (self) {
    duel.selfSlot = self.slot || duel.selfSlot;
    lanSelfSlot = self.slot || lanSelfSlot;
    duel.health = self.health ?? duel.health;
    duel.deaths = self.deaths ?? duel.deaths;
  }
  duel.kills = teamKills[selfTeam] || 0;
  duel.enemyKills = teamKills[enemyTeam] || 0;
  duel.enemyDeaths = enemies.reduce((total, player) => total + (player.deaths || 0), 0);
  duel.enemyName = enemies.length ? `敌方 ${aliveEnemies.length}/${enemies.length}` : '等待敌方';
  duel.enemyHealth = aliveEnemies.length
    ? aliveEnemies.reduce((total, player) => total + (player.health ?? DUEL_PLAYER_HEALTH), 0) / aliveEnemies.length
    : 0;
  duel.enemyAlive = aliveEnemies.length > 0;
  syncLanOpponents(players);
  updateDuelHud();
}

function applyLanSnapshot(snapshot) {
  const players = snapshot?.players || [];
  if (appMode !== 'lan' || !players.length) return;
  lanRoom = lanRoom
    ? { ...lanRoom, players, teamKills: snapshot.teamKills || lanRoom.teamKills, map: snapshot.map || lanRoom.map }
    : { code: duel.roomCode, started: true, players, teamKills: snapshot.teamKills || { red: 0, blue: 0 }, map: snapshot.map || getDuelMapId(activeDuelMap) };
  applyLanRoom(lanRoom);
}

function aggregateTeamKills(players = []) {
  return players.reduce((scores, player) => {
    const team = getPlayerTeam(player);
    scores[team] += player.kills || 0;
    return scores;
  }, { red: 0, blue: 0 });
}

function syncLanUi() {
  const inRoom = Boolean(lanRoom);
  const players = lanRoom?.players || [];
  const roomFull = players.length >= (lanRoom?.maxPlayers || 10);
  const isHost = inRoom && lanRoom?.hostId === lanSelfId;
  syncDuelMapUi();
  dom.createRoomButton.disabled = !lanConnected || inRoom;
  dom.joinRoomButton.disabled = !lanConnected || inRoom;
  dom.addBotButton.disabled = !lanConnected || !isHost || lanRoom?.started || roomFull;
  dom.readyButton.disabled = !inRoom || lanRoom?.started;
  dom.leaveRoomButton.disabled = !inRoom;
  dom.lanEnterButton.hidden = !lanCanEnter;
  renderRoomInvites();

  const self = players.find((player) => player.id === lanSelfId);
  dom.readyButton.textContent = self?.ready ? '取消准备' : '准备';
  dom.roomCodeDisplay.textContent = lanRoom?.code || '----';
  if (dom.roomConnectionLabel) {
    dom.roomConnectionLabel.textContent = isVercelDeployment && !configuredDuelWsUrl
      ? '未配置'
      : lanConnected ? '已连接' : '离线';
  }
  if (dom.roomStationState) dom.roomStationState.textContent = lanRoom ? `房间 ${lanRoom.code}` : '未加入房间';
  if (dom.roomRosterCount) dom.roomRosterCount.textContent = `${players.length} / ${lanRoom?.maxPlayers || 10}`;
  if (!players.length) {
    dom.roomPlayers.textContent = '尚未加入房间';
    return;
  }

  dom.roomPlayers.replaceChildren();
  players.slice().sort(compareRoomPlayers).forEach((player) => {
    const team = getPlayerTeam(player);
    const row = document.createElement('div');
    const name = document.createElement('span');
    const status = document.createElement('strong');
    row.classList.add(team === 'blue' ? 'blue-team' : 'red-team');
    row.classList.toggle('is-bot', Boolean(player.isBot));
    name.textContent = `${teamLabel(team)} ${slotNumber(player.slot)} · ${player.name}${player.id === lanSelfId ? '（你）' : ''}${player.id === lanRoom.hostId ? ' 房主' : ''}`;
    status.textContent = lanRoom.started ? `${player.kills}:${player.deaths}` : (player.isBot ? '已就位' : (player.ready ? '已准备' : '未准备'));
    row.append(name, status);
    dom.roomPlayers.append(row);
  });
}

function compareRoomPlayers(a, b) {
  const teamOrder = getPlayerTeam(a) === getPlayerTeam(b) ? 0 : (getPlayerTeam(a) === 'red' ? -1 : 1);
  if (teamOrder) return teamOrder;
  return slotNumber(a.slot) - slotNumber(b.slot);
}

function slotNumber(slot) {
  return Number(String(slot || '').match(/\d+/)?.[0]) || 1;
}

function renderLanAddresses(addresses) {
  dom.lanAddresses.replaceChildren();
  if (!addresses.length) {
    dom.lanAddresses.textContent = '未检测到局域网地址。';
    return;
  }
  addresses.forEach((address) => {
    const item = document.createElement('div');
    item.textContent = address;
    dom.lanAddresses.append(item);
  });
}

function renderLanRoomList() {
  if (!dom.roomList) return;
  dom.roomList.replaceChildren();
  if (!lanRoomList.length) {
    const empty = document.createElement('div');
    empty.className = 'room-list-empty';
    const icon = document.createElement('i');
    icon.dataset.lucide = 'wifi';
    const title = document.createElement('strong');
    title.textContent = '暂时没有开放房间';
    const detail = document.createElement('span');
    detail.textContent = '创建第一个房间，等待其他玩家加入。';
    empty.append(icon, title, detail);
    dom.roomList.append(empty);
    createIcons({ icons: { Wifi }, attrs: { 'aria-hidden': 'true' } });
    return;
  }

  lanRoomList.forEach((room) => {
    const row = document.createElement('article');
    row.className = 'room-list-row';
    const identity = document.createElement('div');
    identity.className = 'room-list-identity';
    const code = document.createElement('strong');
    code.textContent = room.code;
    const host = document.createElement('span');
    host.textContent = `${room.hostName || '房主'} · ${room.mapLabel || room.map || '公园'}`;
    identity.append(code, host);
    const count = document.createElement('div');
    count.className = 'room-list-count';
    const countValue = document.createElement('strong');
    countValue.textContent = `${room.playerCount}/${room.maxPlayers}`;
    const countLabel = document.createElement('span');
    countLabel.textContent = `红 ${room.redCount} · 蓝 ${room.blueCount}`;
    count.append(countValue, countLabel);
    const join = document.createElement('button');
    join.className = 'room-join-action';
    join.type = 'button';
    join.dataset.joinRoom = room.code;
    join.title = `加入 ${room.code}`;
    join.innerHTML = '<i data-lucide="log-in"></i><span>加入</span>';
    row.append(identity, count, join);
    dom.roomList.append(row);
  });
  createIcons({ icons: { LogIn }, attrs: { 'aria-hidden': 'true' } });
}

function spawnRemoteShot(message) {
  const start = vectorFromPayload(message.start);
  const end = vectorFromPayload(message.end);
  spawnTracer(start, end, false);
}

function animateWeapon(delta, now) {
  if (!weaponGroup) return;
  weaponKick = THREE.MathUtils.damp(weaponKick, 0, 16, delta);

  if (equippedSlot === 'knife') {
    weaponGroup.position.copy(KNIFE_POSITION);
    weaponGroup.rotation.copy(KNIFE_ROTATION);

    if (now < knifeSpinUntil) {
      const progress = THREE.MathUtils.clamp((now - knifeSpinStartedAt) / KNIFE_SPIN_DURATION, 0, 1);
      const spin = 1 - Math.pow(1 - progress, 3);
      weaponGroup.rotation.z += spin * Math.PI * 2;
      weaponGroup.rotation.y += Math.sin(progress * Math.PI) * 0.56;
      weaponGroup.position.y += Math.sin(progress * Math.PI) * 0.12;
    }

    if (now < knifeSlashUntil) {
      const progress = 1 - (knifeSlashUntil - now) / KNIFE_SLASH_DURATION;
      const swing = Math.sin(THREE.MathUtils.clamp(progress, 0, 1) * Math.PI);
      weaponGroup.rotation.x -= swing * 0.72;
      weaponGroup.rotation.y += swing * 0.54;
      weaponGroup.position.x -= swing * 0.11;
      weaponGroup.position.z -= swing * 0.08;
    }
    applyWeaponSwitchMotion(now, 0.7);
    return;
  }

  const weapon = getPrimaryWeapon();
  const poseBlend = weapon.id === 'sniper' ? 0 : adsBlend;
  weaponGroup.position.lerpVectors(weapon.hipPosition, weapon.adsPosition, poseBlend);
  weaponGroup.position.y += weaponKick * THREE.MathUtils.lerp(0.022, 0.012, poseBlend);
  weaponGroup.position.z += weaponKick * THREE.MathUtils.lerp(0.1, 0.052, poseBlend);
  weaponGroup.rotation.set(
    THREE.MathUtils.lerp(weapon.hipRotation.x, weapon.adsRotation.x, poseBlend) - weaponKick * THREE.MathUtils.lerp(0.16, 0.08, poseBlend),
    THREE.MathUtils.lerp(weapon.hipRotation.y, weapon.adsRotation.y, poseBlend) + Math.sin(now * 0.022) * weaponKick * 0.02,
    THREE.MathUtils.lerp(weapon.hipRotation.z, weapon.adsRotation.z, poseBlend) + weaponKick * THREE.MathUtils.lerp(0.035, 0.014, poseBlend)
  );
  if (weapon.id === 'shotgun') applyShotgunSpinMotion(now, poseBlend);
  applyWeaponSwitchMotion(now, weapon.id === 'sniper' ? 1.08 : 1);
  if (weapon.id === 'ak' && adsBlend > 0.01) alignDetailedAkSightToCrosshair(adsBlend);
  if (muzzleFlash) {
    const flashLive = Math.max(0, muzzleFlashUntil - now) / 42;
    muzzleFlash.visible = flashLive > 0;
    muzzleFlash.material.opacity = flashLive * 0.95;
  }
  if (muzzleLight) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - delta * 75);
}

function alignDetailedAkSightToCrosshair(blend) {
  const ak = weaponModels.ak;
  if (!ak?.detailed || !ak.aimPoint || !camera || !weaponGroup) return;
  camera.updateMatrixWorld(true);
  weaponGroup.updateMatrixWorld(true);
  ak.aimPoint.getWorldPosition(akSightWorld);
  akSightCameraSpace.copy(akSightWorld);
  camera.worldToLocal(akSightCameraSpace);
  weaponGroup.position.x -= akSightCameraSpace.x * blend;
  weaponGroup.position.y -= akSightCameraSpace.y * blend;
}

function animateIcecream(now) {
  if (!icecreamGroup) return;
  if (now >= icecreamEatUntil || icecreamEatUntil <= icecreamEatStartedAt) {
    icecreamGroup.visible = false;
    return;
  }

  const progress = THREE.MathUtils.clamp((now - icecreamEatStartedAt) / ICECREAM_ANIMATION_MS, 0, 1);
  const bringUp = THREE.MathUtils.smootherstep(Math.min(progress / 0.42, 1), 0, 1);
  const pullBack = THREE.MathUtils.smootherstep(Math.max((progress - 0.62) / 0.38, 0), 0, 1);
  const hold = Math.sin(Math.min(1, Math.max(0, (progress - 0.28) / 0.44)) * Math.PI);
  const x = THREE.MathUtils.lerp(0.58, 0.08, bringUp);
  const y = THREE.MathUtils.lerp(-0.78, -0.2, bringUp) - pullBack * 0.52 + Math.sin(progress * Math.PI * 8) * 0.012 * hold;
  const z = THREE.MathUtils.lerp(-0.72, -0.48, bringUp) + pullBack * 0.08;
  icecreamGroup.visible = true;
  icecreamGroup.position.set(x, y, z);
  icecreamGroup.rotation.set(
    THREE.MathUtils.lerp(-0.34, -0.72, bringUp) + hold * 0.08,
    THREE.MathUtils.lerp(-0.28, 0.08, bringUp),
    THREE.MathUtils.lerp(-0.12, 0.34, bringUp) - pullBack * 0.26
  );
  icecreamGroup.scale.setScalar(0.96 + hold * 0.06);
}

function applyShotgunSpinMotion(now, poseBlend = 0) {
  if (now >= shotgunSpinUntil || shotgunSpinUntil <= shotgunSpinStartedAt) {
    resetShotgunPump();
    return;
  }
  const duration = shotgunSpinUntil - shotgunSpinStartedAt;
  const progress = THREE.MathUtils.clamp((now - shotgunSpinStartedAt) / duration, 0, 1);
  const spin = 1 - Math.pow(1 - progress, 3);
  const punch = Math.sin(progress * Math.PI);
  weaponGroup.rotation.x -= spin * Math.PI * 2;
  weaponGroup.rotation.y += punch * THREE.MathUtils.lerp(0.2, 0.08, poseBlend);
  weaponGroup.rotation.z += punch * THREE.MathUtils.lerp(0.16, 0.06, poseBlend);
  weaponGroup.position.x += punch * THREE.MathUtils.lerp(0.055, 0.025, poseBlend);
  weaponGroup.position.y += punch * THREE.MathUtils.lerp(0.045, 0.02, poseBlend);
  weaponGroup.position.z -= punch * THREE.MathUtils.lerp(0.06, 0.025, poseBlend);

  const shotgunModel = weaponModels.shotgun;
  if (shotgunModel?.pump) {
    shotgunModel.pump.position.z = SHOTGUN_PUMP_REST_Z + Math.sin(progress * Math.PI) * 0.18;
  }
}

function resetShotgunPump() {
  const shotgunModel = weaponModels.shotgun;
  if (shotgunModel?.pump) shotgunModel.pump.position.z = SHOTGUN_PUMP_REST_Z;
}

function applyWeaponSwitchMotion(now, scale = 1) {
  if (now >= weaponSwitchUntil || weaponSwitchUntil <= weaponSwitchStartedAt) return;
  const duration = weaponSwitchUntil - weaponSwitchStartedAt;
  const progress = THREE.MathUtils.clamp((now - weaponSwitchStartedAt) / duration, 0, 1);
  const raise = Math.pow(1 - progress, 3);
  const settle = Math.sin(progress * Math.PI);
  const motionScale = scale * weaponSwitchScale;
  weaponGroup.position.y -= raise * 0.34 * motionScale;
  weaponGroup.position.z += raise * 0.18 * motionScale;
  weaponGroup.rotation.x += raise * 0.38 * motionScale;
  weaponGroup.rotation.y += raise * 0.16 * motionScale;
  weaponGroup.rotation.z += settle * 0.035 * motionScale;
}

function updateTargetClock(now) {
  if (state !== 'running' || appMode !== 'range') return;
  const remaining = Math.max(0, 1 - (now - targetSpawnedAt) / TARGET_LIFETIME);
  dom.targetMeter.value = Math.round(remaining * 100);
  updateStats();
}

function spawnHitEffect(position, success) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.5, 48),
    new THREE.MeshBasicMaterial({
      color: success ? '#2ee6a6' : '#ffbd5a',
      transparent: true,
      opacity: success ? 0.85 : 0.62,
      side: THREE.DoubleSide
    })
  );
  mesh.position.copy(position);
  scene.add(mesh);
  addTransient({ mesh, kind: 'billboard', age: 0, life: success ? 0.42 : 0.34, opacity: mesh.material.opacity });
}

function spawnTracer(start, end, targetHit) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 0.01) return;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, length, 6, 1, true),
    new THREE.MeshBasicMaterial({
      color: targetHit ? '#2ee6a6' : '#ffbd5a',
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  scene.add(mesh);
  addTransient({ mesh, kind: 'tracer', age: 0, life: 0.16, opacity: mesh.material.opacity });
}

function spawnImpact(position, normal) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#ffbd5a', transparent: true, opacity: 0.72 })
  );
  mesh.position.copy(position);
  if (normal) mesh.position.addScaledVector(normal, 0.018);
  scene.add(mesh);
  addTransient({ mesh, kind: 'impact', age: 0, life: 1.1, opacity: mesh.material.opacity });
}

function addTransient(item) {
  transientObjects.push(item);
  while (transientObjects.length > 80) {
    const old = transientObjects.shift();
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    old.mesh.material.dispose();
  }
}

function scoreHit(reaction, streak) {
  const speedBonus = Math.max(0, 420 - reaction * 0.18);
  const streakBonus = Math.min(180, streak * 8);
  return Math.round(100 + speedBonus + streakBonus);
}

function updateStats() {
  const remaining = Math.max(0, (session.endsAt - performance.now()) / 1000);
  dom.timeLeft.textContent = remaining.toFixed(1);
  dom.score.textContent = String(session.score);
  dom.hits.textContent = String(session.hits);
  dom.accuracy.textContent = formatPercent(session.hits, session.shots);
  dom.reaction.textContent = session.hits ? formatMs(session.totalReaction / session.hits) : '--';
  dom.streak.textContent = String(session.streak);
}

function exposeDebugState() {
  window.__aimTrainerLocal = {
    getState() {
      return {
        appMode,
        mode: state,
        locked: document.pointerLockElement === dom.canvas,
        inputActive: hasGameInput(),
        mobileControls: mobileControlsEnabled(),
        duelMap: getDuelMapId(activeDuelMap),
        view: { yaw, pitch },
        position: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null,
        fov: camera?.fov || BASE_CAMERA_FOV,
        adsBlend,
        arena: {
          mode: isDuelMode() ? 'duel' : 'range',
          rangeVisible: Boolean(rangeArenaGroup?.visible),
          duelVisible: Boolean(duelArenaGroup?.visible),
          ringVisible: Boolean(ringArenaGroup?.visible),
          duelMeshCount: duelArenaMeshes.length,
          ringMeshCount: ringArenaMeshes.length,
          rangeMeshCount: rangeArenaMeshes.length
        },
        movement: {
          crouching: playerCrouching,
          crouchHeld,
          joystick: { x: mobileMoveVector.x, y: mobileMoveVector.y },
          airborne: isPlayerAirborne(),
          grounded: playerGrounded,
          eyeHeight: playerEyeHeight,
          verticalOffset: playerVerticalOffset,
          verticalVelocity: playerVerticalVelocity,
          horizontalSpeed: localHorizontalSpeed
        },
        spread: currentSpread(),
        weapon: {
          selectedPrimaryWeapon,
          equippedSlot,
          aimingDownSights,
          sniperScoped: isSniperScoped(),
          scopeVisible: dom.scopeOverlay ? !dom.scopeOverlay.hidden : false,
          switching: performance.now() < weaponSwitchUntil,
          shotgunSpinning: performance.now() < shotgunSpinUntil,
          modelVisible: Object.fromEntries(Object.entries(weaponModels).map(([id, model]) => [id, Boolean(model.group.visible)])),
          shotgunPumpZ: weaponModels.shotgun?.pump?.position?.z ?? null,
          scopedSensitivityScale: SNIPER_ADS_SENSITIVITY_SCALE
        },
        duel: { ...duel },
        session: { shots: session.shots, hits: session.hits, misses: session.misses },
        bot: {
          difficulty: botDifficulty,
          health: bot.health,
          kills: bot.kills,
          deaths: bot.deaths,
          alive: bot.alive,
          bulletsFired: bot.bulletsFired,
          nextMagicBulletIn: (BOT_SETTINGS[botDifficulty]?.magicEvery || 0)
            ? BOT_SETTINGS[botDifficulty].magicEvery - (bot.bulletsFired % BOT_SETTINGS[botDifficulty].magicEvery)
            : null
        },
        opponent: opponentGroup ? {
          visible: opponentGroup.visible,
          y: opponentGroup.position.y,
          speed: opponentPoseState.speed,
          moving: opponentPoseState.moving,
          crouchBlend: opponentPoseState.crouchBlend,
          hasRig: Boolean(opponentParts.rig)
        } : null,
        moveKeys: Array.from(moveKeys)
      };
    },
    collisionProbe(mapId, x, z, feetY = 0) {
      return resolveMapCollision(
        Number(x),
        Number(z),
        PLAYER_COLLISION_RADIUS,
        getDuelMapId(mapId),
        Number(feetY)
      );
    }
  };
}

function makeResult() {
  return {
    id: Date.now(),
    date: new Date().toISOString(),
    duration: session.duration,
    score: session.score,
    hits: session.hits,
    shots: session.shots,
    misses: session.misses,
    expired: session.expired,
    accuracy: session.shots ? session.hits / session.shots : 0,
    averageReaction: session.hits ? session.totalReaction / session.hits : 0,
    bestStreak: session.bestStreak
  };
}

function saveResult(result) {
  storage.recent = [result].concat(storage.recent || []).slice(0, 8);
  if (!storage.best || result.score > storage.best.score) storage.best = result;
  saveStorage();
}

function renderResult(result) {
  dom.resultScore.textContent = String(result.score);
  dom.resultHits.textContent = result.hits + ' / ' + result.shots;
  dom.resultAccuracy.textContent = Math.round(result.accuracy * 100) + '%';
  dom.resultReaction.textContent = result.averageReaction ? formatMs(result.averageReaction) : '--';
  dom.resultStreak.textContent = String(result.bestStreak);
  dom.resultExpired.textContent = String(result.expired);
  dom.resultBest.textContent = String(storage.best?.score || result.score);
  renderRecent();
}

function renderMenuStats() {
  const best = storage.best;
  const recent = storage.recent?.[0];
  dom.bestScore.textContent = best ? String(best.score) : '暂无';
  dom.bestAccuracy.textContent = recent ? Math.round(recent.accuracy * 100) + '%' : '--';
  dom.bestReaction.textContent = recent?.averageReaction ? formatMs(recent.averageReaction) : '--';
  renderRecent();
}

function renderRecent() {
  const items = storage.recent || [];
  dom.recentList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-recent';
    empty.textContent = '暂无训练记录';
    dom.recentList.append(empty);
    return;
  }
  items.slice(0, 5).forEach((item) => {
    const row = document.createElement('div');
    const meta = document.createElement('span');
    const score = document.createElement('strong');
    const date = new Date(item.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    meta.textContent = date + ' · ' + item.duration + 's';
    score.textContent = String(item.score);
    row.append(meta, score);
    dom.recentList.append(row);
  });
}

function resetHistory() {
  storage.best = null;
  storage.recent = [];
  saveStorage();
  renderMenuStats();
  dom.statusLine.textContent = '本地训练历史已清空。';
}

function syncSettingsUi() {
  dom.durationLabel.textContent = storage.settings.duration + ' 秒';
  document.querySelectorAll('[data-duration]').forEach((button) => {
    const selected = Number(button.dataset.duration) === storage.settings.duration;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  dom.sensitivity.value = String(storage.settings.sensitivity);
  dom.sensitivityLabel.textContent = storage.settings.sensitivity.toFixed(1);
  dom.crosshairSize.value = String(storage.settings.crosshair.size);
  dom.crosshairGap.value = String(storage.settings.crosshair.gap);
  dom.crosshairThickness.value = String(storage.settings.crosshair.thickness);
  dom.crosshairDot.textContent = storage.settings.crosshair.dot ? '中心点 开' : '中心点 关';
  dom.crosshairDot.setAttribute('aria-pressed', String(storage.settings.crosshair.dot));
  dom.crosshairSummary.textContent = crosshairColorName(storage.settings.crosshair.color) + ' · ' + storage.settings.crosshair.size;
  document.querySelectorAll('[data-crosshair-color]').forEach((button) => {
    const selected = button.dataset.crosshairColor === storage.settings.crosshair.color;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  applyCrosshairSettings();
  syncDuelMapUi();
  syncMobileControls();
}

function syncDuelMapUi() {
  const mapId = getDuelMapId(activeDuelMap);
  const label = getDuelMapConfig(mapId).label;
  if (dom.duelMapLabel) dom.duelMapLabel.textContent = label;
  if (dom.botMapLabel) dom.botMapLabel.textContent = label;
  document.querySelectorAll('[data-duel-map]').forEach((button) => {
    const selected = button.dataset.duelMap === mapId;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = appMode === 'lan' && Boolean(lanRoom);
  });
}

function setOverlay(name) {
  dom.modePanel.hidden = name !== 'mode';
  dom.startPanel.hidden = name !== 'start';
  dom.lanPanel.hidden = name !== 'lan';
  dom.botPanel.hidden = name !== 'bot';
  dom.pausePanel.hidden = name !== 'pause';
  dom.resultPanel.hidden = name !== 'result';
  dom.duelResultPanel.hidden = name !== 'duel-result';
  document.body.classList.toggle('has-panel', Boolean(name));
  document.body.classList.toggle('is-lobby', name === 'mode');
  document.body.classList.toggle('is-room-lobby', name === 'lan');
  syncMobileControls();
}

function resetView() {
  if (!camera) return;
  yaw = 0;
  pitch = 0;
  adsBlend = 0;
  aimingDownSights = false;
  walkPhase = 0;
  camera.position.set(0, CAMERA_HEIGHT, 7.5);
  resetPlayerMotion(CAMERA_HEIGHT);
  camera.fov = BASE_CAMERA_FOV;
  camera.updateProjectionMatrix();
  applyView();
  document.body.classList.remove('is-ads', 'is-scoped');
  updateWeaponModelVisibility();
  updateWeaponUi();
}

function applyView() {
  camera.rotation.set(pitch, yaw, 0);
}

function applyCrosshairSettings() {
  const crosshair = storage.settings.crosshair;
  dom.crosshair.style.setProperty('--crosshair-color', crosshair.color);
  dom.crosshair.style.setProperty('--crosshair-size', crosshair.size + 'px');
  dom.crosshair.style.setProperty('--crosshair-gap', crosshair.gap + 'px');
  dom.crosshair.style.setProperty('--crosshair-line', crosshair.thickness + 'px');
  dom.crosshair.style.setProperty('--crosshair-dot-opacity', crosshair.dot ? '1' : '0');
  updateDynamicCrosshair();
}

function updateDynamicCrosshair() {
  const crosshair = storage.settings.crosshair;
  const maxOffset = Math.max(0, crosshair.size - crosshair.gap - 10);
  const offset = Math.min(18, maxOffset, Math.round(spreadKick * 18));
  dom.crosshair.style.setProperty('--spread-offset', offset + 'px');
}

function flashCrosshair(type) {
  window.clearTimeout(crosshairTimer);
  dom.crosshair.classList.remove('hit', 'miss');
  dom.crosshair.classList.add(type);
  crosshairTimer = window.setTimeout(() => dom.crosshair.classList.remove(type), 130);
}

function showHitMarker(headshot = false) {
  window.clearTimeout(hitMarkerTimer);
  dom.hitMarker.classList.remove('show', 'headshot');
  void dom.hitMarker.offsetWidth;
  dom.hitMarker.classList.toggle('headshot', headshot);
  dom.hitMarker.classList.add('show');
  hitMarkerTimer = window.setTimeout(() => dom.hitMarker.classList.remove('show', 'headshot'), 170);
}

function showKillFeedback({ headshot = false, label = '击杀' } = {}) {
  window.clearTimeout(killFeedbackTimer);
  playKillSound(headshot);
  dom.killLabel.textContent = label;
  dom.killSkull.textContent = '☠';
  dom.killFeedback.hidden = false;
  dom.killFeedback.classList.remove('show', 'gold');
  void dom.killFeedback.offsetWidth;
  dom.killFeedback.classList.toggle('gold', headshot);
  dom.killFeedback.classList.add('show');
  killFeedbackTimer = window.setTimeout(() => {
    dom.killFeedback.classList.remove('show', 'gold');
    dom.killFeedback.hidden = true;
  }, 1120);
}

function showDamageVignette(headshot = false) {
  window.clearTimeout(damageVignetteTimer);
  dom.damageVignette.classList.remove('show', 'headshot');
  void dom.damageVignette.offsetWidth;
  dom.damageVignette.classList.toggle('headshot', headshot);
  dom.damageVignette.classList.add('show');
  damageVignetteTimer = window.setTimeout(() => dom.damageVignette.classList.remove('show', 'headshot'), 460);
}

function showDeathFlash() {
  if (!dom.deathFlash) return;
  window.clearTimeout(deathFlashTimer);
  dom.deathFlash.classList.remove('show');
  void dom.deathFlash.offsetWidth;
  dom.deathFlash.classList.add('show');
  deathFlashTimer = window.setTimeout(() => dom.deathFlash.classList.remove('show'), 1100);
  if (dom.deathBlood) {
    window.clearTimeout(deathBloodTimer);
    dom.deathBlood.classList.remove('show');
    void dom.deathBlood.offsetWidth;
    dom.deathBlood.classList.add('show');
    deathBloodTimer = window.setTimeout(() => dom.deathBlood.classList.remove('show'), 1650);
  }
}

function ensureAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!audioContext && AudioContext) {
    audioContext = new AudioContext();
    audioMasterGain = audioContext.createGain();
    audioLimiter = audioContext.createDynamicsCompressor();
    audioMasterGain.gain.value = 1.18;
    audioLimiter.threshold.value = -8;
    audioLimiter.knee.value = 10;
    audioLimiter.ratio.value = 14;
    audioLimiter.attack.value = 0.002;
    audioLimiter.release.value = 0.16;
    audioMasterGain.connect(audioLimiter).connect(audioContext.destination);
    createShotNoiseBuffer();
  }
  if (audioContext?.state === 'suspended') audioContext.resume();
}

function beep(frequency, seconds, type, volume) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(scaleVolume(volume), audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + seconds);
  oscillator.connect(gain).connect(audioMasterGain || audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + seconds);
}

function scaleVolume(volume) {
  return Math.min(0.42, Math.max(0, volume * SOUND_VOLUME_MULTIPLIER));
}

function createShotNoiseBuffer() {
  if (!audioContext) return;
  const length = Math.floor(audioContext.sampleRate * 0.09);
  shotNoiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = shotNoiseBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const fade = 1 - index / length;
    data[index] = (Math.random() * 2 - 1) * fade * fade;
  }
}

function playNoiseBurst(seconds = 0.05, volume = 0.05, filterFrequency = 900) {
  if (!audioContext || !shotNoiseBuffer) return;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  source.buffer = shotNoiseBuffer;
  filter.type = 'lowpass';
  filter.frequency.value = filterFrequency;
  gain.gain.setValueAtTime(scaleVolume(volume), audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + seconds);
  source.connect(filter).connect(gain).connect(audioMasterGain || audioContext.destination);
  source.start();
  source.stop(audioContext.currentTime + seconds);
}

function playShotSound(weaponId = 'ak') {
  ensureAudio();
  if (weaponId === 'sniper') {
    playNoiseBurst(0.09, 0.075, 560);
    beep(76, 0.075, 'sawtooth', 0.05);
    beep(138, 0.045, 'square', 0.025);
    return;
  }
  if (weaponId === 'shotgun') {
    playNoiseBurst(0.105, 0.095, 520);
    beep(68, 0.105, 'sawtooth', 0.064);
    beep(118, 0.05, 'square', 0.035);
    return;
  }
  playNoiseBurst(0.045, 0.045, 1250);
  beep(132, 0.032, 'sawtooth', 0.028);
}

function playMissSound() {
  ensureAudio();
  beep(105, 0.045, 'sawtooth', 0.022);
}

function playHitSound(headshot = false) {
  ensureAudio();
  beep(headshot ? 1060 : 780, 0.034, 'triangle', headshot ? 0.052 : 0.04);
  if (headshot) beep(1320, 0.026, 'sine', 0.032);
}

function playDamageSound(headshot = false) {
  ensureAudio();
  beep(headshot ? 92 : 118, 0.06, 'sawtooth', headshot ? 0.04 : 0.028);
}

function playIcecreamSound() {
  ensureAudio();
  beep(520, 0.055, 'triangle', 0.034);
  setTimeout(() => beep(780, 0.05, 'sine', 0.03), 48);
  setTimeout(() => beep(1040, 0.07, 'triangle', 0.024), 96);
}

function playIcecreamBlockSound() {
  ensureAudio();
  beep(620, 0.035, 'triangle', 0.026);
  setTimeout(() => beep(940, 0.03, 'sine', 0.02), 32);
}

function playDeathSound() {
  ensureAudio();
  beep(92, 0.12, 'sawtooth', 0.05);
  setTimeout(() => beep(54, 0.18, 'sine', 0.038), 64);
}

function playKillSound(headshot = false) {
  ensureAudio();
  beep(headshot ? 980 : 760, 0.045, 'triangle', 0.046);
  setTimeout(() => beep(headshot ? 1320 : 920, 0.035, 'sine', 0.032), 52);
}

function playWeaponSwitchSound() {
  ensureAudio();
  beep(280, 0.022, 'triangle', 0.018);
}

function playAdsSound(enabled) {
  ensureAudio();
  beep(enabled ? 420 : 260, 0.026, 'triangle', 0.018);
}

function playJumpSound() {
  ensureAudio();
  beep(180, 0.035, 'sine', 0.014);
}

function playKnifeSound() {
  ensureAudio();
  playNoiseBurst(0.034, 0.022, 2100);
  beep(360, 0.028, 'triangle', 0.025);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  weaponPreviews.forEach(resizeWeaponPreview);
}

function readStorage() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const duration = [30, 60, 90].includes(Number(value?.settings?.duration))
      ? Number(value.settings.duration)
      : DEFAULT_SETTINGS.duration;
    const sensitivity = THREE.MathUtils.clamp(Number(value?.settings?.sensitivity) || DEFAULT_SETTINGS.sensitivity, 1, 10);
    const mobileControls = Boolean(value?.settings?.mobileControls);
    const duelMap = getDuelMapId(value?.settings?.duelMap);
    const primaryWeapon = PRIMARY_WEAPON_ORDER.includes(value?.settings?.primaryWeapon)
      ? value.settings.primaryWeapon
      : DEFAULT_SETTINGS.primaryWeapon;
    return {
      settings: { duration, sensitivity, mobileControls, duelMap, primaryWeapon, crosshair: sanitizeCrosshair(value?.settings?.crosshair) },
      best: sanitizeResult(value?.best),
      recent: Array.isArray(value?.recent) ? value.recent.map(sanitizeResult).filter(Boolean) : []
    };
  } catch {
    return {
      settings: {
        duration: DEFAULT_SETTINGS.duration,
        sensitivity: DEFAULT_SETTINGS.sensitivity,
        mobileControls: DEFAULT_SETTINGS.mobileControls,
        duelMap: DEFAULT_SETTINGS.duelMap,
        primaryWeapon: DEFAULT_SETTINGS.primaryWeapon,
        crosshair: { ...DEFAULT_CROSSHAIR }
      },
      best: null,
      recent: []
    };
  }
}

function sanitizeCrosshair(value) {
  const size = Math.round(THREE.MathUtils.clamp(Number(value?.size) || DEFAULT_CROSSHAIR.size, 24, 70));
  const gap = Math.round(THREE.MathUtils.clamp(Number(value?.gap) || DEFAULT_CROSSHAIR.gap, 4, Math.min(28, size - 8)));
  const thickness = Math.round(THREE.MathUtils.clamp(Number(value?.thickness) || DEFAULT_CROSSHAIR.thickness, 1, 6));
  const color = CROSSHAIR_COLORS.includes(value?.color) ? value.color : DEFAULT_CROSSHAIR.color;
  return { color, size, gap, thickness, dot: value?.dot !== false };
}

function crosshairColorName(color) {
  return {
    '#f4f7fb': '白色',
    '#2ee6a6': '青绿',
    '#ffbd5a': '琥珀',
    '#ff4d7d': '粉色'
  }[color] || '自定义';
}

function sanitizeResult(item) {
  if (!item || typeof item !== 'object') return null;
  const duration = [30, 60, 90].includes(Number(item.duration)) ? Number(item.duration) : DEFAULT_SETTINGS.duration;
  const shots = Math.max(0, Math.round(Number(item.shots) || 0));
  const rawHits = Math.max(0, Math.round(Number(item.hits) || 0));
  const hits = shots ? Math.min(shots, rawHits) : 0;
  const accuracy = shots ? hits / shots : 0;
  return {
    id: Number(item.id) || Date.now(),
    date: Number.isFinite(Date.parse(item.date)) ? item.date : new Date().toISOString(),
    duration,
    score: Math.max(0, Math.round(Number(item.score) || 0)),
    hits,
    shots,
    misses: Math.max(0, Math.round(Number(item.misses) || 0)),
    expired: Math.max(0, Math.round(Number(item.expired) || 0)),
    accuracy,
    averageReaction: Math.max(0, Number(item.averageReaction) || 0),
    bestStreak: Math.max(0, Math.round(Number(item.bestStreak) || 0))
  };
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function formatPercent(hits, shots) {
  if (!shots) return '100%';
  return Math.round(hits / shots * 100) + '%';
}

function formatMs(value) {
  return Math.round(value) + 'ms';
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function vectorPayload(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function vectorFromPayload(value) {
  return new THREE.Vector3(Number(value?.x) || 0, Number(value?.y) || CAMERA_HEIGHT, Number(value?.z) || 0);
}

function sanitizePlayerName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  return name || 'Player';
}

function raySphereDistance(origin, direction, center, radius = 0.3) {
  const toCenter = center.clone().sub(origin);
  const t = toCenter.dot(direction);
  const closest = origin.clone().addScaledVector(direction, t);
  const distance = closest.distanceTo(center);
  return { hit: distance <= radius, t, distance };
}

function raySegmentDistance(origin, direction, segmentStart, segmentEnd) {
  const segment = segmentEnd.clone().sub(segmentStart);
  const w0 = origin.clone().sub(segmentStart);
  const a = direction.dot(direction);
  const b = direction.dot(segment);
  const c = segment.dot(segment);
  const d = direction.dot(w0);
  const e = segment.dot(w0);
  const denom = a * c - b * b;

  let tRay = 0;
  let tSegment = 0;
  if (Math.abs(denom) > 0.000001) {
    tRay = (b * e - c * d) / denom;
    tSegment = (a * e - b * d) / denom;
  }
  tSegment = THREE.MathUtils.clamp(tSegment, 0, 1);
  if (tRay < 0) tRay = 0;

  const pointOnRay = origin.clone().addScaledVector(direction, tRay);
  const pointOnSegment = segmentStart.clone().addScaledVector(segment, tSegment);
  return { distance: pointOnRay.distanceTo(pointOnSegment), tRay, tSegment };
}
