# 云端数据库准备

## 当前结论

第一阶段只迁移数据库，不部署 Web，不迁移 AI 请求，也不迁移附件文件。Web 已接入无登录的单一共享 Supabase 数据空间：配置云端后，事件、随手记和自定义分类直接读写同一套数据，本地副本仅作为读取缓存；未配置 Supabase 时才继续使用项目文件接口。

数据库迁移文件：`supabase/migrations/202608030001_archive_schema.sql`、`supabase/migrations/202608030002_shared_archive.sql`。

## 已验证云端状态

2026-08-03 已在 Supabase Free 项目 `myarchive-dev` 执行迁移。项目状态为 Healthy，主数据库位于东京 `ap-northeast-1`。

- `records`：无 `user_id`，RLS 已开启，1 条共享读写策略，1 个更新时间触发器。
- `notes`：无 `user_id`，RLS 已开启，1 条共享读写策略，1 个更新时间触发器。
- `categories`：无 `user_id`，RLS 已开启，1 条共享读写策略。
- `archive_meta`：记录首次导入完成状态，防止新浏览器重复导入旧数据。
- `data/archive-data.json` 已上传并独立核对为 35 条事件、31 条随手记。

## 第一阶段范围

包含：

- 经历记录 `records`。
- 随手记 `notes`。
- 自定义分类 `categories`。
- 单一共享数据空间的 RLS 策略。
- 跨端同步需要的 `created_at` 和 `updated_at`。

暂不包含：

- 照片、文档和录音文件本体；`files`、`photos` 只保留兼容引用。
- 聊天会话、页面主题和其他设备级设置。
- DeepSeek、GLM Key 或 AI 请求代理。
- Realtime、离线写入合并和复杂冲突解决。
- 用户账号、身份隔离和多租户数据模型。

## 安全边界

- Web 和手机端不登录，使用相同 Supabase URL 与 publishable key 读写同一套数据。
- 客户端只配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
- 数据库密码、`service_role` Key 和模型 API Key 不得进入浏览器、手机包、GitHub、聊天或截图。
- 表继续启用 RLS，但 `anon` 和 `authenticated` 都拥有整表读写策略。
- publishable key 不是私密凭据，手机包和网页代码中的 key 都可能被提取；任何拿到它的人都能读写整库。
- 当前方案只适合单人、本地开发和演示。公开部署或保存敏感数据前，必须改回认证隔离或受控服务端代理。

## 字段合同

### `records`

| 当前 Web 字段 | Supabase 字段 | 类型 | 约定 |
| --- | --- | --- | --- |
| `id` | `id` | `text` | 保留当前字符串 ID；全表主键 |
| `title` | `title` | `text` | 允许空字符串作为旧数据兼容值 |
| `category` | `category` | `text` | 保存分类名称 |
| `date` | `occurred_on` | `date` | 空字符串写入时转换为 `null` |
| `description` | `description` | `text` | 用户原始记录 |
| `aiDescription` | `ai_description` | `text` | AI 事实摘要 |
| `keywords` | `keywords` | `text[]` | 缺失时使用空数组 |
| `uncertainties` | `uncertainties` | `text[]` | 缺失时使用空数组 |
| `files` | `files` | `jsonb` | 第一阶段只同步引用，不同步文件本体 |
| `photos` | `photos` | `jsonb` | 第一阶段只同步引用，不同步图片本体 |
| `needsDate` | `needs_date` | `boolean` | 缺失时为 `false` |
| `createdVia` | `created_via` | `text` | 可空，例如 `chat` |
| `createdAt` | `created_at` | `timestamptz` | 保留原创建时间 |
| - | `updated_at` | `timestamptz` | 数据库触发器在更新时刷新 |

### `notes`

| 当前 Web 字段 | Supabase 字段 | 类型 | 约定 |
| --- | --- | --- | --- |
| `id` | `id` | `text` | 全表主键 |
| `content` | `content` | `text` | 去除首尾空白后不得为空 |
| `date` | `note_date` | `date` | 空字符串写入时转换为 `null` |
| `createdAt` | `created_at` | `timestamptz` | 保留原创建时间 |
| - | `updated_at` | `timestamptz` | 数据库触发器在更新时刷新 |

### `categories`

默认分类仍由客户端内置；该表只保存新增的分类，分类名称在共享空间内唯一。

## 第一版同步规则

1. 应用启动或重新回到前台时读取共享的 `records`、`notes` 和 `categories`。
2. 创建或编辑成功后写入本地缓存，并重新读取云端结果。
3. 删除第一阶段使用硬删除；由于暂不支持离线写入，不创建删除墓碑。
4. 同一条数据发生并发编辑时，第一阶段接受最后一次成功写入；`updated_at` 用于发现覆盖情况。
5. 云端不可用时只允许读取已有本地缓存。是否允许离线新增，留到后续单独决策，避免形成未定义的合并行为。

## 创建 Supabase 项目后的操作

1. 在亚洲区域创建开发项目，并把协作者加入 Supabase 项目，不共享数据库密码。
2. 按顺序通过 Supabase SQL Editor 或 CLI 执行两个迁移文件。
3. 将项目 URL 和 publishable key 写入各自本机的 `.env.local`，不要提交该文件。
4. 手机端按本文件中的同一字段合同直接接入共享表，不实现登录流程。

## 连通验收

- 手机新增一条随手记，Web 刷新后可见。
- Web 新增并编辑一条经历，手机刷新后内容一致。
- 删除同步：任一端删除测试数据后，另一端刷新后不可见。
- 初始数据：任一客户端均读取到 35 条事件和 31 条随手记。
- 失败路径：断网或 Supabase 请求失败时，不覆盖已有本地缓存，并显示明确失败状态。
- 连续三次完成核心双端流程后，才把云端数据库标记为可用于 Demo。

## 尚未验证

- 手机端技术栈和生成的客户端类型尚未确认。
- Web 客户端已经连接云表；手机端尚未接入，跨端同步仍未验证。
- 附件跨端共享不属于本阶段，不能对外宣称已经支持。
- 无登录模式尚未做公开网络下的滥用、限流或敏感数据安全测试。
