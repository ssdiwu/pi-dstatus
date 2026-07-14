import { visibleWidth } from "@earendil-works/pi-tui";
import type { ComponentId, DStatusConfig, Overflow, QuotaSettings, StatusComponent } from "./config.js";

export interface GitStatus {
  branch: string;
  staged: number;
  modified: number;
  untracked: number;
}

export interface ActivityStatus {
  text: string;
  active: boolean;
}

export interface QuotaWindow {
  id: string;
  label?: string;
  used?: number;
  limit?: number;
  usedPercent?: number;
  remainingPercent?: number;
  resetLabel?: string;
}

export interface QuotaDisplay {
  text: string;
  compactText: string;
  bar: string;
}

export interface QuotaGroup {
  id: string;
  label: string;
  windows: readonly QuotaWindow[];
  error?: string;
}

export interface RenderState {
  cwd: string;
  git?: GitStatus;
  model?: string;
  thinking?: string;
  quotas?: readonly QuotaWindow[];
  quotaGroups?: readonly QuotaGroup[];
  quotaSettings?: QuotaSettings;
  activity?: ActivityStatus;
  statuses: ReadonlyMap<string, string>;
}

export interface RenderSegment {
  id: ComponentId | string;
  text: string;
  compactText?: string;
  priority: number;
  bg: RGB;
}

export interface RGB { r: number; g: number; b: number }
export type SegmentStyle = (segments: RenderSegment[]) => string;

const COLORS: Record<ComponentId, RGB> = {
  dir: { r: 45, g: 85, b: 125 },
  git: { r: 65, g: 105, b: 78 },
  model: { r: 100, g: 72, b: 125 },
  thinking: { r: 130, g: 88, b: 48 },
  context: { r: 46, g: 110, b: 110 },
  quota: { r: 46, g: 110, b: 110 },
  activity: { r: 125, g: 70, b: 75 },
  statuses: { r: 95, g: 82, b: 48 },
};
const ARROW = "";
const QUOTA_GROUP_COLORS: RGB[] = [
  { r: 38, g: 122, b: 117 },
  { r: 47, g: 103, b: 131 },
  { r: 64, g: 116, b: 91 },
  { r: 91, g: 91, b: 132 },
];

export function componentLabel(id: ComponentId): string {
  return ({ dir: "DIR", git: "GIT", model: "MODEL", thinking: "THINK", context: "CTX", quota: "QUOTA", activity: "WORK", statuses: "STATUS" })[id];
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/$/, "");
  return normalized.split("/").pop() || normalized;
}

function sanitizeText(value: string): string {
  return value
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001f\u007f\u0080-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortModel(model: string): string {
  const value = model.includes("/") ? model.split("/").pop() ?? model : model;
  return sanitizeText(value.replace(/\([^)]*context[^)]*\)/i, ""));
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.max(0, Math.round(value)));
}

function formatQuotaBar(percent: number, width = 10): string {
  const safePercent = Math.max(0, Math.min(100, percent));
  const filled = Math.floor((safePercent / 100) * width);
  return `${"━".repeat(filled)}${"─".repeat(width - filled)}`;
}

export function renderQuotaWindow(quota: QuotaWindow): QuotaDisplay | undefined {
  const hasAmounts = quota.used !== undefined && quota.limit !== undefined && quota.limit > 0;
  const usedPercent = hasAmounts
    ? quota.usedPercent ?? (quota.used! / quota.limit!) * 100
    : quota.usedPercent;
  const remainingPercent = quota.remainingPercent;
  let text: string;
  let compactText: string;
  let barPercent: number;

  if (hasAmounts && usedPercent !== undefined) {
    barPercent = usedPercent;
    const bar = formatQuotaBar(barPercent);
    text = `${Math.round(usedPercent)}% ${bar} · ${formatTokenCount(quota.used!)} of ${formatTokenCount(quota.limit!)}`;
    compactText = `${Math.round(usedPercent)}% ${bar}`;
  } else if (remainingPercent !== undefined) {
    barPercent = remainingPercent;
    const prefix = quota.label ? `${sanitizeText(quota.label)} ` : "";
    const bar = formatQuotaBar(barPercent);
    text = `${prefix}${Math.round(remainingPercent)}% left ${bar}${quota.resetLabel ? ` · ${sanitizeText(quota.resetLabel)}` : ""}`;
    compactText = `${prefix}${Math.round(remainingPercent)}% ${bar}`;
  } else {
    return undefined;
  }

  return { text, compactText, bar: formatQuotaBar(barPercent) };
}

