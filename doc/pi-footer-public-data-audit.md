# Pi Footer 公开数据源审查

> 审查对象：Pi `0.80.7`（本机安装版本）与当前 `pi-dstatus`。
> 审查日期：2026-07-15。

## 结论

`pi-dstatus` 当前已经覆盖了 Footer 最重要的动态数据：目录、session name、Git、模型/provider、thinking level、Fast Mode、context usage、累计 token/cache/cost、工作状态、扩展公开 status，以及 `pi-dusage` 的独立额度快照。

Pi 没有提供一个可直接复用的“默认 Footer 状态快照”接口，但默认 Footer 使用的剩余信息仍然可以通过公开扩展 API 重建：

- session name：`ctx.sessionManager.getSessionName()`；
- token、cache、cost：`ctx.sessionManager.getEntries()` 中公开的 assistant `usage`；
- cache hit rate：由当前 assistant `usage` 计算；
- 可用 provider 数：Footer factory 收到的 `footerData.getAvailableProviderCount()`。

本次已按上述边界新增独立的 `session`、`tokens`、`cache` 与 `cost` 可配置组件；`available provider count` 仍只作为模型组件的辅助信息，不单独占一个色块。`model.cost` 是价格元数据，不是实际消费，不能替代 session usage。缓存命中率与缓存读写均按当前 session 累计统计。

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

## 接入时序与刷新要求

### 当前已覆盖的刷新点

`extensions/index.ts` 已在以下事件触发 Footer 重绘：

- `model_select`
- `thinking_level_select`
- `turn_start` / `turn_end`
- `tool_execution_start` / `tool_execution_end`
- `pi-dusage/updated`
- `pi-dfast/updated`
- Git `onBranchChange()`

### 若接入 session name

增加：

```ts
pi.on("session_info_changed", requestRender);
```

render 时读取：

```ts
ctx.sessionManager.getSessionName()
```

### usage/cost/cache 接入

增加：

```ts
pi.on("message_end", requestRender);
```

原因：assistant response 的最终 usage 只在 message 结束时稳定。Pi 默认 Footer 也是在 `message_end` 后失效并请求重绘。统计应遍历 `ctx.sessionManager.getEntries()`，与默认 Footer 的“跨 compaction 累计”语义保持一致。

注意：Pi 的 `message_end` 扩展事件发生在 SessionManager 持久化之前，但 TUI 重绘是异步请求；不要在事件回调里缓存 `getEntries()` 的结果，直接在 Footer render 时读取。

### 若接入 available provider count

`footerData.getAvailableProviderCount()` 只有读取接口，没有变更订阅回调。当前 Footer 可在每次 render 直接读取；它反映 Pi 当前模型候选集合的 provider 数量，来源是 `getModelCandidates()` 的 provider 去重，不应文案化为“已配置”或“已登录” provider 数。

## 本次落实方案

### 已落实：新增 `session` 组件，默认关闭、按用户显式加入

组件只显示 session name，空值时不渲染：

```text
◉ release-audit
```

字段来源明确、刷新事件公开、不会产生新的统计口径。session id/file 保留在设置或诊断场景，不进入默认状态栏。

### 已落实：拆分 `tokens`、`cache`、`cost` 三个组件

统计按输入输出 token、缓存、费用拆成独立组件，而不是继续塞进 `model` 或 `context`：

```text
输入 9M · 输出 265K · 合计 136M
缓存读取 127M · 命中率 99.3%
费用 $33.537
```

建议口径：

- token/cost：累计 `getEntries()` 中所有 assistant message；
- cache read/write/hit rate：按所有 assistant message 累计；没有 cache 数据时隐藏；
- session usage 在 `session_start` 初始化，并在 `message_end` 增量更新；Footer render 只读取已聚合结果；
- `message_end`、`session_start`、`session_shutdown` 时请求重绘；
- 复用现有紧凑 token formatter 与 overflow 机制；`合计` 使用 Pi 公开的 `usage.totalTokens`。

### P2：model 组件可选显示 provider count

不新增独立组件。只有当 `getAvailableProviderCount() > 1` 时，沿用 Pi 默认 Footer 的 `(provider)` 逻辑；当前 `pi-dstatus` 已支持显式 provider 显示，因此不必再暴露 provider count 配置。

### 暂不接入

- `model.cost`：费率元数据，不是消费统计；
- `session id` / `session file`：诊断价值大于持续可视化价值；
- `maxTokens` / `api` / `reasoning` 元数据：对日常 Footer 决策帮助有限；
- OAuth/subscription 标记：会把认证语义引入状态栏，且不属于当前项目的数据边界。

## 兼容性与边界

- 继续只使用 Pi 公开的 `ExtensionContext`、`ReadonlySessionManager`、`ReadonlyFooterDataProvider` 和 `ExtensionAPI` 事件。
- 不读取 `auth.json`，不调用 provider API，不依赖默认 Footer 的私有实现。
- `ctx.getContextUsage().tokens` / `percent` 在 compaction 后可能为 `null`；新增统计组件不得把未知误报为 0%。
- `getEntries()` 是公开的 session 数据集合，但未来若 Pi 改变 `SessionEntry` 结构，应通过类型检查和行为测试捕获；不要复制默认 Footer 以外的私有算法。
- 所有新增数据继续经过现有 `renderer`，预览与 Footer 共用同一渲染核心。

## 当前决策建议

本次实现已将 **session name** 与 **tokens/cache/cost** 作为可配置组件加入；`available provider count` 不单独加入，其他候选字段暂缓。
