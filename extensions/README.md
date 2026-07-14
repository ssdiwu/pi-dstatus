# extensions

`index.ts` 是 pi-dstatus 的 Pi Extension（扩展）入口：注册 `/dstatus`，在 TUI session lifecycle（会话生命周期）中安装自定义 Footer，订阅 `pi-dusage/updated`，并把 Pi 公开上下文与 provider quota 交给 `src/renderer.ts`。
