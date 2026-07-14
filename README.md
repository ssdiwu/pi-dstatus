# pi-dstatus

个人的多逻辑行、可配置 Pi `Footer`（底栏）扩展，使用 Powerline 箭头色块风格。

公开仓库：[github.com/ssdiwu/pi-dstatus](https://github.com/ssdiwu/pi-dstatus)

## 安装

安装已发布的 `0.0.1` 版本：

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
- 配置文件：`~/.pi/pi-dstatus/config.json`。
- 默认一条逻辑行：目录/Git/模型/思考等级/上下文/多个独立 `quota` 用量查询/工具或工作动画/所有当前非空扩展状态。
- 当前模型组件同时显示模型名与 provider，例如 `(openai-codex)gpt-5.6-luna`，可在 `/dstatus` 用 `m` 隐藏或显示 provider；`context` 独立显示模型上下文窗口；每个 `quota` 组件订阅并显示一个 `pi-dusage` provider / 模型额度，分别渲染为独立 Powerline 色块。上下文示例：`87% ━━━━━━━━━━━━━━━━━─── · 324K/372K`。

逻辑行可以新增、删除、排序，并编排行内组件；`context`、每个 `quota` 和按 key 绑定的 `statuses` 都是独立组件。安装 `pi-dusage` 后，provider / 模型额度会从结构化快照动态发现，选中某个 `quota` 组件后使用 `/dstatus` 的 `p` 指定它显示的模型；选中 `statuses` 后用同一个 `p` 指定 `mcp`、`dgoal`、`dteam` 等状态。无 key 的 `statuses` 仍表示显示全部状态。逻辑行不是终端物理行：宽度不足时默认自动 `wrap`（换行）。全局默认和每行均支持 `wrap`、`collapse`、`hide`。

扩展状态只读取 Pi 公开的 `setStatus(key, value)` 协议及 `getExtensionStatuses()`；未发布状态不显示，不解析 `pi-dgoal` 或其他扩展私有状态。

## 本地 TUI 验证

1. 先停用 `@npm-ken/pi-bar`。
2. 执行 `pi install npm:pi-dstatus`，或在仓库目录用 `pi -e ./extensions/index.ts` 临时加载。
3. 启动 `pi`，观察 Footer；输入 `/dstatus`。
4. 用方向键选择行/组件，使用界面显示的快捷键新增、删除、排序、编辑溢出策略。
5. 使用 `↑↓`/`←→` 选择并聚焦行或组件，按 `Enter` 进入当前对象设置；使用 `a`/`d` 增删逻辑行，`c` 修改组件，`n` 新增组件，`x` 删除组件，`[`/`]` 移动当前聚焦对象，`u`/`j` 移动逻辑行，`s` 保存，`Esc` 返回或取消。
6. 输入 `/dstatus` 后确认预览、保存与取消行为；再调整终端宽度验证 wrap。

## 开发

```bash
npm install
npm run typecheck
npm test
```

## 范围

本项目不修改 Pi 核心与旧 `pi-bar`，不实现项目级覆盖或 Claude 专属用量指标。
