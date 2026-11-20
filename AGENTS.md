# pi-dstatus — Agent 规范

## 文件职责与阅读顺序

- 本文件只记录 Footer 扩展长期数据、配置与交付边界，不复制当前默认布局或组件清单。
- 修改前读取 `README.md`、`doc/README.md`、目标目录 README、`package.json`、实现和测试；当前组件与协议以代码和文档为准。
- `doc/README.md` 只是文档导航入口，不承载规格；`doc/决策档案/` 收难逆转决策，`doc/references/` 收来源、验证与历史材料。

## 项目边界

- 配置只读写 `~/.pi/pi-dstatus/config.json`，不读取项目级配置；写入使用可恢复的原子替换，取消设置不得落盘。
- 只消费 Pi 公开 Footer 数据、`getExtensionStatuses()` 和版本化扩展事件，不解析其他扩展私有状态或配置。
- 配置模型、设置草稿、预览与真实 Footer 共享同一渲染核心，避免两套布局语义。
- 逻辑行、溢出策略和组件绑定属于用户配置契约；新增或迁移字段必须兼容既有配置，不自动改写用户布局。
- TUI 只是展示层；渲染或某个扩展状态失败时局部降级，不能让 Pi 会话、配置保存或其他组件崩溃。
- 状态内容可能含路径、模型和用量信息；不增加 prompt、凭据或私有扩展数据的展示。
- 调试先建立 renderer/settings 行为测试；连续两次同类失败且范围未缩小时停止原路径。

## 验证

```bash
npm run typecheck
npm test
```

Footer、设置或键盘交互变化还需从当前仓库加载扩展，打开 `/dstatus`，验证预览、保存、取消、窄终端与目标组件；未做 TUI 实测时明确说明。

## 文档与 Git

- 配置 schema、公开协议、组件行为、安装或用户交互变化时同步 README 与对应文档。
- `CHANGELOG.md` 只记录用户可感知变化。
- 未经用户明确要求，不执行 commit、push、tag 或 npm publish，也不修改用户全局配置。
