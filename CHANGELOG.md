# Changelog

## [Unreleased]

### Added

- 多逻辑行 Powerline 状态栏与 `/dstatus` 设置入口。
- 全局配置及按逻辑行覆盖的 `wrap`、`collapse`、`hide` 溢出策略。
- 基于 Pi 公开扩展状态协议的自动状态显示。

### Changed

- 默认配置收敛为一条包含全部组件的逻辑行，窄终端自动换行。
- 上下文改为可复用的 `quota` 窗口组件，显示百分比进度条与实际 token 用量，例如 `87% ━━━━━━━━── · 324K of 372K`，为后续接入 `pi-dusage` reset 状态复用同一渲染器。