function quotaSegments(quotas: readonly QuotaWindow[] | undefined, id: ComponentId | string, bg: RGB, priority: number): RenderSegment[] {
  return (quotas ?? []).flatMap((quota, index) => {
    const display = renderQuotaWindow(quota);
    if (!display) return [];
    return [{ id: `${id}:${quota.id}`, text: ` ◌ ${display.text}`, compactText: ` ◌ ${display.compactText}`, priority: priority + index, bg }];
  });
}

function isFiveHourWindow(quota: QuotaWindow): boolean {
  return quota.id === "5h" || /(^|[-_\s])5h($|[-_\s])/i.test(`${quota.id} ${quota.label ?? ""}`);
}

function quotaGroupColor(id: string): RGB {
  const hash = Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0);
  return QUOTA_GROUP_COLORS[hash % QUOTA_GROUP_COLORS.length]!;
}

function quotaGroupSegments(groups: readonly QuotaGroup[] | undefined, id: ComponentId | string, priority: number, settings: QuotaSettings = { window: "5h", showReset: false }, providerId?: string): RenderSegment[] {
  if (!providerId) return [];
  return (groups ?? []).flatMap((group, index) => {
    if (providerId !== undefined && group.id !== providerId) return [];
    const label = sanitizeText(group.label);
    if (!label) return [];
    const windows = group.windows
      .filter((quota) => settings.window === "all" || isFiveHourWindow(quota))
      .map((quota) => settings.showReset ? quota : { ...quota, resetLabel: undefined })
      .map(renderQuotaWindow)
      .filter((display): display is QuotaDisplay => display !== undefined);
    const error = group.error ? sanitizeText(group.error) : "";
    if (windows.length === 0 && !error) return [];
    const windowText = windows.map((display) => display.text).join("  ");
    const compactWindowText = windows[0]?.compactText ?? "";
    const text = error ? ` ${label} · ${error}` : ` ${label} ${windowText}`;
    const compactText = error ? ` ${label} · ${error}` : ` ${label} ${compactWindowText}`;
    return [{ id: `${id}:${group.id}`, text, compactText, priority: priority + index, bg: quotaGroupColor(group.id) }];
  });
}

function renderComponent(component: StatusComponent, state: RenderState): RenderSegment[] {
  const id = component.id;
  const bg = COLORS[id];
  switch (id) {
    case "dir":
      {
        const directory = sanitizeText(basename(state.cwd));
        return directory ? [{ id, text: ` ${directory}`, compactText: ` ${directory}`, priority: 1, bg }] : [];
      }
    case "git": {
      if (!state.git?.branch) return [];
      const counts = [state.git.staged ? `+${state.git.staged}` : "", state.git.modified ? `~${state.git.modified}` : "", state.git.untracked ? `?${state.git.untracked}` : ""].filter(Boolean).join(" ");
      const branch = sanitizeText(state.git.branch);
      return branch ? [{ id, text: `  ${branch}${counts ? ` ${counts}` : ""}`, compactText: `  ${branch}`, priority: 2, bg }] : [];
    }
    case "model":
      return state.model ? [{ id, text: ` ◈ ${shortModel(state.model)}`, compactText: ` ◈ ${shortModel(state.model)}`, priority: 3, bg }] : [];
    case "thinking":
      return state.thinking ? [{ id, text: ` ◎ ${state.thinking}`, compactText: ` ◎ ${state.thinking}`, priority: 4, bg }] : [];
    case "context":
      return quotaSegments(state.quotas?.filter((quota) => quota.id === "context"), id, bg, 5);
    case "quota":
      return quotaGroupSegments(state.quotaGroups, id, 5, state.quotaSettings, component.key);
    case "activity":
      return state.activity?.active ? [{ id, text: ` ${sanitizeText(state.activity.text)}`, compactText: " ···", priority: 6, bg }] : [];
    case "statuses":
      return Array.from(state.statuses.entries()).map(([key, text], index) => {
        const safeKey = sanitizeText(key);
        const safeText = sanitizeText(text);
        return { id: `${id}:${safeKey}`, text: ` ${safeText}`, compactText: ` ${safeKey}`, priority: 10 + index, bg };
      }).filter((segment) => segment.text.trim() !== "");
  }
}

