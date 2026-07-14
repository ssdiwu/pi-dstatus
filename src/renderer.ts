import { visibleWidth } from "@earendil-works/pi-tui";
import type { ComponentId, DStatusConfig, Overflow, StatusComponent } from "./config.js";

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

export interface RenderState {
  cwd: string;
  git?: GitStatus;
  model?: string;
  thinking?: string;
  contextTokens?: number;
  contextWindow?: number;
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
  activity: { r: 125, g: 70, b: 75 },
  statuses: { r: 95, g: 82, b: 48 },
};
const ARROW = "";

export function componentLabel(id: ComponentId): string {
  return ({ dir: "DIR", git: "GIT", model: "MODEL", thinking: "THINK", context: "CTX", activity: "WORK", statuses: "STATUS" })[id];
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
    case "context": {
      if (state.contextTokens === undefined || state.contextWindow === undefined || state.contextWindow <= 0) return [];
      const used = formatTokenCount(state.contextTokens);
      const total = formatTokenCount(state.contextWindow);
      return [{ id, text: ` ◌ ${used} of ${total}`, compactText: ` ◌ ${used}`, priority: 5, bg }];
    }
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
