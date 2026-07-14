import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import { COMPONENT_IDS, type ComponentId, type DStatusConfig } from "./config.js";
import { renderStatusLines, type RenderState } from "./renderer.js";
import {
  addComponent, addLine, createSettingsState, cycleGlobalOverflow,
  cycleSelectedLineOverflow, moveComponent, moveLine, removeSelectedComponent,
  removeSelectedLine, replaceSelectedComponent, saveSettings, cancelSettings, selectComponent, selectLine,
} from "./settings-model.js";

const componentNames: Record<string, string> = {
  dir: "目录", git: "Git", model: "模型", thinking: "思考", context: "上下文（旧）", quota: "配额", activity: "工作动画", statuses: "扩展状态",
};

export async function openSettings(
  ctx: ExtensionCommandContext,
  config: DStatusConfig,
  getRenderState: () => RenderState,
): Promise<DStatusConfig | undefined> {
  if (ctx.mode !== "tui") {
    ctx.ui.notify("/dstatus 需要在 Pi TUI 模式运行", "warning");
    return undefined;
  }
  return ctx.ui.custom<DStatusConfig | undefined>((tui, theme, _keybindings, done) => {
    let state = createSettingsState(config);
    let pickerIndex: number | undefined;
    let pickerMode: "add" | "replace" = "add";
    const component: Component = {
      render(width: number): string[] {
        const lines: string[] = [];
        const title = theme.fg("accent", theme.bold(" dstatus 设置 "));
        lines.push(title);
        lines.push(theme.fg("muted", `全局溢出: ${state.draft.overflow}   [o]切换`));
        if (pickerIndex !== undefined) {
          lines.push("");
          lines.push(theme.fg("accent", pickerMode === "replace" ? "选择要替换的组件" : "选择要加入的组件"));
          COMPONENT_IDS.forEach((id, index) => {
            const marker = index === pickerIndex ? theme.fg("accent", "❯ ") : "  ";
            lines.push(`${marker}${componentNames[id]}`);
          });
        }
        lines.push("");
        lines.push(theme.fg("muted", `当前行: ${state.selectedLine + 1} · 当前组件: ${state.selectedComponent + 1}`));
        state.draft.lines.forEach((line, index) => {
          const selected = index === state.selectedLine;
          const marker = selected ? theme.fg("accent", "❯ ") : "  ";
          const overflow = line.overflow ? ` (${line.overflow})` : " (继承)";
          const parts = line.components.map((item, itemIndex) => {
            const label = componentNames[item.id] ?? item.id;
            return selected && itemIndex === state.selectedComponent
              ? theme.fg("accent", `⟦${label}⟧`)
              : label;
          }).join(" · ");
          lines.push(`${marker}${index + 1}. ${parts}${overflow}`);
        });
        lines.push("");
        lines.push(theme.fg("accent", "实时预览"));
        const preview = renderStatusLines(state.draft, getRenderState(), Math.max(20, width - 2), (segments) => segments.map((s) => s.text.trim()).join(" | "));
        lines.push(...(preview.length ? preview.map((line) => theme.fg("text", `  ${line}`)) : [theme.fg("dim", "  (空) ")]));
        lines.push("");
        lines.push(theme.fg("dim", "↑↓ 行  ←→ 组件  a 新行  c 修改组件  n 新增组件  x 删除组件  [ 上移组件  ] 下移组件  u/j 行排序  r 行溢出  o 全局  s 保存  Esc 取消"));
        return lines.map((line) => truncateToWidth(line, width, ""));
      },
      handleInput(data: string): void {
        if (pickerIndex !== undefined) {
          if (matchesKey(data, "escape")) pickerIndex = undefined;
          else if (matchesKey(data, "up")) pickerIndex = (pickerIndex - 1 + COMPONENT_IDS.length) % COMPONENT_IDS.length;
          else if (matchesKey(data, "down")) pickerIndex = (pickerIndex + 1) % COMPONENT_IDS.length;
          else if (matchesKey(data, "enter")) {
            const id = COMPONENT_IDS[pickerIndex] as ComponentId;
            state = pickerMode === "replace"
              ? replaceSelectedComponent(state, id)
              : addComponent(state, id);
            pickerIndex = undefined;
          }
          this.invalidate();
          tui.requestRender();
          return;
        }

        if (matchesKey(data, "escape")) { done(cancelSettings()); return; }
        if (matchesKey(data, "up")) state = selectLine(state, -1);
        else if (matchesKey(data, "down")) state = selectLine(state, 1);
        else if (matchesKey(data, "left")) state = selectComponent(state, -1);
        else if (matchesKey(data, "right")) state = selectComponent(state, 1);
        else if (data === "a") state = addLine(state);
        else if (data === "d") state = removeSelectedLine(state);
        else if (data === "c") {
          pickerMode = "replace";
          pickerIndex = Math.max(0, COMPONENT_IDS.indexOf(state.draft.lines[state.selectedLine]?.components[state.selectedComponent]?.id ?? "quota"));
        }
        else if (data === "n") {
          pickerMode = "add";
          pickerIndex = 0;
        }
        else if (data === "x") state = removeSelectedComponent(state);
        else if (data === "u") state = moveLine(state, -1);
        else if (data === "j") state = moveLine(state, 1);
        else if (data === "[") state = moveComponent(state, -1);
        else if (data === "]") state = moveComponent(state, 1);
        else if (data === "o") state = cycleGlobalOverflow(state);
        else if (data === "r") state = cycleSelectedLineOverflow(state);
        else if (data === "s" || matchesKey(data, "enter")) { done(saveSettings(state)); return; }
        this.invalidate();
        tui.requestRender();
      },
      invalidate(): void {},
    };
    return component;
  });
}
