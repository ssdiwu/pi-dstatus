# Changelog

This project follows the basic format of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). For tagged releases, use the version from the Git tag. The tagged release is maintained by the release owner in this English `CHANGELOG.md`; daily user-perceivable changes are recorded in the Chinese `CHANGELOG-zh.md` in this repository. Both files contain user-perceivable facts only and ship in the npm package.

For new releases, use headings in the format `## [x.y.z] - YYYY-MM-DD`. When an entry can be linked unambiguously to a GitHub issue, append `(#xx)`. Historical entries keep their original heading format.

## [Unreleased]

## [0.0.4] - 2026-11-25

### Added

- Added an `xai` quota component to the new default footer layout; existing user configurations are not rewritten automatically, and the dynamically discovered xAI provider can be bound manually in `/dstatus`.

### Changed

- Supports Pi 1.6.0.
- For quota `5h` window ranges, when the provider has no short window, the first available window is now shown instead, so xAI quotas that only have a week window are not hidden.

## [0.0.3] - 2026-07-16

### Added

- Added a standalone `fast` footer component that shows `FAST` or `FAST · inactive` from the `pi-dfast/updated` public snapshot and hides itself when off.

### Changed

- Components added in `/dstatus` are inserted to the right of the current component by default; when a component keeps moving at the start or end of a line it can cross logical lines, and blank lines are preserved.

### Fixed

- `/dstatus` can now delete the last logical line; the live footer re-reads the configuration every minute to pick up external layout changes.

## [0.0.2] - 2026-07-14

### Added

- Added configurable components for session name, input/output tokens, cache hit rate, and cost, with accounting aligned to Pi's default footer.
- Subscribes to `pi-dusage/updated` structured snapshots for dynamic provider/model discovery; context and each individual quota component render separately, with `StatusComponent.key` bound to a specific usage query.
- The settings panel consolidates row-level and component-level configuration into a context settings panel opened with Enter.

### Changed

- The model component can display the provider and be toggled in `/dstatus`.
- Quota status uses a compact 10-cell progress bar, token units, and short provider labels to reduce footer footprint.
- Quota and statuses support independent bindings, and the settings panel syncs live public state and quota discovery results in real time.

### Fixed

- No longer treats the `pi-dusage` long-text fallback as the only quota display; duplicate status text is cleared when structured data is available.
- Quota components without a bound provider/model no longer render every quota, avoiding duplicate long text from newly added components.
- `statuses` supports displaying runtime-discovered states such as `mcp`, `dgoal`, and `dteam` independently by key; quota provider text no longer shows `left`.
- Syncs footer state proactively when opening `/dstatus` settings, so the picker does not show "no available status".
- Fixed unknown context usage being incorrectly shown as `0%`, settings sub-panels responding to parent shortcuts, and configuration keys not being sanitized before entering the TUI.
- Cache hit rate is now accumulated per current session, avoiding a different accounting basis from cumulative cached tokens.

## [0.0.1] - 2026-07-14

### Added

- Multi-logical-line Powerline status bar and a `/dstatus` settings entry point.
- Global configuration and per-logical-line overrides for the `wrap`, `collapse`, and `hide` overflow strategies.
- Automatic status display based on Pi's public extension state protocol.
- A reusable `quota` window component supporting context usage percentage and single-line progress display.

### Changed

- The default configuration is now a single logical line containing all components, with automatic wrapping on narrow terminals.
- The settings panel distinguishes editing the current component from adding a new one and shows a clear current-selection state.
- The model component shows a provider prefix and model name, with provider display toggleable in settings; the context component prioritizes the percentage, a compact 10-cell micro progress bar, and compact token usage, e.g. `87% ━━━━━━━━── · 324K/372K`.
