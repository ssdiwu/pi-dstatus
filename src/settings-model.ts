import { COMPONENT_IDS, type ComponentId, type DStatusConfig, type Overflow, type StatusLine } from "./config.js";

export interface SettingsState {
  draft: DStatusConfig;
  selectedLine: number;
  selectedComponent: number;
}

export function cloneConfig(config: DStatusConfig): DStatusConfig {
  return JSON.parse(JSON.stringify(config)) as DStatusConfig;
}

export function createSettingsState(config: DStatusConfig): SettingsState {
  return { draft: cloneConfig(config), selectedLine: 0, selectedComponent: 0 };
}

export function saveSettings(state: SettingsState): DStatusConfig {
  return cloneConfig(state.draft);
}

export function cancelSettings(): undefined {
  return undefined;
}

function selectedLine(state: SettingsState): StatusLine | undefined {
  return state.draft.lines[state.selectedLine];
}

export function addLine(state: SettingsState): SettingsState {
  const line: StatusLine = { id: `line-${Date.now()}`, components: [{ id: "dir" }] };
  return { ...state, draft: { ...state.draft, lines: [...state.draft.lines, line] }, selectedLine: state.draft.lines.length, selectedComponent: 0 };
}

export function removeSelectedLine(state: SettingsState): SettingsState {
  if (state.draft.lines.length <= 1) return state;
  const lines = state.draft.lines.filter((_, index) => index !== state.selectedLine);
  return { ...state, draft: { ...state.draft, lines }, selectedLine: Math.min(state.selectedLine, lines.length - 1), selectedComponent: 0 };
}

export function moveLine(state: SettingsState, direction: -1 | 1): SettingsState {
  const target = state.selectedLine + direction;
  if (target < 0 || target >= state.draft.lines.length) return state;
  const lines = [...state.draft.lines];
  [lines[state.selectedLine], lines[target]] = [lines[target]!, lines[state.selectedLine]!];
  return { ...state, draft: { ...state.draft, lines }, selectedLine: target };
}

export function addComponent(state: SettingsState, id?: ComponentId): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  const existing = new Set(line.components.map((component) => component.id));
  const next = id ?? COMPONENT_IDS.find((candidate) => !existing.has(candidate)) ?? "statuses";
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine
    ? { ...candidate, components: [...candidate.components, { id: next }] }
    : candidate);
  return { ...state, draft: { ...state.draft, lines }, selectedComponent: line.components.length };
}

export function removeSelectedComponent(state: SettingsState): SettingsState {
  const line = selectedLine(state);
  if (!line || line.components.length <= 1) return state;
  const components = line.components.filter((_, index) => index !== state.selectedComponent);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines }, selectedComponent: Math.min(state.selectedComponent, components.length - 1) };
}

export function moveComponent(state: SettingsState, direction: -1 | 1): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  const target = state.selectedComponent + direction;
  if (target < 0 || target >= line.components.length) return state;
  const components = [...line.components];
  [components[state.selectedComponent], components[target]] = [components[target]!, components[state.selectedComponent]!];
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines }, selectedComponent: target };
}

export function selectLine(state: SettingsState, direction: -1 | 1): SettingsState {
  if (state.draft.lines.length === 0) return state;
  const selectedLineIndex = Math.max(0, Math.min(state.draft.lines.length - 1, state.selectedLine + direction));
  const line = state.draft.lines[selectedLineIndex];
  return { ...state, selectedLine: selectedLineIndex, selectedComponent: Math.min(state.selectedComponent, Math.max(0, (line?.components.length ?? 1) - 1)) };
}

export function selectComponent(state: SettingsState, direction: -1 | 1): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  return { ...state, selectedComponent: Math.max(0, Math.min(line.components.length - 1, state.selectedComponent + direction)) };
}

export function cycleGlobalOverflow(state: SettingsState): SettingsState {
  const values: Overflow[] = ["wrap", "collapse", "hide"];
  const next = values[(values.indexOf(state.draft.overflow) + 1) % values.length]!;
  return { ...state, draft: { ...state.draft, overflow: next } };
}

export function cycleSelectedLineOverflow(state: SettingsState): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  const values: Array<Overflow | undefined> = [undefined, "wrap", "collapse", "hide"];
  const next = values[(values.indexOf(line.overflow) + 1) % values.length];
  const updated: StatusLine = { ...line };
  if (next) updated.overflow = next; else delete updated.overflow;
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? updated : candidate);
  return { ...state, draft: { ...state.draft, lines } };
}
