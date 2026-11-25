# Pi Footer 公开数据源审查

> 审查对象：Pi `0.80.7`（本机安装版本）与当前 `pi-dstatus`。
> 审查日期：2026-07-15。
>
> 本文件是来源与验证材料，不是现行权威。字段接入与否的决策见 `../决策档案/footer-data-scope.md`；当前组件清单与布局语义见 `../../README.md`「Usage」与 `../../README-zh.md`「使用」。

## 审查结论（当时）

`pi-dstatus` 当前已经覆盖了 Footer 最重要的动态数据：目录、session name、Git、模型/provider、thinking level、Fast Mode、context usage、累计 token/cache/cost、工作状态、扩展公开 status，以及 `pi-dusage` 的独立额度快照。

Pi 没有提供一个可直接复用的“默认 Footer 状态快照”接口，但默认 Footer 使用的剩余信息仍然可以通过公开扩展 API 重建：

- session name：`ctx.sessionManager.getSessionName()`；
- token、cache、cost：`ctx.sessionManager.getEntries()` 中公开的 assistant `usage`；
- cache hit rate：由当前 assistant `usage` 计算；
- 可用 provider 数：Footer factory 收到的 `footerData.getAvailableProviderCount()`。

`model.cost` 是价格元数据，不是实际消费，不能替代 session usage。缓存命中率与缓存读写均按当前 session 累计统计。

## Pi 公开接口盘点

| 信息 | 公开来源 | 当前状态 | 结论 |
| --- | --- | --- | --- |
| 当前工作目录 | `ExtensionContext.cwd` | 已接入 `dir` | 可继续使用 |
| Git branch | `ReadonlyFooterDataProvider.getGitBranch()` + `onBranchChange()` | 已接入 `git` | 接口稳定，当前实现已订阅变化 |
| 扩展 status | `getExtensionStatuses()` | 已接入 `statuses` | 只消费公开 `setStatus()` 协议，边界正确 |
| 可用 provider 数 | `getAvailableProviderCount()` | 未接入 | 是当前模型候选集合的 provider 去重数量，不等于已登录 provider；低优先级 |
| 当前 model/provider | `ExtensionContext.model.id/provider` | 已接入 `model` | 可继续使用公开字段 |
| model context window | `ExtensionContext.model.contextWindow` 或 `getContextUsage().contextWindow` | 已通过 `getContextUsage()` 接入 `context` | 后者包含 Pi 对 compaction 的有效估算，应优先使用 |
| context tokens/percent | `ctx.getContextUsage()` | 已接入 `context` | `tokens` / `percent` 在 compaction 后可能为 `null`，当前实现会隐藏未知 context，避免误报 0% |
| thinking level | `pi.getThinkingLevel()` 与 `thinking_level_select` | 已接入 `thinking` | 可继续使用 |
| Fast Mode | `pi-dfast/updated` 版本化公开快照 | 已接入 `fast` | 只展示本地开关与注入资格，不宣称服务端确认 |
| session name | `ctx.sessionManager.getSessionName()` + `session_info_changed` | 已接入 `session` | 空名称隐藏，事件触发刷新 |
| input/output tokens | `ctx.sessionManager.getEntries()` → assistant `message.usage` | 已接入 `tokens` | 按所有 session entries 累计 |
| cache read/write | 同上 | 已接入 `cache` | 按所有 assistant messages 累计 |
| cache hit rate | `cacheRead / (input + cacheRead + cacheWrite)` | 已接入 `cache` | 保持默认 Footer 的最近一次 assistant response 口径 |
| actual cost | assistant `message.usage.cost.total` | 已接入 `cost` | 按所有 assistant messages 累计，不读取 auth 或调用 provider API |
| model pricing metadata | `ctx.model.cost` | 未接入 | 仅表示费率，不表示已消费金额，不建议作为状态组件 |
| session id/file | `getSessionId()` / `getSessionFile()` | 未接入 | 更适合作为诊断或设置页信息，不适合默认 Footer |
| max output tokens / API | `ctx.model.maxTokens` / `ctx.model.api` | 未接入 | 低价值，暂不纳入 |

## 关键证据

### Extension API

- `dist/core/extensions/types.d.ts`
  - `ExtensionContext.cwd`
  - `ExtensionContext.model`
  - `ExtensionContext.getContextUsage()`
  - `ExtensionContext.ui.setFooter()`
  - `ExtensionAPI.on("session_info_changed", ...)`
  - `ExtensionAPI.on("message_end", ...)`
  - `ExtensionAPI.on("model_select", ...)`
- `dist/core/footer-data-provider.d.ts`
  - `getGitBranch()`
  - `getExtensionStatuses()`
  - `getAvailableProviderCount()`
  - `onBranchChange()`
- `dist/core/session-manager.d.ts`
  - `ReadonlySessionManager.getSessionName()`
  - `ReadonlySessionManager.getEntries()`
  - `ReadonlySessionManager.getBranch()`

### Usage 数据结构

`@earendil-works/pi-ai` 的公开 `AssistantMessage.usage` 包含：

- `input`
- `output`
- `cacheRead`
- `cacheWrite`
- `totalTokens`
- `cost.input`
- `cost.output`
- `cost.cacheRead`
- `cost.cacheWrite`
- `cost.total`

`cacheWrite1h` 和 `reasoning` 也可能存在，但当前默认 Footer 不展示，不建议为了字段完整而扩展组件。

### 默认 Footer 的行为

`dist/modes/interactive/components/footer.js` 当前默认 Footer：

1. 遍历 `session.sessionManager.getEntries()`，累计所有 assistant message 的 input/output/cache/cost；
2. 以最后遍历到的 assistant message 计算最近一次 cache hit rate；
3. 通过 `session.getContextUsage()` 展示 context；
4. 通过 `session.sessionManager.getSessionName()` 拼接 session name；
5. 通过 `footerData.getAvailableProviderCount()` 决定是否给 model 加 provider 前缀；
6. 通过 `footerData.getExtensionStatuses()` 展示公开扩展状态。

`pi-dstatus` 不能直接调用默认 Footer 的私有统计状态，但可以在自己的 Footer render 中按上述公开字段重建，不需要读取 Pi 私有模块或修改 Pi 核心。
