# extensions

`index.ts` 是 pi-dstatus 的 Pi Extension（扩展）入口：注册 `/dstatus`，在 TUI session lifecycle（会话生命周期）中安装自定义 Footer，订阅 `pi-dusage/updated` 与 `pi-dfast/updated`，读取 Pi 公开的 context、session name、tokens/cache/cost、Fast Mode 与 provider quota，并统一交给 `src/renderer.ts`。
