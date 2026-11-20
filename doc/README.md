# pi-dstatus 文档入口

本文件只做导航，不承载机制正文。现行规格以根 `README.md`「使用」一节与 `../AGENTS.md`「项目边界」一节为准。

1. [工程入口](../README.md) — 安装、使用、目录导航与手工 TUI 验证；用户可见的现行规格以此为准
2. [决策档案](./决策档案/) — 难逆转决定的刻碑（接入哪些字段、拒绝哪些字段）
3. [证据与历史](./references/) — 来源、验证材料与历史阶段记录，不是现行权威
4. [代理协作规则](../AGENTS.md) — 项目实现约束、数据边界与验证命令
5. [版本变化](../CHANGELOG.md) — 用户可感知变化时间线，不作为当前架构或路线图权威
6. [核心模块职责](../src/README.md) / [扩展入口](../extensions/README.md) / [行为测试](../test/README.md) — 代码层导航

根上没有 `PLAN.md`：当前执行状态与接续位置无独立正文。

`doc/决策档案/` 是难逆转决策的刻碑；`doc/references/` 只保存来源、验证证据与历史阶段记录，不作为并行需求或现行实现权威。

## 决策与经验

- [决策档案/footer-data-scope.md](./决策档案/footer-data-scope.md)：Footer 数据接入范围的决策档案（接入哪些字段、暂不接入哪些字段）。
- 本仓库没有 `doc/术语表.md` 与 `doc/经验笔记.md`：目前没有独立成篇的术语定义与可改做法材料（相关约束在 `../AGENTS.md`），不创建空位置。

## 证据与历史（`doc/references/`）

| 文件 | 内容 |
|---|---|
| [references/pi-footer-public-data-audit.md](./references/pi-footer-public-data-audit.md) | Pi Footer 公开数据源审查记录（来源与验证材料） |

## 维护规则

- 组件清单、布局语义、溢出策略与组件绑定规则变化 → 只更新 `../README.md`；数据边界与配置契约变化 → 只更新 `../AGENTS.md`。
- 难逆转决定 → 新增 `doc/决策档案/` 条目并同步本入口；可复用做法出现后再建 `doc/经验笔记.md`。
- 验证记录、来源与历史阶段 → 追加到 `doc/references/`，不改写已归档记录；用户可感知变化 → `../CHANGELOG.md`。
- 文档结构调整 → 更新本入口的导航，不新写第二份机制正文。
