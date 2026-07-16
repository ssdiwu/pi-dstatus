import { COMPONENT_IDS, type ComponentId, type DStatusConfig, type Overflow, type QuotaWindowMode, type StatusLine } from "./config.js";

export type SettingsFocus = "line" | "component";

export interface SettingsState {
  draft: DStatusConfig;
  selectedLine: number;
  selectedComponent: number;
  focus: SettingsFocus;
}

export function cloneConfig(config: DStatusConfig): DStatusConfig {
  return JSON.parse(JSON.stringify(config)) as DStatusConfig;
}

export function createSettingsState(config: DStatusConfig): SettingsState {
  return { draft: cloneConfig(config), selectedLine: 0, selectedComponent: 0, focus: "component" };
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
  return { ...state, draft: { ...state.draft, lines: [...state.draft.lines, line] }, selectedLine: state.draft.lines.length, selectedComponent: 0, focus: "line" };
}

export function removeSelectedLine(state: SettingsState): SettingsState {
  const lines = state.draft.lines.filter((_, index) => index !== state.selectedLine);
  return { ...state, draft: { ...state.draft, lines }, selectedLine: Math.min(state.selectedLine, lines.length - 1), selectedComponent: 0, focus: "line" };
}

export function moveLine(state: SettingsState, direction: -1 | 1): SettingsState {
  const target = state.selectedLine + direction;
  if (target < 0 || target >= state.draft.lines.length) return state;
  const lines = [...state.draft.lines];
  [lines[state.selectedLine], lines[target]] = [lines[target]!, lines[state.selectedLine]!];
  return { ...state, draft: { ...state.draft, lines }, selectedLine: target, focus: "line" };
}

export function addComponent(state: SettingsState, id?: ComponentId): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  const existing = new Set(line.components.map((component) => component.id));
  const next = id ?? COMPONENT_IDS.find((candidate) => candidate === "quota" || candidate === "statuses" || !existing.has(candidate)) ?? "statuses";
  const insertionIndex = Math.min(state.selectedComponent + 1, line.components.length);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine
    ? { ...candidate, components: [...candidate.components.slice(0, insertionIndex), { id: next }, ...candidate.components.slice(insertionIndex)] }
    : candidate);
  return { ...state, draft: { ...state.draft, lines }, selectedComponent: insertionIndex, focus: "component" };
}

export function removeSelectedComponent(state: SettingsState): SettingsState {
  const line = selectedLine(state);
  if (!line || line.components.length <= 1) return state;
  const components = line.components.filter((_, index) => index !== state.selectedComponent);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines }, selectedComponent: Math.min(state.selectedComponent, components.length - 1), focus: "component" };
}

export function replaceSelectedComponent(state: SettingsState, id: ComponentId): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  const components = line.components.map((component, index) => index === state.selectedComponent
    ? id === "quota" ? { id: "quota" as const } : id === "statuses" ? { id: "statuses" as const } : { id }
    : component);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines } };
}

export function moveComponent(state: SettingsState, direction: -1 | 1): SettingsState {
  const line = selectedLine(state);
  const component = line?.components[state.selectedComponent];
  if (!line || !component) return state;
  const target = state.selectedComponent + direction;
  if (target >= 0 && target < line.components.length) {
    const components = [...line.components];
    [components[state.selectedComponent], components[target]] = [components[target]!, components[state.selectedComponent]!];
    const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
    return { ...state, draft: { ...state.draft, lines }, selectedComponent: target, focus: "component" };
  }

  const targetLineIndex = state.selectedLine + direction;
  const targetLine = state.draft.lines[targetLineIndex];
  if (!targetLine) return state;
  const sourceComponents = line.components.filter((_, index) => index !== state.selectedComponent);
  const targetComponents = direction === -1
    ? [...targetLine.components, component]
    : [component, ...targetLine.components];
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine
    ? { ...candidate, components: sourceComponents }
    : index === targetLineIndex
      ? { ...candidate, components: targetComponents }
      : candidate);
  return {
    ...state,
    draft: { ...state.draft, lines },
    selectedLine: targetLineIndex,
    selectedComponent: direction === -1 ? targetComponents.length - 1 : 0,
    focus: "component",
  };
}

export function selectLine(state: SettingsState, direction: -1 | 1): SettingsState {
  if (state.draft.lines.length === 0) return state;
  const selectedLineIndex = Math.max(0, Math.min(state.draft.lines.length - 1, state.selectedLine + direction));
  const line = state.draft.lines[selectedLineIndex];
  return { ...state, selectedLine: selectedLineIndex, selectedComponent: Math.min(state.selectedComponent, Math.max(0, (line?.components.length ?? 1) - 1)), focus: "line" };
}

export function selectComponent(state: SettingsState, direction: -1 | 1): SettingsState {
  const line = selectedLine(state);
  if (!line) return state;
  return { ...state, selectedComponent: Math.max(0, Math.min(line.components.length - 1, state.selectedComponent + direction)), focus: "component" };
}

function modelSettings(state: SettingsState) {
  return state.draft.model ?? { showProvider: true };
}

function quotaSettings(state: SettingsState) {
  return state.draft.quota ?? { window: "5h" as const, showReset: false };
}

export function toggleModelProvider(state: SettingsState): SettingsState {
  const model = modelSettings(state);
  return { ...state, draft: { ...state.draft, model: { showProvider: !model.showProvider } } };
}

export function cycleQuotaWindow(state: SettingsState): SettingsState {
  const quota = quotaSettings(state);
  const window: QuotaWindowMode = quota.window === "5h" ? "all" : "5h";
  return { ...state, draft: { ...state.draft, quota: { ...quota, window } } };
}

export function toggleQuotaReset(state: SettingsState): SettingsState {
  const quota = quotaSettings(state);
  return { ...state, draft: { ...state.draft, quota: { ...quota, showReset: !quota.showReset } } };
}

export function setSelectedQuotaProvider(state: SettingsState, providerId: string): SettingsState {
  const line = selectedLine(state);
  if (!line || line.components[state.selectedComponent]?.id !== "quota") return state;
  const components = line.components.map((component, index) => index === state.selectedComponent ? { id: "quota" as const, key: providerId } : component);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines } };
}

export function setSelectedStatusKey(state: SettingsState, key: string): SettingsState {
  const line = selectedLine(state);
  if (!line || line.components[state.selectedComponent]?.id !== "statuses") return state;
  const components = line.components.map((component, index) => index === state.selectedComponent ? { id: "statuses" as const, key } : component);
  const lines = state.draft.lines.map((candidate, index) => index === state.selectedLine ? { ...candidate, components } : candidate);
  return { ...state, draft: { ...state.draft, lines } };
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
