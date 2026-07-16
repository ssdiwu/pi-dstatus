# 文档总览

## 阅读顺序与权威边界

1. `../README.md`：安装、使用、目录导航和手工 TUI 验证。
2. `../AGENTS.md`：项目实现约束、数据边界和验证命令。
3. `../src/README.md` / `../extensions/README.md`：代码层职责与入口导航。
4. `pi-footer-public-data-audit.md`：Pi Footer 公开数据源的事实审查与接入边界。
5. `../CHANGELOG.md`：用户可感知变更时间线，不作为当前架构或路线图权威。

当前实现以源代码、测试和对应分层 README 为准；本目录没有路线图、版本实施方案或历史归档文档，因此暂不创建 `00 / 10 / 20 / 30 / 40 / 90` 编号目录。后续出现路线图、版本方案或历史材料时，再分别迁入对应编号段。

## 文档清单

- `../README.md`：安装、使用和手工 TUI 验证。
- `../AGENTS.md`：项目实现约束。
- `../CHANGELOG.md`：用户可感知变更。
- `pi-footer-public-data-audit.md`：Pi Footer 公开数据源与可接入字段审查。
- `../src/README.md`：核心模块职责。
- `../extensions/README.md`：Pi 扩展入口职责。
- `../test/README.md`：行为测试目录与测试文件导航。

## 数据边界

Footer 只消费 Pi 公开的 `ExtensionContext`、Git、`footerData.getExtensionStatuses()` 与版本化扩展事件快照。配置只读写 `~/.pi/pi-dstatus/config.json`，不读取项目级配置或其他扩展私有会话状态。

## 实现路径

默认配置是一条包含核心组件的逻辑行；`/dstatus` 修改 `settings-model` 草稿，设置预览和实际 Footer 都调用 `renderer.renderStatusLines()`。`fast` 组件订阅 `pi-dfast/updated`，只展示版本化公开状态，不读取 `pi-dfast` 配置。`session`、`tokens`、`cache`、`cost`、`context`、每个 `quota` 与按 key 绑定的 `statuses` 都是独立组件：`context` 使用统一的 `QuotaWindow`（配额窗口）模型渲染上下文百分比进度条与 `XXK/XXXK`，每个 `quota` 通过 `StatusComponent.key` 绑定一个 provider / 模型 ID，并通过 `pi-dusage/updated` 消费对应额度；`statuses` 有 key 时只消费对应的 `getExtensionStatuses()` 条目，无 key 时显示全部。provider / 模型与 status 列表来自运行时动态发现；设置面板选中对象后按 `Enter` 进入上下文设置，再选择绑定模型、状态或切换显示选项。保存通过临时文件加 `rename` 原子替换，取消不写盘；运行中的 TUI Footer 每分钟重读全局配置文件，以同步外部排布修改。
