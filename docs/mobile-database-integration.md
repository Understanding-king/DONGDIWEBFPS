# MyArchive 手机端数据库接入文档

本文档面向手机端开发者，说明 MyArchive 当前 Supabase 数据库的连接方式、表结构、字段合同、CRUD 调用、同步规则、安全边界和联调验收方法。

更新日期：2026-08-03（Asia/Shanghai）

## 1. 结论先行

- Web 与手机端共用一套 Supabase 数据，不区分用户，不需要登录。
- 手机端只需要项目 URL 和 publishable key，不需要数据库密码。
- 云端是事件、随手记和自定义分类的主数据源。
- 当前没有 Realtime；启动、回到前台、手动刷新和写入成功后重新读取云端。
- 当前不支持附件文件本体上云，`files` 和 `photos` 只存引用元数据。
- 当前不定义离线写入和冲突合并；离线时只能展示已有缓存。
- 任何拿到 publishable key 的人都可以读写整库。该方案只适合目前的单人开发和演示环境。

## 2. Supabase 项目信息

| 项目 | 值 |
| --- | --- |
| Supabase 项目名 | `myarchive-dev` |
| Project ref | `wpekwxjyniytfciemymk` |
| Project URL | `https://wpekwxjyniytfciemymk.supabase.co` |
| 区域 | Tokyo / `ap-northeast-1` |
| 套餐 | Free |
| 当前状态 | Healthy（2026-08-03 验证） |
| 当前事件数 | 35 |
| 当前随手记数 | 31 |

