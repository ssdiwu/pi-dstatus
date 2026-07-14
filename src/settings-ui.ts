import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import { COMPONENT_IDS, type ComponentId, type DStatusConfig } from "./config.js";
import { renderStatusLines, type RenderState } from "./renderer.js";
import {
  addComponent, addLine, createSettingsState, cycleGlobalOverflow, cycleQuotaWindow,
  cycleSelectedLineOverflow, moveComponent, moveLine, removeSelectedComponent, setSelectedQuotaProvider, setSelectedStatusKey, toggleModelProvider, toggleQuotaReset,
  removeSelectedLine, replaceSelectedComponent, saveSettings, cancelSettings, selectComponent, selectLine,
} from "./settings-model.js";

const componentNames: Record<string, string> = {
  dir: "目录", git: "Git", model: "模型", thinking: "思考", context: "上下文", quota: "用量配额", activity: "工作动画", statuses: "扩展状态",
};

const quotaProviderNames: Record<string, string> = {
  "openai-codex": "Codex",
  "zai-coding-cn": "z.ai Coding CN",
  "minimax-cn": "MiniMax CN",
};

function sanitizePickerText(value: string): string {
  return value
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001f\u007f\u0080-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    let providerPickerIndex: number | undefined;
    let providerPickerItems: Array<{ id: string; label: string }> = [];
    let pickerKind: "quota" | "status" = "quota";
    const currentDynamicComponent = () => state.draft.lines[state.selectedLine]?.components[state.selectedComponent];
    const currentDynamicKey = () => {
      const component = currentDynamicComponent();
      return component?.id === "quota" || component?.id === "statuses" ? component.key : undefined;
    };
    const refreshProviderPickerItems = () => {
      const stateSnapshot = getRenderState();
      const items = new Map<string, string>();
      if (pickerKind === "quota") {
        for (const group of stateSnapshot.quotaGroups ?? []) items.set(group.id, sanitizePickerText(group.label));
      } else {
        for (const [key, value] of stateSnapshot.statuses.entries()) items.set(key, `${sanitizePickerText(key)}: ${sanitizePickerText(value)}`);
      }
      const current = currentDynamicKey();
      if (current && !items.has(current)) items.set(current, sanitizePickerText(current));
      providerPickerItems = Array.from(items, ([id, label]) => ({ id, label }));
    };
    const component: Component = {
      render(width: number): string[] {
        const lines: string[] = [];
        const title = theme.fg("accent", theme.bold(" dstatus 设置 "));
        lines.push(title);
        const model = state.draft.model ?? { showProvider: true };
        const quota = state.draft.quota ?? { window: "5h" as const, showReset: false };
        const currentComponent = currentDynamicComponent();
        const bindingLabel = currentDynamicKey()
          ? quotaProviderNames[currentDynamicKey()!] ?? currentDynamicKey()
          : currentComponent?.id === "quota" ? "未绑定" : currentComponent?.id === "statuses" ? "未绑定" : "未选";
        lines.push(theme.fg("muted", [
          `溢出:${state.draft.overflow}[o]`,
          `provider:${model.showProvider ? "显" : "隐"}[m]`,
          `配额:${quota.window}[q] reset:${quota.showReset ? "显" : "隐"}[t]`,
          `绑定:${bindingLabel}[p]`,
        ].join("  |  ")));
        if (providerPickerIndex !== undefined) {
          lines.push("");
          lines.push(theme.fg("accent", pickerKind === "quota"
            ? "为当前 quota 组件选择模型（Enter / Space 确认，Esc 取消）"
            : "为当前 statuses 组件选择状态（Enter / Space 确认，Esc 取消）"));
          if (providerPickerItems.length === 0) {
            lines.push(theme.fg("dim", pickerKind === "quota" ? "暂无可用 quota 模型，请先等待 pi-dusage 快照" : "暂无可用 status，请先等待扩展发布状态"));
          } else {
            providerPickerItems.forEach((item, index) => {
              const marker = index === providerPickerIndex ? theme.fg("accent", "❯ ") : "  ";
              const checked = currentDynamicKey() === item.id ? "◉" : "○";
              lines.push(`${marker}${checked} ${item.label}`);
            });
          }
        }
        if (pickerIndex !== undefined) {
          lines.push("");
          lines.push(theme.fg("accent", pickerMode === "replace" ? "选择要替换的组件" : "选择要加入的组件"));
          COMPONENT_IDS.forEach((id, index) => {
            const marker = index === pickerIndex ? theme.fg("accent", "❯ ") : "  ";
            lines.push(`${marker}${componentNames[id]}`);
          });
        }
        lines.push("");
        lines.push(theme.fg("muted", `当前行: ${state.selectedLine + 1} · 当前组件: ${state.selectedComponent + 1} · 当前焦点: ${state.focus === "line" ? "行" : "组件"}`));
        state.draft.lines.forEach((line, index) => {
          const selected = index === state.selectedLine;
          const marker = selected ? theme.fg("accent", "❯ ") : "  ";
          const overflow = line.overflow ? ` (${line.overflow})` : " (继承)";
          const parts = line.components.map((item, itemIndex) => {
            const label = componentNames[item.id] ?? item.id;
            const detail = (item.id === "quota" || item.id === "statuses") && item.key ? `: ${quotaProviderNames[item.key] ?? item.key}` : "";
            return selected && itemIndex === state.selectedComponent
              ? theme.fg("accent", `⟦${label}${detail}⟧`)
              : `${label}${detail}`;
          }).join(" · ");
          lines.push(`${marker}${index + 1}. ${parts}${overflow}`);
        });
        lines.push("");
        lines.push(theme.fg("accent", "实时预览"));
        const preview = renderStatusLines(state.draft, getRenderState(), Math.max(20, width - 2), (segments) => segments.map((s) => s.text.trim()).join(" | "));
        lines.push(...(preview.length ? preview.map((line) => theme.fg("text", `  ${line}`)) : [theme.fg("dim", "  (空) ")]));
        lines.push("");
        lines.push(theme.fg("dim", "↑↓ 选行并聚焦行  ←→ 选组件并聚焦组件  a 新行  c 修改  n 新增  x 删除  [ 上移当前项  ] 下移当前项  p 绑定动态数据  m 模型 provider  q 窗口  t reset  r 行溢出  o 全局  s 保存  Esc 取消"));
        return lines.map((line) => truncateToWidth(line, width, ""));
      },
      handleInput(data: string): void {
        if (providerPickerIndex !== undefined) {
          if (matchesKey(data, "escape")) providerPickerIndex = undefined;
          else if (providerPickerItems.length > 0 && matchesKey(data, "up")) providerPickerIndex = (providerPickerIndex - 1 + providerPickerItems.length) % providerPickerItems.length;
          else if (providerPickerItems.length > 0 && matchesKey(data, "down")) providerPickerIndex = (providerPickerIndex + 1) % providerPickerItems.length;
          else if (providerPickerItems.length > 0 && (matchesKey(data, "enter") || data === " " || matchesKey(data, "space"))) {
            const item = providerPickerItems[providerPickerIndex];
            if (item) {
              state = pickerKind === "quota"
                ? setSelectedQuotaProvider(state, item.id)
                : setSelectedStatusKey(state, item.id);
              providerPickerIndex = undefined;
            }
          }
          this.invalidate();
          tui.requestRender();
          return;
        }
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
        else if (data === "[") state = state.focus === "line" ? moveLine(state, -1) : moveComponent(state, -1);
        else if (data === "]") state = state.focus === "line" ? moveLine(state, 1) : moveComponent(state, 1);
        else if (data === "o") state = cycleGlobalOverflow(state);
        else if (data === "m") state = toggleModelProvider(state);
        else if (data === "q") state = cycleQuotaWindow(state);
        else if (data === "t") state = toggleQuotaReset(state);
        else if (data === "p" && (currentDynamicComponent()?.id === "quota" || currentDynamicComponent()?.id === "statuses")) {
          pickerKind = currentDynamicComponent()?.id === "quota" ? "quota" : "status";
          refreshProviderPickerItems();
          const current = currentDynamicKey();
          providerPickerIndex = Math.max(0, providerPickerItems.findIndex((item) => item.id === current));
        }
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
