# 文档总览

- `../README.md`：安装、使用和手工 TUI 验证。
- `../AGENTS.md`：项目实现约束。
- `../CHANGELOG.md`：用户可感知变更。
- `../src/README.md`：核心模块职责。
- `../extensions/README.md`：Pi 扩展入口职责。

## 数据边界

Footer 只消费 Pi 公开的 `ExtensionContext`、Git 和 `footerData.getExtensionStatuses()`。配置只读写 `~/.pi/pi-dstatus/config.json`，不读取项目级配置或其他扩展私有会话状态。

## 实现路径

默认配置是一条包含全部组件的逻辑行；`/dstatus` 修改 `settings-model` 草稿，设置预览和实际 Footer 都调用 `renderer.renderStatusLines()`。上下文组件使用 Pi 公开的 tokens/contextWindow，显示为 `XXK of XXXK`；保存通过临时文件加 `rename` 原子替换，取消不写盘。
