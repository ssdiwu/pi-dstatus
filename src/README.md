# src

- `config.ts`：版本化全局配置与原子持久化。
- `renderer.ts`：公开状态组件、模型 provider 标识、可复用 `QuotaWindow`/`QuotaGroup` formatter、独立 provider quota segment、逻辑行布局、Powerline 渲染和物理宽度约束。
- `git.ts`：通过 Pi `exec` 读取当前仓库的公开 Git 状态。
- `settings-model.ts`：`/dstatus` 草稿编辑的纯状态模型。
- `settings-ui.ts`：基于 Pi TUI 的设置面板与同源实时预览。
