import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { addComponent, addLine, cancelSettings, createSettingsState, cycleGlobalOverflow, cycleQuotaWindow, cycleSelectedLineOverflow, moveComponent, moveLine, removeSelectedComponent, removeSelectedLine, replaceSelectedComponent, saveSettings, selectComponent, selectLine, setSelectedQuotaProvider, setSelectedStatusKey, toggleModelProvider, toggleQuotaReset } from "../src/settings-model.js";

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
    state = removeSelectedLine(state);
    expect(state.draft.lines).toHaveLength(0);
    expect(saved.lines).toHaveLength(1);
  });

  it("uses one focus model for line and component movement", () => {
    let state = createSettingsState(defaultConfig());
    state = addLine(state);
    expect(state.focus).toBe("line");
    state = selectLine(state, -1);
    expect(state.focus).toBe("line");
    state = selectComponent(state, 1);
    expect(state.focus).toBe("component");
    state = moveComponent(state, 1);
    expect(state.focus).toBe("component");
  });

  it("inserts a component to the right of the current selection", () => {
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "dir" }, { id: "git" }];
    let state = createSettingsState(config);
    state = addComponent(state, "statuses");
    expect(state.draft.lines[0]!.components.map((component) => component.id)).toEqual(["dir", "statuses", "git"]);
    expect(state.selectedComponent).toBe(1);
    state = removeSelectedComponent(state);
    expect(state.draft.lines[0]!.components).toHaveLength(2);
  });

  it("moves a component across lines and retains an empty source line", () => {
    let state = createSettingsState({
      ...defaultConfig(),
      lines: [
        { id: "first", components: [{ id: "dir" }] },
        { id: "second", components: [{ id: "git" }, { id: "model" }] },
      ],
    });
    state = moveComponent(state, 1);
    expect(state.draft.lines.map((line) => line.components.map((component) => component.id))).toEqual([
      [],
      ["dir", "git", "model"],
    ]);
    expect([state.selectedLine, state.selectedComponent]).toEqual([1, 0]);
    state = moveComponent(state, -1);
    expect(state.draft.lines.map((line) => line.components.map((component) => component.id))).toEqual([
      ["dir"],
      ["git", "model"],
    ]);
    expect([state.selectedLine, state.selectedComponent]).toEqual([0, 0]);
  });

  it("replaces the selected component", () => {
    let state = createSettingsState(defaultConfig());
    state = replaceSelectedComponent(state, "quota");
    expect(state.draft.lines[0]!.components[0]!.id).toBe("quota");
  });

  it("toggles model provider visibility", () => {
    let state = createSettingsState(defaultConfig());
    state = toggleModelProvider(state);
    expect(state.draft.model).toEqual({ showProvider: false });
  });

  it("updates quota display settings and selected provider component", () => {
    let state = createSettingsState(defaultConfig());
    state = { ...state, selectedComponent: 6 };
    state = cycleQuotaWindow(state);
    state = toggleQuotaReset(state);
    state = setSelectedQuotaProvider(state, "zai-coding-cn");
    expect(state.draft.quota).toEqual({ window: "all", showReset: true });
    expect(state.draft.lines[0]!.components[6]).toEqual({ id: "quota", key: "zai-coding-cn" });
  });

  it("binds a statuses component to one status key", () => {
    let state = createSettingsState(defaultConfig());
    state = { ...state, draft: { ...state.draft, lines: [{ id: "only", components: [{ id: "statuses" }] }] } };
    state = setSelectedStatusKey(state, "dteam");
    expect(state.draft.lines[0]!.components).toEqual([{ id: "statuses", key: "dteam" }]);
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
