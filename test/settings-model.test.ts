import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { addComponent, addLine, cancelSettings, createSettingsState, cycleGlobalOverflow, cycleQuotaWindow, cycleSelectedLineOverflow, moveComponent, moveLine, removeSelectedComponent, removeSelectedLine, replaceSelectedComponent, saveSettings, setSelectedQuotaProvider, toggleQuotaReset } from "../src/settings-model.js";

describe("settings model", () => {
  it("edits, reorders, and removes lines without mutating saved config", () => {
    const saved = defaultConfig();
    let state = createSettingsState(saved);
    state = addLine(state);
    expect(state.draft.lines).toHaveLength(2);
    state = moveLine(state, -1);
    expect(state.selectedLine).toBe(0);
    state = removeSelectedLine(state);
    expect(state.draft.lines).toHaveLength(1);
    expect(saved.lines).toHaveLength(1);
  });

  it("edits component order and lifecycle", () => {
    let state = createSettingsState(defaultConfig());
    state = addComponent(state, "statuses");
    expect(state.draft.lines[0]!.components.at(-1)?.id).toBe("statuses");
    state = moveComponent(state, -1);
    expect(state.draft.lines[0]!.components.at(-2)?.id).toBe("statuses");
    state = removeSelectedComponent(state);
    expect(state.draft.lines[0]!.components).toHaveLength(10);
  });

  it("replaces the selected component", () => {
    let state = createSettingsState(defaultConfig());
    state = replaceSelectedComponent(state, "quota");
    expect(state.draft.lines[0]!.components[0]!.id).toBe("quota");
  });

  it("updates quota display settings and selected provider component", () => {
    let state = createSettingsState(defaultConfig());
    state = { ...state, selectedComponent: 5 };
    state = cycleQuotaWindow(state);
    state = toggleQuotaReset(state);
    state = setSelectedQuotaProvider(state, "zai-coding-cn");
    expect(state.draft.quota).toEqual({ window: "all", showReset: true });
    expect(state.draft.lines[0]!.components[5]).toEqual({ id: "quota", key: "zai-coding-cn" });
  });

  it("cycles global and line overflow", () => {
    let state = createSettingsState(defaultConfig());
    state = cycleGlobalOverflow(state);
    expect(state.draft.overflow).toBe("collapse");
    state = cycleSelectedLineOverflow(state);
    expect(state.draft.lines[0]!.overflow).toBe("wrap");
  });

  it("commits edited drafts and cancels without a value", () => {
    let state = createSettingsState(defaultConfig());
    state = cycleGlobalOverflow(state);
    const saved = saveSettings(state);
    expect(saved.overflow).toBe("collapse");
    expect(saved).not.toBe(state.draft);
    expect(cancelSettings()).toBeUndefined();
  });
});
