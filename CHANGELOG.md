# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的基本格式；版本以 Git tag（Git 标签）为准。

## [Unreleased]

### Added

- 新增独立 `fast` Footer 组件，通过 `pi-dfast/updated` 公开快照显示 `FAST` 或 `FAST · inactive`，关闭时隐藏。

## [0.0.2] - 2026-07-14

### Added

- 新增可配置的会话名、输入输出 token、缓存命中率与费用组件，统计口径对齐 Pi 默认 Footer。
- 订阅 `pi-dusage/updated` 结构化快照，动态发现 provider / 模型；上下文与每个独立 quota 组件分开渲染，`StatusComponent.key` 绑定具体用量查询。
- 设置面板将行级与组件级配置统一收进 Enter 打开的上下文设置面板。

### Changed

- 模型组件支持显示 provider，并可在 `/dstatus` 中切换。
- quota 状态采用紧凑的 10 格进度条、token 单位和 provider 短标签，减少 Footer 占用。
- quota 与 statuses 支持独立绑定，设置面板实时同步运行中的公开状态和额度发现结果。

### Fixed

- 不再把 `pi-dusage` 的长文本 fallback 当作唯一额度展示；有结构化数据时清除重复状态文本。
- 未绑定 provider / 模型的 quota 组件不再渲染全部额度，避免新增组件产生重复长文本。
- `statuses` 支持通过 key 独立显示运行时发现的 `mcp`、`dgoal`、`dteam` 等状态；quota provider 文案不再显示 `left`。
- 打开 `/dstatus` 设置时主动同步 Footer 状态，避免 picker 显示“暂无可用 status”。
- 修复未知 context usage 被误显示为 `0%`、设置子面板误响应父级快捷键，以及配置 key 进入 TUI 前未清洗的问题。
- 缓存命中率改为按当前 session 累计统计，避免与累计缓存 token 使用不同口径。

## [0.0.1] - 2026-07-14

### Added

- 多逻辑行 Powerline 状态栏与 `/dstatus` 设置入口。
- 全局配置及按逻辑行覆盖的 `wrap`、`collapse`、`hide` 溢出策略。
- 基于 Pi 公开扩展状态协议的自动状态显示。
- 可复用的 `quota` 配额窗口组件，支持上下文用量百分比与单线进度显示。

### Changed

- 默认配置收敛为一条包含全部组件的逻辑行，窄终端自动换行。
- 设置面板区分修改当前组件与新增组件，并显示明确的当前选择状态。
- 模型组件显示 provider 前缀与模型名，并可在设置中切换 provider 显示；上下文组件显示百分比优先、10 格紧凑微型进度条与紧凑 token 用量，例如 `87% ━━━━━━━━── · 324K/372K`。