export function collectSegments(components: StatusComponent[], state: RenderState): RenderSegment[] {
  return components.flatMap((component) => renderComponent(component, state));
}

function segmentWidth(segment: RenderSegment, compact: boolean): number {
  return visibleWidth(compact ? segment.compactText ?? segment.text : segment.text) + 2;
}

function fitSegments(segments: RenderSegment[], width: number, overflow: Overflow): RenderSegment[] {
  if (segments.length === 0) return [];
  if (overflow === "wrap") return segments;
  const compacted = overflow === "collapse" ? segments.map((segment) => ({ ...segment, text: segment.compactText ?? segment.text })) : segments;
  const result: RenderSegment[] = [];
  let used = 0;
  for (const segment of compacted) {
    const candidateWidth = segmentWidth(segment, false);
    if (used + candidateWidth <= width || result.length === 0) {
      result.push(segment);
      used += Math.min(candidateWidth, width);
    } else if (overflow === "collapse") {
      break;
    } else {
      break;
    }
  }
  return result;
}

function wrapSegments(segments: RenderSegment[], width: number): RenderSegment[][] {
  const rows: RenderSegment[][] = [];
  let row: RenderSegment[] = [];
  let used = 0;
  for (const segment of segments) {
    const itemWidth = segmentWidth(segment, false);
    if (row.length > 0 && used + itemWidth > width) {
      rows.push(row);
      row = [];
      used = 0;
    }
    if (itemWidth > width) {
      row.push({ ...segment, text: truncateVisible(segment.text, Math.max(0, width - 1)) });
      rows.push(row);
      row = [];
      used = 0;
      continue;
    }
    row.push(segment);
    used += itemWidth;
  }
  if (row.length) rows.push(row);
  return rows;
}

function truncateVisible(text: string, width: number): string {
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  let result = "";
  let used = 0;
  for (const character of Array.from(text)) {
    const characterWidth = visibleWidth(character);
    if (used + characterWidth > width) break;
    result += character;
    used += characterWidth;
  }
  return result;
}

export function defaultSegmentStyle(segments: RenderSegment[]): string {
  let result = "";
  let previous: RGB | undefined;
  for (const segment of segments) {
    const { r, g, b } = segment.bg;
    if (previous) {
      result += `\x1b[38;2;${previous.r};${previous.g};${previous.b}m\x1b[48;2;${r};${g};${b}m${ARROW}`;
    }
    result += `\x1b[48;2;${r};${g};${b}m\x1b[38;2;255;255;255m${segment.text} `;
    previous = segment.bg;
  }
  return `${result}\x1b[0m`;
}

export function renderStatusLines(config: DStatusConfig, state: RenderState, width: number, style: SegmentStyle = defaultSegmentStyle): string[] {
  if (width <= 0) return [];
  const lines: string[] = [];
  for (const line of config.lines) {
    const segments = collectSegments(line.components, state);
    const overflow = line.overflow ?? config.overflow;
    const rows = overflow === "wrap" ? wrapSegments(segments, width) : [fitSegments(segments, width, overflow)];
    for (const row of rows) {
      if (row.length === 0) continue;
      const rendered = style(row);
      // Segment text is clamped before styling, so ANSI control sequences are never sliced.
      if (visibleWidth(rendered) > width) {
        const safeRow = row.map((segment) => ({ ...segment, text: truncateVisible(segment.text, Math.max(0, width - 1)) }));
        lines.push(style(safeRow));
      } else {
        lines.push(rendered);
      }
    }
  }
  return lines;
}
