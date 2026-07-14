# 文档总览

- `../README.md`：安装、使用和手工 TUI 验证。
- `../AGENTS.md`：项目实现约束。
- `../CHANGELOG.md`：用户可感知变更。
- `pi-footer-public-data-audit.md`：Pi Footer 公开数据源与可接入字段审查。
- `../src/README.md`：核心模块职责。
- `../extensions/README.md`：Pi 扩展入口职责。

## 数据边界

Footer 只消费 Pi 公开的 `ExtensionContext`、Git 和 `footerData.getExtensionStatuses()`。配置只读写 `~/.pi/pi-dstatus/config.json`，不读取项目级配置或其他扩展私有会话状态。

## 实现路径

默认配置是一条包含核心组件的逻辑行；`/dstatus` 修改 `settings-model` 草稿，设置预览和实际 Footer 都调用 `renderer.renderStatusLines()`。`session`、`tokens`、`cache`、`cost`、`context`、每个 `quota` 与按 key 绑定的 `statuses` 都是独立组件：`context` 使用统一的 `QuotaWindow`（配额窗口）模型渲染上下文百分比进度条与 `XXK/XXXK`，每个 `quota` 通过 `StatusComponent.key` 绑定一个 provider / 模型 ID，并通过 `pi-dusage/updated` 消费对应额度；`statuses` 有 key 时只消费对应的 `getExtensionStatuses()` 条目，无 key 时显示全部。provider / 模型与 status 列表来自运行时动态发现；设置面板选中动态组件后用 `p` 绑定，`q` 切换窗口范围、`t` 切换 reset 时间。保存通过临时文件加 `rename` 原子替换，取消不写盘。
