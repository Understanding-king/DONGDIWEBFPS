import process from 'node:process';

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('请先设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。不要把 service-role key 提交到 Git。');
  process.exit(1);
}

const definitions = [
  { key: 'ADMIN', role: 'admin', name: '管理员' },
  { key: 'TEST', role: 'player', name: '测试1号' },
  { key: 'DONGDI', role: 'owner', name: '懂帝' }
];

for (const definition of definitions) {
  const email = required(`${definition.key}_EMAIL`);
  const password = required(`${definition.key}_PASSWORD`);
  const user = await findOrCreateUser(email, password, definition.name);
  await upsertProfile(user.id, definition.name, definition.role);
  console.log(`${definition.name}: ${email} -> ${definition.role} (${user.id})`);
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    console.error(`缺少环境变量 ${name}。`);
    process.exit(1);
  }
  return value;
}

async function findOrCreateUser(email, password, displayName) {
  const users = await adminRequest('/auth/v1/admin/users?per_page=1000');
  const existing = (users?.users || []).find((user) => String(user.email || '').toLowerCase() === email.toLowerCase());
  if (existing) {
    await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(existing.id)}`, {
      method: 'PUT',
      body: { password, email_confirm: true, user_metadata: { display_name: displayName } }
    });
    return existing;
  }
  return adminRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true, user_metadata: { display_name: displayName } }
  });
}

async function upsertProfile(id, displayName, role) {
  await restRequest('/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { id, display_name: displayName, role, status: 'active' }
  });
}

async function adminRequest(path, options = {}) {
  return request(path, options);
}

async function restRequest(path, options = {}) {
  return request(path, options);
}

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${payload?.msg || payload?.message || payload?.error || 'unknown error'}`);
  }
  return payload;
}
