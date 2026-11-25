# pi-dstatus

[English](./README.md) | 中文

个人的多逻辑行、可配置 Pi `Footer`（底栏）扩展，使用 Powerline 箭头色块风格。

公开仓库：[github.com/ssdiwu/pi-dstatus](https://github.com/ssdiwu/pi-dstatus)

## 安装

安装 npm 当前发布版本；具体版本以 npm registry 与 `package.json` 的发布记录为准：

```bash
pi install npm:pi-dstatus
```

开发版可以从仓库目录安装：

```bash
git clone https://github.com/ssdiwu/pi-dstatus.git
cd pi-dstatus
pi install .
```

启用前请移除或停用 `@npm-ken/pi-bar`，因为两个扩展都会竞争自定义 Footer。

## 使用

- `/dstatus`：打开设置面板。
- 配置文件：`~/.pi/pi-dstatus/config.json`；Footer 在运行期间每分钟重读一次，外部修改会自动同步。
- 默认一条逻辑行：目录/Git/模型/思考等级/Fast Mode（快速模式）/上下文/多个独立 `quota` 用量查询/工具或工作动画/所有当前非空扩展状态；可按需加入会话名、输入输出 token、缓存命中率、费用等独立组件。
- 当前模型组件同时显示模型名与 provider，例如 `(openai-codex)gpt-5.6-luna`；在 `/dstatus` 选中模型组件后按 `Enter`，可切换 provider 显示；`context` 独立显示模型上下文窗口；每个 `quota` 组件订阅并显示一个 `pi-dusage` provider / 模型额度，分别渲染为独立 Powerline 色块。上下文示例：`87% ━━━━━━━━━━━━━━━━━━━━ · 324K/372K`。

逻辑行可以新增、删除（包括最后一行）和排序，并编排行内组件；`session`、`tokens`、`cache`、`cost`、`fast`、`context`、每个 `quota` 和按 key 绑定的 `statuses` 都是独立组件。`session` 显示 Pi session name；`tokens` 显示输入、输出与合计 token；`cache` 显示累计缓存读写与累计命中率；`cost` 显示累计费用。安装 `pi-dfast` 后，`fast` 组件通过 `pi-dfast/updated` 公开快照显示当前会话的 `FAST` 或 `FAST · inactive`，关闭时隐藏。安装 `pi-dusage` 后，provider / 模型额度会从结构化快照动态发现；选中 `quota` 或 `statuses` 组件后按 `Enter` 进入设置，再选择绑定模型或状态。无 key 的 `statuses` 仍表示显示全部状态。逻辑行不是终端物理行：宽度不足时默认自动 `wrap`（换行）。全局默认和每行均支持 `wrap`、`collapse`、`hide`。

已有配置不会被自动改写布局；升级后可在 `/dstatus` 中新增“快速模式”组件。

通用扩展状态只读取 Pi 公开的 `setStatus(key, value)` 协议及 `getExtensionStatuses()`；`fast` 与 `quota` 组件分别消费版本化公开事件快照。未发布状态不显示，也不解析其他扩展私有状态。

## 本地 TUI 验证

1. 先停用 `@npm-ken/pi-bar`。
2. 执行 `pi install npm:pi-dstatus`，或在仓库目录用 `pi -e ./extensions/index.ts` 临时加载。
3. 启动 `pi`，观察 Footer；输入 `/dstatus`。
4. 用方向键选择行/组件，使用界面显示的快捷键新增、删除、排序、编辑溢出策略。
5. 使用 `↑↓`/`←→` 选择并聚焦行或组件，按 `Enter` 进入当前对象设置；使用 `a`/`d` 增删逻辑行，`c` 修改组件，`n` 在当前组件右侧新增组件，`x` 删除组件，`[`/`]` 移动当前聚焦对象（组件在行首或行尾继续移动时跨行），`u`/`j` 移动逻辑行，`s` 保存，`Esc` 返回或取消。
6. 输入 `/dstatus` 后确认预览、保存与取消行为；再调整终端宽度验证 wrap。

## 目录导航

- `extensions/`：Pi Extension（扩展）入口，注册 `/dstatus` 并安装自定义 Footer。
- `src/`：配置、渲染、设置状态模型、设置 UI 与 session usage 聚合。
- `test/`：配置、渲染、设置交互与 usage 聚合的行为测试。
- `doc/`：文档入口、决策档案与来源材料（`doc/决策档案/`、`doc/references/`）。

## 开发

```bash
git clone https://github.com/ssdiwu/pi-dstatus.git
cd pi-dstatus
npm install
npm run typecheck
npm test
```

## 贡献

- 先读 [`AGENTS.md`](AGENTS.md)，再读 [`doc/README.md`](doc/README.md) 获取文档地图。
- 行为改动先改根 `README.md`，再改代码与测试，然后同步英文 `README.md` 与中文 `README-zh.md` —— 两版必须保持语义一致。
- 配置 schema、公开协议与组件行为变化必须配套行为测试，且必须兼容既有用户配置。
- 用户可感知变化写入变更日志：本仓日常维护中文 [`CHANGELOG-zh.md`](CHANGELOG-zh.md)，准备发布时按版本把同样的事实同步到英文 [`CHANGELOG.md`](CHANGELOG.md)；两份 changelog 与两版 README 都随 npm 包发布。
- 一次提交只做一件事，遵循 Conventional Commits（约定式提交）。未经明确授权不提交、不推送、不打标签、不发布，也不修改用户全局配置。

## 范围

本项目不修改 Pi 核心与旧 `pi-bar`，不实现项目级覆盖或 Claude 专属用量指标。