publishable key 不写入 Git、本文档、聊天记录或截图。请从 [Supabase API Keys](https://supabase.com/dashboard/project/wpekwxjyniytfciemymk/settings/api-keys) 获取，或由项目负责人通过安全渠道单独分享。

不要使用以下内容连接手机端：

- 数据库密码
- secret key
- `service_role` key
- DeepSeek 或 GLM API key

## 3. 当前架构与权限

手机端和 Web 端都以匿名客户端身份访问同一数据空间：

```text
Web 客户端 ----\
                -> Supabase PostgREST -> records / notes / categories
手机端客户端 --/
```

四张表都启用了 RLS，但当前策略允许 `anon` 和 `authenticated` 角色执行整表读、增、改、删：

```sql
for all to anon, authenticated
using (true)
with check (true)
```

这不是用户隔离。publishable key 可以放入客户端，但它无法阻止拿到 key 的第三方访问数据。公开部署、保存敏感信息或增加多用户前，必须重新设计认证或服务端代理。

## 4. 客户端配置

### 4.1 React Native / Expo

依赖版本可使用 Supabase JS 2.x；Web 当前使用 `@supabase/supabase-js` 2.112.0。

```bash
npm install @supabase/supabase-js react-native-url-polyfill
```

环境变量示例：

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://wpekwxjyniytfciemymk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<通过安全渠道获取>
```

客户端初始化：

```ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('Supabase 配置缺失');
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
```

不要调用 `signUp`、`signIn` 或 `signOut`。当前项目没有账号概念。

### 4.2 Flutter

```dart
await Supabase.initialize(
  url: 'https://wpekwxjyniytfciemymk.supabase.co',
  anonKey: const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
);

final supabase = Supabase.instance.client;
```

Flutter SDK 的参数仍可能叫 `anonKey`，这里填写的是 Supabase publishable key，不是 secret key。

### 4.3 通用 REST

Base URL：

```text
https://wpekwxjyniytfciemymk.supabase.co/rest/v1
```

每次请求都带：

```http
apikey: <SUPABASE_PUBLISHABLE_KEY>
Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>
Content-Type: application/json
```

## 5. 数据表总览

| 表 | 用途 | 手机端权限 |
| --- | --- | --- |
| `records` | 经历事件 | 读、增、改、删 |
| `notes` | 随手记 | 读、增、改、删 |
| `categories` | 用户新增的自定义分类 | 读、增；当前产品没有删除入口 |
| `archive_meta` | Web 首次历史数据导入状态 | 只读，不要由手机端修改 |

数据库中不存在 `user_id`。所有客户端共享相同主键空间。

## 6. `records` 表

### 6.1 字段定义

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `text` | 是 | 无 | 主键，长度 1-120 |
| `title` | `text` | 是 | `''` | 事件标题 |
| `category` | `text` | 是 | `''` | 分类名称 |
| `occurred_on` | `date` | 否 | `null` | 事件日期，格式 `YYYY-MM-DD` |
| `description` | `text` | 是 | `''` | 用户原始记录 |
| `ai_description` | `text` | 是 | `''` | AI 事实摘要 |
| `keywords` | `text[]` | 是 | `[]` | 关键词数组 |
| `uncertainties` | `text[]` | 是 | `[]` | AI 不确定项数组 |
| `files` | `jsonb` | 是 | `[]` | 文件引用数组，不含文件本体 |
| `photos` | `jsonb` | 是 | `[]` | 图片引用数组，不含本地图片本体 |
| `needs_date` | `boolean` | 是 | `false` | 是否需要补日期 |
| `created_via` | `text` | 否 | `null` | 创建来源，例如 `chat` |
| `created_at` | `timestamptz` | 是 | `now()` | 创建时间，ISO 8601 |
| `updated_at` | `timestamptz` | 是 | `now()` | 数据库更新触发器自动刷新 |

索引：

- 主键：`id`
- `occurred_on desc`
- `created_at desc`

### 6.2 手机端模型建议

```ts
type AttachmentRef =
  | string
  | {
      id: string;
      name: string;
      type?: string;
      size?: number;
    };

export interface ArchiveRecordRow {
  id: string;
  title: string;
  category: string;
  occurred_on: string | null;
  description: string;
  ai_description: string;
  keywords: string[];
  uncertainties: string[];
  files: AttachmentRef[];
  photos: AttachmentRef[];
  needs_date: boolean;
  created_via: string | null;
  created_at: string;
  updated_at: string;
}
```

### 6.3 Web 字段映射

| Web / 领域字段 | 数据库字段 |
| --- | --- |
| `id` | `id` |
| `title` | `title` |
| `category` | `category` |
| `date` | `occurred_on` |
| `description` | `description` |
| `aiDescription` | `ai_description` |
| `keywords` | `keywords` |
| `uncertainties` | `uncertainties` |
| `files` | `files` |
| `photos` | `photos` |
| `needsDate` | `needs_date` |
| `createdVia` | `created_via` |
| `createdAt` | `created_at` |

### 6.4 读取事件

```ts
const { data, error } = await supabase
  .from('records')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw error;
const records = (data ?? []) as ArchiveRecordRow[];
```

Flutter：

```dart
final records = await supabase
    .from('records')
    .select()
    .order('created_at', ascending: false);
```

REST：

```http
GET /rest/v1/records?select=*&order=created_at.desc
```

### 6.5 新增事件

ID 必须由客户端生成，并在 Web 与手机端的共享空间内唯一。手机端优先使用自身 UUID 库；不要使用数组下标或标题作为 ID。

```ts
const now = new Date().toISOString();
const record: Omit<ArchiveRecordRow, 'updated_at'> = {
  id: `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '测试事件',
  category: '学术活动',
  occurred_on: '2026-08-03',
  description: '手机端创建的测试事件。',
  ai_description: '',
  keywords: [],
  uncertainties: [],
  files: [],
  photos: [],
  needs_date: false,
  created_via: 'mobile',
  created_at: now,
};

const { error } = await supabase.from('records').insert(record);
if (error) throw error;
```

`occurred_on` 没有值时必须传 `null`，不要传空字符串。

### 6.6 修改事件

编辑现有事件时优先使用局部 `update`，只发送实际变化的字段：

```ts
const { error } = await supabase
  .from('records')
  .update({
    title: '修改后的标题',
    description: '修改后的正文',
  })
  .eq('id', recordId);

if (error) throw error;
```

不要手动更新 `updated_at`，数据库触发器会处理。

重要：如果使用完整对象 `upsert`，必须把云端已有的 `files`、`photos`、`keywords` 和 `uncertainties` 原样带回。遗漏或传空数组会覆盖 Web 端已有元数据。

完整对象写入：

```ts
const { error } = await supabase
  .from('records')
  .upsert(fullRecordRow, { onConflict: 'id' });
```

### 6.7 删除事件

当前使用硬删除，没有回收站和删除墓碑：

```ts
const { error } = await supabase
  .from('records')
  .delete()
  .eq('id', recordId);

if (error) throw error;
```

删除是真实且跨端生效的。测试时只删除带明确测试前缀、并已确认 ID 的临时记录。

## 7. `notes` 表

### 7.1 字段定义

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `text` | 是 | 无 | 主键，长度 1-120 |
| `content` | `text` | 是 | 无 | 去除首尾空白后不能为空 |
| `note_date` | `date` | 否 | `null` | 随手记日期，格式 `YYYY-MM-DD` |
| `created_at` | `timestamptz` | 是 | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | 是 | `now()` | 更新时自动刷新 |

索引：

- 主键：`id`
- `note_date desc`
- `created_at desc`

```ts
export interface NoteRow {
  id: string;
  content: string;
  note_date: string | null;
  created_at: string;
  updated_at: string;
}
```

### 7.2 读取随手记

```ts
const { data, error } = await supabase
  .from('notes')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw error;
const notes = (data ?? []) as NoteRow[];
```

### 7.3 新增随手记

```ts
const now = new Date();
const localDateKey = (date: Date) => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
};

const note = {
  id: `note-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  content: '[MOBILE-TEST] 手机端联调随手记',
  note_date: localDateKey(now),
  created_at: now.toISOString(),
};

const { error } = await supabase.from('notes').insert(note);
if (error) throw error;
```

### 7.4 修改随手记

```ts
const { error } = await supabase
  .from('notes')
  .update({ content: '修改后的随手记正文' })
  .eq('id', noteId);

if (error) throw error;
```

### 7.5 删除随手记

```ts
const { error } = await supabase
  .from('notes')
  .delete()
  .eq('id', noteId);

if (error) throw error;
```

## 8. `categories` 表

数据库只保存新增的自定义分类。默认分类由客户端内置，手机端应与 Web 保持一致：

```ts
export const DEFAULT_CATEGORIES = [
  '学术竞赛',
  '体育竞赛',
  '综合竞赛',
  '学术活动',
  '探索类活动',
  '研学活动',
  '领导力活动',
  '研究和探究',
  '艺术活动',
  '实习',
  '随手记',
];
```

表字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint identity` | 数据库生成，手机端不要指定 |
| `name` | `text` | 共享空间内唯一，长度 1-80 |
| `created_at` | `timestamptz` | 数据库生成 |

读取并合并默认分类：

```ts
const { data, error } = await supabase
  .from('categories')
  .select('name')
  .order('created_at', { ascending: true });

if (error) throw error;

const custom = (data ?? []).map((row) => row.name);
const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...custom])];
```

新增自定义分类：

```ts
const name = input.trim();
if (!name) throw new Error('分类名称不能为空');

const { error } = await supabase
  .from('categories')
  .upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });

if (error) throw error;
```

当前产品没有删除自定义分类的正式流程。手机端暂时不要实现分类删除，避免已存在事件引用一个被删除的分类名称。

## 9. `archive_meta` 表

该表只用于记录 Web 已完成首次历史数据导入：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | `text` | 主键 |
| `value` | `jsonb` | 迁移状态 |
| `updated_at` | `timestamptz` | 更新时间 |

当前关键行：

```text
key = initial_archive_import
```

手机端不需要读取该表才能正常工作，也绝对不要更新或删除这条记录。手机端只直接读取 `records`、`notes` 和 `categories`。

## 10. 一次读取完整归档

手机端可并行读取三张业务表：

```ts
export async function readArchive() {
  const [recordsResult, notesResult, categoriesResult] = await Promise.all([
    supabase.from('records').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('name').order('created_at', { ascending: true }),
  ]);

  if (recordsResult.error) throw recordsResult.error;
  if (notesResult.error) throw notesResult.error;
  if (categoriesResult.error) throw categoriesResult.error;

  return {
    records: recordsResult.data ?? [],
    notes: notesResult.data ?? [],
    categories: (categoriesResult.data ?? []).map((row) => row.name),
  };
}
```

Supabase 默认单次最多返回 1000 行。当前数据量远低于该上限；未来超过上限时必须增加分页，不能把前 1000 行误当成完整数据。

## 11. 同步和本地缓存规则

手机端应遵守以下规则，保持与 Web 一致：

1. 冷启动时读取云端完整归档。
2. App 从后台回到前台时重新读取。
3. 提供手动刷新。
4. 创建、修改、删除成功后重新读取相关表或完整归档。
5. 只有云端读取成功后，才覆盖本地缓存。
6. 云端请求失败时保留上一次成功缓存，不能用 `[]` 覆盖。
7. 云端写入失败时显示失败状态，不在本地假装保存成功。
8. 当前不实现离线写入队列。
9. 当前不使用 Realtime 订阅；另一端的变化在下次刷新或回前台时出现。
10. 并发编辑采用最后一次成功写入；可用 `updated_at` 提示用户数据已被另一端更新。

推荐状态：

```ts
type ArchiveLoadState =
  | { status: 'loading'; cached?: Archive }
  | { status: 'ready'; data: Archive }
  | { status: 'stale'; data: Archive; errorMessage: string }
  | { status: 'empty-error'; errorMessage: string };
```

`stale` 表示云端失败但存在可用缓存。不要把它渲染成“没有数据”。

## 12. 附件边界

当前 Supabase 没有配置 Storage bucket，也没有上传以下文件本体：

- 照片
- PDF / Word 文档
- 录音

`records.files` 和 `records.photos` 仅保存兼容引用：

- 字符串：文件名或远程图片 URL。
- 对象：`{ id, name, type, size }`，对应 Web 本机文件存储或 IndexedDB 中的文件。

手机端处理规则：

- 可以显示字符串文件名和可访问的远程 URL。
- 对只有本机 `id` 的对象，不要假设手机端能下载文件本体。
- 编辑其他字段时必须保留原 `files` 和 `photos`。
- 手机端暂时不要声称支持跨端附件。
- 后续若需要附件共享，应单独设计 Supabase Storage bucket、路径、上传权限、删除规则和迁移流程。

## 13. REST CRUD 参考

以下示例省略共同请求头。

读取所有随手记：

```http
GET /rest/v1/notes?select=*&order=created_at.desc
```

读取单条事件：

```http
GET /rest/v1/records?select=*&id=eq.<URL_ENCODED_ID>
```

新增随手记：

```http
POST /rest/v1/notes
Prefer: return=representation

{
  "id": "note-mobile-unique-id",
  "content": "手机端随手记",
  "note_date": "2026-08-03",
  "created_at": "2026-08-03T12:00:00.000Z"
}
```

局部修改事件：

```http
PATCH /rest/v1/records?id=eq.<URL_ENCODED_ID>
Prefer: return=representation

{
  "title": "修改后的标题"
}
```

删除测试随手记：

```http
DELETE /rest/v1/notes?id=eq.<URL_ENCODED_ID>
Prefer: return=representation
```

## 14. 错误处理

所有 SDK 调用都必须检查 `error`。至少区分：

| 场景 | 手机端行为 |
| --- | --- |
| 无网络 / 请求超时 | 展示上次缓存，标记数据可能不是最新 |
| 读取失败且无缓存 | 显示错误和重试按钮 |
| 写入失败 | 保留用户输入，提示重试，不更新成功状态 |
| 主键冲突 | 重新生成 ID；不要覆盖未知记录 |
| 日期格式错误 | 在客户端阻止提交，统一为 `YYYY-MM-DD` 或 `null` |
| 随手记正文为空 | 在客户端阻止提交 |
| 部分并行读取失败 | 不用失败表的空数组覆盖缓存；整体显示同步失败 |

不要在日志中输出 publishable key、完整用户数据、数据库密码或模型 API key。

## 15. 手机端联调验收

联调前，手机端开发者先确认：

- 能读取 35 条事件。
- 能读取 31 条随手记。
- 代码和 Git 中没有 publishable key 明文。
- 没有实现 Supabase 登录流程。
- 没有 `user_id` 字段。

推荐按以下顺序联调：

1. 手机端创建一条正文以 `[MOBILE-TEST]` 开头的临时随手记。
2. Web 刷新后能看到该随手记。
3. Web 修改该测试随手记或手机端修改正文，另一端刷新后内容一致。
4. 手机端创建一个临时事件，Web 能看到标题、日期、分类和正文。
5. 对测试事件做一次局部更新，确认 `files` 和 `photos` 未被清空。
6. 删除两条测试数据。
7. 两端刷新后均不可见测试数据。
8. 最终确认正式数据数量恢复到测试前水平。
9. 断网后仍能查看上一次缓存，但不能显示“保存成功”。

每轮测试记录输入、预期、实际结果和清理结果。测试数据必须使用唯一前缀和明确 ID，禁止拿现有正式记录做删除测试。

## 16. 手机端不应做的事情

- 不要创建 Auth 用户或登录页面。
- 不要添加或发送 `user_id`。
- 不要修改 `archive_meta`。
- 不要执行数据库迁移 SQL。
- 不要把数据库密码、secret key 或 `service_role` key 放入 App。
- 不要在云端失败时把本地缓存覆盖为空数组。
- 不要把附件引用当成已经完成跨端文件同步。
- 不要启用离线写入队列，除非双方先确定冲突合并规则。
- 不要在未保留完整字段的情况下对现有事件做全对象 `upsert`。

## 17. Web 端参考实现

仓库中的实现文件：

- `cloud-store.js`：Supabase 客户端、字段转换、读写和迁移状态。
- `app.js`：云端优先、本地缓存和失败回退的调用流程。
- `supabase/migrations/202608030001_archive_schema.sql`：初始表结构。
- `supabase/migrations/202608030002_shared_archive.sql`：改为无登录单一共享空间。
- `docs/cloud-database.md`：数据库范围和验收边界。
- `docs/test-evidence.md`：已经完成的 Web 云端测试证据。

手机端以本文档的最终表结构为准，不要只参考第一份迁移中的旧 `user_id` 结构。两份迁移按顺序执行后的结果，才是当前真实数据库结构。
