import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig, type DStatusConfig } from "../src/config.js";
import { readGitStatus } from "../src/git.js";
import { renderStatusLines, type ActivityStatus, type RenderState } from "../src/renderer.js";
import { openSettings } from "../src/settings-ui.js";

function renderPlainSegments(segments: Array<{ text: string }>): string {
  return segments.map((segment) => segment.text.trim()).join(" | ");
}

export default function piDStatus(pi: ExtensionAPI): void {
  let config: DStatusConfig = loadConfig();
  let tui: { requestRender(): void } | undefined;
  let activity: ActivityStatus = { active: false, text: "" };
  let activityFrame = 0;
  let git: Awaited<ReturnType<typeof readGitStatus>>;
  let latestStatuses = new Map<string, string>();
  let currentCtx: ExtensionContext | undefined;
  let cleanupSession: () => void = () => {};

  const requestRender = () => tui?.requestRender();
  const setActivity = (next: ActivityStatus) => { activity = next; activityFrame = 0; requestRender(); };

  async function refreshGit(): Promise<void> {
    const ctx = currentCtx;
    if (!ctx) return;
    const next = await readGitStatus(pi, ctx.cwd);
    if (currentCtx !== ctx) return;
    git = next;
    requestRender();
  }

  function renderState(ctx: ExtensionContext, statuses: ReadonlyMap<string, string>): RenderState {
    const usage = ctx.getContextUsage();
    return {
      cwd: ctx.cwd,
      git,
      model: ctx.model?.id,
      thinking: pi.getThinkingLevel(),
      contextTokens: usage?.tokens ?? undefined,
      contextWindow: usage?.contextWindow ?? undefined,
      activity: activity.active && activity.text === "···"
        ? { ...activity, text: ["·  ", "·· ", "···", " ··", "  ·"][activityFrame % 5]! }
        : activity,
      statuses,
    };
  }

  pi.registerCommand("dstatus", {
    description: "Configure the multi-line dstatus footer",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const next = await openSettings(ctx, config, () => renderState(ctx, latestStatuses));
      if (!next) return;
      config = next;
      await saveConfig(config);
      requestRender();
      ctx.ui.notify("pi-dstatus 配置已保存", "info");
    },
  });

  pi.on("model_select", requestRender);
  pi.on("thinking_level_select", requestRender);
  pi.on("turn_start", () => setActivity({ active: true, text: "···" }));
  pi.on("turn_end", () => setActivity({ active: false, text: "" }));
  pi.on("tool_execution_start", (event) => setActivity({ active: true, text: event.toolName }));
  pi.on("tool_execution_end", () => setActivity({ active: false, text: "···" }));

  pi.on("session_start", (_event, ctx) => {
    cleanupSession();
    git = undefined;
    currentCtx = ctx;
    latestStatuses = new Map();
    if (ctx.mode !== "tui") return;
    ctx.ui.setWorkingVisible(false);
    let disposed = false;
    const gitTimer = setInterval(() => void refreshGit(), 1500);
    const spinnerTimer = setInterval(() => {
      if (!activity.active) return;
      activityFrame = (activityFrame + 1) % 5;
      requestRender();
    }, 120);
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      clearInterval(gitTimer);
      clearInterval(spinnerTimer);
      if (tui) tui = undefined;
      if (currentCtx === ctx) currentCtx = undefined;
      ctx.ui.setWorkingVisible(true);
    };
    cleanupSession = cleanup;
    void refreshGit();
    ctx.ui.setFooter((footerTui, _theme, footerData) => {
      tui = footerTui;
      const unsubscribe = footerData.onBranchChange(() => { void refreshGit(); requestRender(); });
      return {
        render(width: number): string[] {
          latestStatuses = new Map(footerData.getExtensionStatuses());
          return renderStatusLines(config, renderState(ctx, latestStatuses), width);
        },
        invalidate() {},
        dispose() {
          unsubscribe();
          cleanup();
        },
      };
    });
  });

  pi.on("session_shutdown", () => {
    cleanupSession();
    cleanupSession = () => {};
    currentCtx = undefined;
    git = undefined;
    tui = undefined;
  });
}

export { renderPlainSegments };
