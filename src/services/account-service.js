const ACCOUNT_STORAGE_KEY = 'aim-trainer-account-v1';
const CLOUD_SESSION_KEY = 'aim-trainer-cloud-session-v1';

const cloudUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const cloudAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
);

let localProfile = readLocalProfile();
let cloudSession = readJson(CLOUD_SESSION_KEY);
let cloudProfile = null;
let cloudFriends = null;

export function getAccountSnapshot() {
  const cloudUser = cloudSession?.user || null;
  const displayName = sanitizeDisplayName(
    cloudUser?.user_metadata?.display_name ||
    cloudUser?.user_metadata?.name ||
    localProfile.displayName
  );

  return {
    cloudConfigured: Boolean(cloudUrl && cloudAnonKey),
    signedIn: Boolean(cloudSession?.access_token && cloudUser?.id),
    id: cloudUser?.id || localProfile.id,
    displayName,
    email: cloudUser?.email || '',
    credits: cloudProfile?.credits ?? localProfile.credits,
    xp: cloudProfile?.xp ?? localProfile.xp,
    level: cloudProfile?.level ?? localProfile.level,
    friendCode: getFriendCode(),
    friends: getFriends()
  };
}

export function getFriends() {
  if (cloudSession?.access_token && cloudSession?.user?.id) {
    return Array.isArray(cloudFriends) ? cloudFriends.map((friend) => ({ ...friend })) : [];
  }
  return Array.isArray(localProfile.friends)
    ? localProfile.friends.map((friend) => ({ ...friend }))
    : [];
}

export function getFriendCode() {
  if (cloudSession?.access_token && cloudSession?.user?.id && cloudProfile?.friend_code) {
    return normalizeFriendCode(cloudProfile.friend_code);
  }
  const raw = String(cloudSession?.user?.id || localProfile.id || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  return (raw.slice(-12) || 'LOCALPLAYER01').padStart(12, '0');
}

export async function addFriend(friendCodeOrId, displayName = '') {
  const code = normalizeFriendCode(friendCodeOrId);
  if (!code) throw new Error('请输入好友码或账号 ID。');
  if (
    code === getFriendCode() ||
    code === normalizeFriendCode(localProfile.id) ||
    code === normalizeFriendCode(cloudSession?.user?.id)
  ) {
    throw new Error('不能添加自己。');
  }
  const friends = getFriends();
  if (friends.some((friend) => friend.code === code || friend.id === code)) {
    throw new Error('这个好友已经在列表中。');
  }

  if (cloudSession?.access_token && cloudSession?.user?.id) {
    const payload = await cloudProfileRequest('/rest/v1/rpc/add_friend_by_code', {
      method: 'POST',
      body: { p_friend_code: code, p_nickname: sanitizeOptionalDisplayName(displayName) }
    });
    const row = Array.isArray(payload) ? payload[0] : payload;
    const friend = normalizeCloudFriend(row);
    if (!friend) throw new Error('没有找到这个好友码。');
    cloudFriends = [...friends, friend];
    return getAccountSnapshot();
  }

  const friend = {
    id: code,
    code,
    displayName: sanitizeDisplayName(displayName || `玩家 ${code.slice(-4)}`),
    addedAt: new Date().toISOString()
  };
  localProfile = {
    ...localProfile,
    friends: [...friends, friend],
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(localProfile));
  return getAccountSnapshot();
}

export async function removeFriend(friendId) {
  const id = normalizeFriendCode(friendId);
  const friend = getFriends().find((entry) => entry.id === id || entry.code === id);
  if (cloudSession?.access_token && cloudSession?.user?.id) {
    if (!friend || !isUuid(friend.id)) throw new Error('好友记录无效，请刷新后重试。');
    await cloudProfileRequest('/rest/v1/rpc/remove_friend', {
      method: 'POST',
      body: { p_friend_id: friend.id }
    });
    cloudFriends = getFriends().filter((entry) => entry.id !== id && entry.code !== id);
    return getAccountSnapshot();
  }
  localProfile = {
    ...localProfile,
    friends: getFriends().filter((entry) => entry.id !== id && entry.code !== id),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(localProfile));
  return getAccountSnapshot();
}

export async function restoreAccountSession() {
  if (cloudSession?.refresh_token && isSessionExpiring()) {
    try {
      const refreshed = await cloudRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: cloudSession.refresh_token }
      });
      persistCloudSession(refreshed);
    } catch {
      cloudSession = null;
      cloudProfile = null;
      cloudFriends = null;
      localStorage.removeItem(CLOUD_SESSION_KEY);
    }
  }
  await hydrateCloudProfile();
  return getAccountSnapshot();
}

