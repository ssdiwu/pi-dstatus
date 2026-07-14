# test

行为测试目录，验证配置、渲染、设置交互与 Pi 公开 session usage 聚合，不测试实现细节。

## 测试文件

- `config.test.ts`：默认配置、配置校验、旧配置迁移与原子保存。
- `renderer.test.ts`：Powerline segment、context/quota、session/tokens/cache/cost、状态过滤与宽度约束。
- `settings-model.test.ts`：设置草稿的增删、排序、焦点、溢出和组件配置状态。
- `settings-ui.test.ts`：`/dstatus` 设置面板、动态 picker、预览、保存/取消与生命周期边界。
- `usage.test.ts`：Pi 公开 assistant usage 的 token、cache、cost 与命中率聚合。

## 运行

```bash
npm test
```

测试中的 mock 只放在 Pi UI、Footer 和 Git 等系统边界；核心配置、聚合与 renderer 通过公共函数验证行为。
