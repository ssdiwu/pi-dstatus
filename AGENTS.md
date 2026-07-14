# pi-dstatus 项目规范

## 项目定位

`pi-dstatus` 是个人全局 Pi 多行状态栏扩展，入口为 `/dstatus`。它替代单行 `@npm-ken/pi-bar`，不修改 Pi 核心或旧包。

## 实现边界

- 配置只读写 `~/.pi/pi-dstatus/`，不读取项目级配置。
- 扩展状态只消费 Pi 公开的 `getExtensionStatuses()`，不解析任何扩展私有状态。
- 预览与 Footer 共用渲染核心。
- 默认 `wrap`，支持行级 `wrap`、`collapse`、`hide`。
- 代码改动后运行 `npm run typecheck && npm test`。