export function updateLocalProfile(displayName) {
  localProfile = {
    ...localProfile,
    displayName: sanitizeDisplayName(displayName),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(localProfile));
  return getAccountSnapshot();
}

export async function updateAccountProfile(displayName) {
  const snapshot = updateLocalProfile(displayName);
  if (!snapshot.signedIn) return snapshot;
  const profile = await cloudProfileRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(snapshot.id)}`, {
    method: 'PATCH',
    body: { display_name: snapshot.displayName, updated_at: new Date().toISOString() },
    prefer: 'return=representation'
  });
  cloudProfile = profile?.[0] || { ...cloudProfile, display_name: snapshot.displayName };
  return getAccountSnapshot();
}

export async function signInWithPassword({ email, password }) {
  assertCloudConfigured();
  const session = await cloudRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: sanitizeEmail(email), password: String(password || '') }
  });
  persistCloudSession(session);
  await hydrateCloudProfile();
  return getAccountSnapshot();
}

export async function signUpWithPassword({ email, password, displayName }) {
  assertCloudConfigured();
  const session = await cloudRequest('/auth/v1/signup', {
    method: 'POST',
    body: {
      email: sanitizeEmail(email),
      password: String(password || ''),
      data: { display_name: sanitizeDisplayName(displayName) }
    }
  });
  if (session?.access_token) {
    persistCloudSession(session);
    await hydrateCloudProfile();
  }
  return {
    ...getAccountSnapshot(),
    confirmationRequired: !session?.access_token
  };
}

export async function signOutAccount() {
  if (cloudSession?.access_token && cloudUrl && cloudAnonKey) {
    try {
      await fetch(`${cloudUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: cloudAnonKey,
          Authorization: `Bearer ${cloudSession.access_token}`
        }
      });
    } catch {
      // Local session removal remains authoritative if the network is unavailable.
    }
  }
  cloudSession = null;
  cloudProfile = null;
  cloudFriends = null;
  localStorage.removeItem(CLOUD_SESSION_KEY);
  return getAccountSnapshot();
}

