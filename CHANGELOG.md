# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的基本格式；版本以 Git tag（Git 标签）为准。

## [Unreleased]

## [0.0.1] - 2026-07-14

### Added

- 多逻辑行 Powerline 状态栏与 `/dstatus` 设置入口。
- 全局配置及按逻辑行覆盖的 `wrap`、`collapse`、`hide` 溢出策略。
- 基于 Pi 公开扩展状态协议的自动状态显示。
- 可复用的 `quota` 配额窗口组件，支持上下文用量百分比与单线进度显示。

### Changed

- 默认配置收敛为一条包含全部组件的逻辑行，窄终端自动换行。
- 设置面板区分修改当前组件与新增组件，并显示明确的当前选择状态。
- 上下文组件显示百分比进度条与实际 token 用量，例如 `87% ━━━━━━━━── · 324K of 372K`。
