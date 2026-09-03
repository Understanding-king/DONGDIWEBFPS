# 三个特殊账号

现在任何人都可以在游戏的「账号管理」里，用自己的邮箱注册账号。Supabase 开启了邮箱确认时，注册后需要先点邮件里的确认链接，再回游戏登录。

特殊账号不能只靠玩家名判断，否则别人把昵称改成“管理员”就会获得权限。项目使用 Supabase `profiles.role` 保存权限：

- `player`：普通玩家
- `admin`：管理员，可以查看账号列表、停用账号、调整角色和训练币
- `owner`：懂帝特权，包含管理员能力，并在人机对局里显示锁头、魔法子弹、飞天、穿墙、锁血开关

## 推荐准备方式

1. 先在 Supabase SQL Editor 按顺序执行全部迁移，包括最后的 `202609030002_account_roles.sql`。
2. 在本地 PowerShell 设置三个账号的邮箱和密码（密码至少 8 位）：

```powershell
$env:SUPABASE_URL="https://vaqauryjbfkmazwlaaxy.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="只在本机临时使用的 service-role key"
$env:ADMIN_EMAIL="替换成管理员邮箱"
$env:ADMIN_PASSWORD="管理员密码"
$env:TEST_EMAIL="替换成测试1号邮箱"
$env:TEST_PASSWORD="测试1号密码"
$env:DONGDI_EMAIL="替换成懂帝邮箱"
$env:DONGDI_PASSWORD="懂帝密码"
pnpm run accounts:special
```

脚本会创建或更新三个用户，并把他们分别设置为 `admin`、`player`、`owner`。它使用的是 Supabase 管理密钥，只在本地终端临时设置；不要把密钥、密码或 `.env` 提交到 Git，也不要发到聊天里。

如果不想在本地运行脚本，也可以让三个邮箱先各自注册，再在 SQL Editor 用下面的模板按邮箱分配角色：

```sql
update public.profiles p
set role = 'admin', updated_at = now()
from auth.users u
where u.id = p.id and lower(u.email) = lower('管理员邮箱');

update public.profiles p
set role = 'player', updated_at = now()
from auth.users u
where u.id = p.id and lower(u.email) = lower('测试1号邮箱');

update public.profiles p
set role = 'owner', updated_at = now()
from auth.users u
where u.id = p.id and lower(u.email) = lower('懂帝邮箱');
```

账号管理页面和懂帝控制台会在重新登录后出现。作弊开关目前只在 BOT 对局本机生效，不会把不可信的作弊状态发送给公共房间的服务器。
