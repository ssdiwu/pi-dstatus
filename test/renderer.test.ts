import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { defaultSegmentStyle, renderQuotaWindow, renderStatusLines } from "../src/renderer.js";
import { visibleWidth } from "@earendil-works/pi-tui";

const state = {
  cwd: "/Users/507/project",
  git: { branch: "main", staged: 2, modified: 3, untracked: 1 },
  model: "anthropic/claude-sonnet-4",
  thinking: "high",
  quotas: [{ id: "context", used: 57_000, limit: 128_000 }],
  activity: { active: true, text: "bash" },
  statuses: new Map([["mcp", "MCP: 2/2 servers"], ["empty", ""]]),
};
const plain = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join("");

describe("status renderer", () => {
  it("draws Powerline separators from the previous block into the next block", () => {
    const output = defaultSegmentStyle([
      { id: "a", text: " A", priority: 1, bg: { r: 255, g: 0, b: 0 } },
      { id: "b", text: " B", priority: 2, bg: { r: 0, g: 0, b: 255 } },
    ]);
    expect(output).toContain("\x1b[38;2;255;0;0m\x1b[48;2;0;0;255m");
  });

  it("renders context and remaining quota windows through the same formatter", () => {
    expect(renderQuotaWindow({ id: "context", used: 324_000, limit: 372_000 })).toEqual({ text: "87% ━━━━━━━━── · 324K of 372K", compactText: "87% ━━━━━━━━──", bar: "━━━━━━━━──" });
    expect(renderQuotaWindow({ id: "5h", label: "5h", remainingPercent: 73, resetLabel: "reset 14:20" })).toEqual({ text: "5h 73% left ━━━━━━━─── · reset 14:20", compactText: "5h 73% ━━━━━━━───", bar: "━━━━━━━───" });
  });

  it("renders all default data and removes empty statuses", () => {
    const lines = renderStatusLines(defaultConfig(), state, 200, plain);
    expect(lines).toHaveLength(1);
    expect(lines.join("\n")).toContain("project");
    expect(lines.join("\n")).toContain("MCP: 2/2 servers");
    expect(lines.join("\n")).toContain("57K of 128K");
    expect(lines.join("\n")).not.toContain("empty");
  });

  it("wraps a logical line into multiple physical lines without exceeding width", () => {
    const config = defaultConfig();
    config.lines = [{ id: "one", components: [...config.lines[0]!.components, ...config.lines[0]!.components] }];
    const lines = renderStatusLines(config, state, 20, plain);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => visibleWidth(line) <= 20)).toBe(true);
  });

  it("honors line-level overflow overrides against the global strategy", () => {
    const components = defaultConfig().lines[0]!.components;
    const globalHide = { version: 1 as const, overflow: "hide" as const, lines: [{ id: "only", components, overflow: "wrap" as const }] };
    const lineHide = { version: 1 as const, overflow: "wrap" as const, lines: [{ id: "only", components, overflow: "hide" as const }] };
    const inheritedLines = renderStatusLines(globalHide, state, 20, plain);
    const overriddenLines = renderStatusLines(lineHide, state, 20, plain);
    expect(inheritedLines.join(" ")).toContain("claude");
    expect(inheritedLines.length).toBeGreaterThan(1);
    expect(overriddenLines).toHaveLength(1);
    expect(overriddenLines[0]).not.toContain("claude");
  });

  it("supports collapse and hide at line level", () => {
    const components = defaultConfig().lines[0]!.components;
    const collapse = { version: 1 as const, overflow: "wrap" as const, lines: [{ id: "only", components, overflow: "collapse" as const }] };
    const hidden = { version: 1 as const, overflow: "wrap" as const, lines: [{ id: "only", components, overflow: "hide" as const }] };
    const collapsed = renderStatusLines(collapse, state, 20, plain);
    const hiddenLines = renderStatusLines(hidden, state, 20, plain);
    expect(collapsed).toHaveLength(1);
    expect(hiddenLines).toHaveLength(1);
    expect(collapsed[0]).toContain("project");
    expect(hiddenLines[0]).toContain("project");
    expect(hiddenLines[0]).not.toContain("claude");
  });

  it("keeps Powerline output within width", () => {
    const lines = renderStatusLines(defaultConfig(), state, 30);
    expect(lines.every((line) => visibleWidth(line) <= 30)).toBe(true);
  });

  it("hides every component when its public data is missing", () => {
    const missing = {
      cwd: "",
      quotas: [],
      statuses: new Map<string, string>(),
    };
    for (const id of ["dir", "git", "model", "thinking", "context", "quota", "activity", "statuses"] as const) {
      const config = { version: 1 as const, overflow: "wrap" as const, lines: [{ id: "only", components: [{ id }] }] };
      expect(renderStatusLines(config, missing, 80, plain), id).toEqual([]);
    }
  });

  it("removes terminal controls and newlines from directory and status text", () => {
    const unsafe = {
      ...state,
      cwd: "/safe\n\x1b[2J\u0085evil",
      git: { ...state.git!, branch: "main\n\x1b[H" },
      statuses: new Map([["bad", "status\n\x1b[2K\u009b"]]),
    };
    const output = renderStatusLines(defaultConfig(), unsafe, 200, plain).join("");
    expect(output).not.toMatch(/[\r\n\x1b\u0080-\u009f]/);
    expect(output).toContain("evil");
    expect(output).toContain("status");
  });

  it("never exceeds widths 1 through 40 with wide characters", () => {
    const wideState = {
      ...state,
      cwd: "/项目/非常长的目录",
      quotas: [{ id: "context", used: 300_000, limit: 372_000 }],
      statuses: new Map([["扩展", "扩展状态很长"]]),
    };
    for (const overflow of ["wrap", "collapse", "hide"] as const) {
      const config = defaultConfig();
      config.overflow = overflow;
      config.lines[0]!.overflow = overflow;
      for (let width = 1; width <= 40; width++) {
        const lines = renderStatusLines(config, wideState, width);
        expect(lines.every((line) => visibleWidth(line) <= width), `${overflow}:${width}`).toBe(true);
      }
    }
  });
});
