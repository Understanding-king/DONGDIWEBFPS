# 高清竞技大区

独立入口 `/hd-arena.html`，大厅玩法页显示“高清竞技大区”。旧训练、人机、局域网入口及其逻辑保持不变。此版本是独立自由训练场，不包含多人匹配，也不复用旧地图生成器。

## 当前可用

- 原创沙漠庭院 GLB、Poly Haven PBR 材质、可穿行双层拱廊与独立碰撞数据。
- Soldier 人体蒙皮网格、Idle/Walk/Run 动画与程序化倒地；三个移动目标，击倒后三秒复活。
- 真实人体网格派生的第一人称手部、共享 AK 资源、程序化换弹、30 发弹匣与 90 发备弹。
- 子弹检查场景遮挡，身体三枪击倒、头部一枪；命中标记、枪口光、弹道与合成音效。
- 固定 120 Hz 移动模拟，地面摩擦、投影加速、空中动量、滑墙和落地前跳跃缓冲。属于经典 FPS 机制重建，未经 CF 原版参数与实机对照校准，不声称精确复现鬼跳/小碎步。
- 独立加载、错误重试、暂停、重新训练和弹药 HUD。失去鼠标锁定后暂停模拟；重新训练补足弹药。

操作：WASD 移动，鼠标左键连射，Space 跳跃，Ctrl 蹲伏，Shift 静步，R 换弹，Esc 暂停。需要桌面键鼠和 WebGL。

## 代码与验证

入口为 `src/hd/entry.js`，场景整合在 `hd-arena.js`，移动与弹药状态分别在 `movement.js` 和 `combat.js`，模型与视图只在 `src/hd/` 内。

`pnpm run check:hd` 检查移动、碰撞、弹药、GLB 完整性与碰撞数据，GitHub Actions 也运行这些检查。`pnpm run build` 构建两个页面。本次根据用户要求在部署后进行线上浏览器验证，不启动本地试玩服务。

资源来源见 `public/models/hd-arena/ASSET-SOURCES.md`。Blender 重建脚本为 `scripts/build_hd_map.py`、`scripts/build_hd_hands.py`、`scripts/build_hd_weapon.py`；`preview-v1.jpg` 是资产预览图，不是线上截图。高清大区 AK 使用约 4.1 MB 的 Meshopt GLB，保留原有三角形细节；旧大区的 OBJ 和 PNG 文件未修改。

## 尚未达到的部分

这是模块化美术的首版独立训练场，尚未达到 CF/GTA 商业成品精度。没有原生换弹、蹲伏和死亡动捕，也没有弹匣拆装骨骼动画。圆形喷泉使用保守矩形碰撞。后续细节与动作需要继续按线上实际画面验收。
