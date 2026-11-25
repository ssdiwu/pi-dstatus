# pi-dstatus

English | [中文](./README-zh.md)

A personal multi-logical-line, configurable Pi `Footer` (底栏) extension that uses Powerline arrow color blocks.

Public repository: [github.com/ssdiwu/pi-dstatus](https://github.com/ssdiwu/pi-dstatus)

## Installation

Install the currently published npm version; the exact version is authoritative in the npm registry and the publish records of `package.json`:

```bash
pi install npm:pi-dstatus
```

A development checkout can be installed from the repository directory:

```bash
git clone https://github.com/ssdiwu/pi-dstatus.git
cd pi-dstatus
pi install .
```

Remove or disable `@npm-ken/pi-bar` before enabling this extension, because both compete for the custom footer.

## Usage

- `/dstatus`: opens the settings panel.
- Configuration file: `~/.pi/pi-dstatus/config.json`; the footer re-reads it every minute while running, so external edits are picked up automatically.
- The default is one logical line: directory / Git / model / thinking level / Fast Mode (快速模式) / context / multiple independent `quota` usage queries / tool or work animation / all current non-empty extension statuses. Optional independent components include session name, input/output tokens, cache hit rate and cost.
- The current model component shows both the model name and the provider, for example `(openai-codex)gpt-5.6-luna`; selecting the model component in `/dstatus` and pressing `Enter` toggles provider display. `context` shows the model context window separately; each `quota` component subscribes to and displays the quota of one `pi-dusage` provider / model, rendered as an independent Powerline block. Context example: `87% ━━━━━━━━━━━━━━━━━━━━ · 324K/372K`.

Logical lines can be added, removed (including the last one) and reordered, and components can be arranged inside a line. `session`, `tokens`, `cache`, `cost`, `fast`, `context`, each `quota` and key-bound `statuses` are all independent components. `session` shows the Pi session name; `tokens` shows input, output and total tokens; `cache` shows cumulative cache reads/writes and the cumulative hit rate; `cost` shows cumulative cost. With `pi-dfast` installed, the `fast` component shows `FAST` or `FAST · inactive` for the current session from the public `pi-dfast/updated` snapshot, and is hidden when off. With `pi-dusage` installed, provider / model quotas are discovered dynamically from structured snapshots; after selecting a `quota` or `statuses` component, press `Enter` to enter settings and then choose the bound model or status. A `statuses` component without a key still means "show all statuses". A logical line is not a physical terminal line: when the width is insufficient, the default is `wrap` (换行). Both the global default and each line support `wrap`, `collapse` and `hide`.

Existing configurations are never rewritten automatically; after upgrading you can add a "Fast Mode" component in `/dstatus`.

Generic extension statuses are read only through Pi's public `setStatus(key, value)` protocol and `getExtensionStatuses()`; the `fast` and `quota` components consume versioned public event snapshots. Unpublished statuses are not shown, and no other extension's private state is parsed.

## Manual TUI verification

1. Disable `@npm-ken/pi-bar` first.
2. Run `pi install npm:pi-dstatus`, or load temporarily from the repository directory with `pi -e ./extensions/index.ts`.
3. Start `pi` and watch the footer; type `/dstatus`.
4. Use the arrow keys to select lines/components, and use the shortcuts shown in the interface to add, remove, reorder and edit the overflow strategy.
5. Use `↑↓`/`←→` to select and focus a line or component, press `Enter` to enter the settings of the current object; use `a`/`d` to add/remove logical lines, `c` to modify a component, `n` to add a component to the right of the current one, `x` to delete a component, `[`/`]` to move the focused object (a component keeps crossing logical lines when it moves past the start or end of a line), `u`/`j` to move logical lines, `s` to save, and `Esc` to go back or cancel.
6. After typing `/dstatus`, verify preview, save and cancel behavior; then resize the terminal to verify wrapping.

## Directory navigation

- `extensions/`: the Pi extension (扩展) entry point; it registers `/dstatus` and installs the custom footer.
- `src/`: configuration, rendering, settings state model, settings UI and session usage aggregation.
- `test/`: behavior tests for configuration, rendering, settings interaction and usage aggregation.
- `doc/`: document entry point, decision records and source material (`doc/决策档案/`, `doc/references/`).

## Development

```bash
git clone https://github.com/ssdiwu/pi-dstatus.git
cd pi-dstatus
npm install
npm run typecheck
npm test
```

## Contributing

- Read [`AGENTS.md`](AGENTS.md) first, then [`doc/README.md`](doc/README.md) for the document map.
- Behavior changes update the root `README.md` first, then the code and tests, then both README versions (`README.md` in English and `README-zh.md` in Chinese) — the two versions must stay semantically in sync.
- Configuration schema, public protocol and component behavior changes must land with matching behavior tests; existing user configurations must stay compatible.
- User-perceivable changes go to the changelog: daily Chinese entries are kept in [`CHANGELOG-zh.md`](CHANGELOG-zh.md) in this repository, and each released version mirrors the same user-perceivable facts into the English [`CHANGELOG.md`](CHANGELOG.md); both changelogs and both READMEs ship in the npm package.
- One commit does one thing and follows Conventional Commits (约定式提交). Do not commit, push, tag or publish without explicit authorization, and do not modify the user's global configuration.

## Scope

This project does not modify Pi core or the old `pi-bar`, and implements no project-level override or Claude-specific usage metrics.