async function cloudRequest(path, { method, body }) {
  const response = await fetch(`${cloudUrl}${path}`, {
    method,
    headers: {
      apikey: cloudAnonKey,
      Authorization: `Bearer ${cloudAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error_description || payload?.message || '账号服务请求失败。');
  }
  return payload;
}

function persistCloudSession(session) {
  cloudProfile = null;
  cloudFriends = null;
  cloudSession = session?.expires_in && !session.expires_at
    ? { ...session, expires_at: Math.floor(Date.now() / 1000) + Number(session.expires_in) }
    : session;
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(cloudSession));
  const cloudName = cloudSession?.user?.user_metadata?.display_name;
  if (cloudName) updateLocalProfile(cloudName);
}

function isSessionExpiring() {
  const expiresAt = Number(cloudSession?.expires_at || 0);
  return expiresAt > 0 && expiresAt * 1000 <= Date.now() + 60_000;
}

async function hydrateCloudProfile() {
  if (!cloudSession?.access_token || !cloudSession?.user?.id || !cloudUrl || !cloudAnonKey) return null;
  try {
    const rows = await cloudProfileRequest(`/rest/v1/profiles?select=id,display_name,friend_code,credits,xp,level,equipped_primary&id=eq.${encodeURIComponent(cloudSession.user.id)}`, { method: 'GET' });
    if (rows?.[0]) {
      cloudProfile = rows[0];
      localProfile = {
        ...localProfile,
        displayName: sanitizeDisplayName(rows[0].display_name),
        credits: clampInteger(rows[0].credits, 0, 999999, localProfile.credits),
        xp: clampInteger(rows[0].xp, 0, 99999999, localProfile.xp),
        level: clampInteger(rows[0].level, 1, 999, localProfile.level)
      };
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(localProfile));
    } else {
      const created = await cloudProfileRequest('/rest/v1/profiles', {
        method: 'POST',
        body: {
          id: cloudSession.user.id,
          display_name: sanitizeDisplayName(cloudSession.user.user_metadata?.display_name || cloudSession.user.email?.split('@')[0] || 'Player'),
          friend_code: friendCodeFromId(cloudSession.user.id)
        },
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      cloudProfile = created?.[0] || null;
    }
    await hydrateCloudFriends();
  } catch {
    // Keep the signed-in auth session usable when the optional profile row is unavailable.
  }
  return cloudProfile;
}

async function hydrateCloudFriends() {
  if (!cloudSession?.access_token || !cloudSession?.user?.id) return;
  try {
    const rows = await cloudProfileRequest('/rest/v1/rpc/get_my_friends', { method: 'POST', body: {} });
    cloudFriends = Array.isArray(rows) ? rows.map(normalizeCloudFriend).filter(Boolean) : [];
  } catch {
    cloudFriends = [];
  }
}

async function cloudProfileRequest(path, { method, body, prefer = '' }) {
  const headers = {
    apikey: cloudAnonKey,
    Authorization: `Bearer ${cloudSession.access_token}`,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${cloudUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.hint || '云端档案同步失败。');
  return payload;
}

function readLocalProfile() {
  const stored = readJson(ACCOUNT_STORAGE_KEY);
  return {
    id: String(stored?.id || makeLocalId()),
    displayName: sanitizeDisplayName(stored?.displayName || 'Player'),
    credits: clampInteger(stored?.credits, 0, 999999, 2400),
    xp: clampInteger(stored?.xp, 0, 99999999, 2840),
    level: clampInteger(stored?.level, 1, 999, 7),
    friends: Array.isArray(stored?.friends) ? stored.friends.map(normalizeFriend).filter(Boolean) : [],
    updatedAt: stored?.updatedAt || new Date().toISOString()
  };
}

function normalizeFriendCode(value) {
  return String(value || '').trim().replace(/[^a-z0-9-]/gi, '').slice(0, 64).toUpperCase();
}

function friendCodeFromId(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-12).padStart(12, '0');
}

function normalizeFriend(friend) {
  if (!friend) return null;
  const code = normalizeFriendCode(friend.code || friend.id);
  if (!code) return null;
  return {
    id: normalizeFriendCode(friend.id || code),
    code,
    displayName: sanitizeDisplayName(friend.displayName || friend.name || `玩家 ${code.slice(-4)}`),
    addedAt: friend.addedAt || new Date().toISOString()
  };
}

function normalizeCloudFriend(friend) {
  if (!friend?.id || !friend?.friend_code) return null;
  return normalizeFriend({
    id: friend.id,
    code: friend.friend_code,
    displayName: friend.display_name,
    addedAt: friend.created_at
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function sanitizeDisplayName(value) {
  return String(value || 'Player').trim().replace(/[<>]/g, '').slice(0, 16) || 'Player';
}

function sanitizeOptionalDisplayName(value) {
  const name = String(value || '').trim().replace(/[<>]/g, '').slice(0, 16);
  return name || null;
}

function sanitizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('请输入有效邮箱。');
  return email;
}

function assertCloudConfigured() {
  if (!cloudUrl || !cloudAnonKey) throw new Error('云端账号服务尚未配置，当前可使用本地档案。');
}

function clampInteger(value, min, max, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function makeLocalId() {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `local-${suffix}`;
}
