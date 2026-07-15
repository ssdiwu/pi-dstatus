import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig, type DStatusConfig } from "../src/config.js";
import { parseDFastSnapshot, type FastModeStatus } from "../src/fast.js";
import { readGitStatus } from "../src/git.js";
import { aggregateSessionUsage, appendAssistantUsage } from "../src/usage.js";
import { renderStatusLines, type ActivityStatus, type QuotaGroup, type RenderState } from "../src/renderer.js";
import type { SessionUsage } from "../src/usage.js";
import { openSettings } from "../src/settings-ui.js";

function renderPlainSegments(segments: Array<{ text: string }>): string {
  return segments.map((segment) => segment.text.trim()).join(" | ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatResetLabel(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `↻ ${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDusageSnapshot(value: unknown): QuotaGroup[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.providers)) return [];
  return value.providers.flatMap((rawProvider, index) => {
    if (!isRecord(rawProvider) || typeof rawProvider.id !== "string" || typeof rawProvider.title !== "string") return [];
    const windows = Array.isArray(rawProvider.windows) ? rawProvider.windows.flatMap((rawWindow) => {
      if (!isRecord(rawWindow) || typeof rawWindow.id !== "string" || typeof rawWindow.label !== "string") return [];
      const remainingPercent = Number(rawWindow.remainingPercent);
      if (!Number.isFinite(remainingPercent)) return [];
      return [{
        id: `${rawProvider.id}:${rawWindow.id}`,
        label: rawWindow.label,
        remainingPercent: Math.max(0, Math.min(100, remainingPercent)),
        resetLabel: formatResetLabel(rawWindow.resetAt),
      }];
    }) : [];
    const rawError = isRecord(rawProvider.error) && typeof rawProvider.error.message === "string"
      ? rawProvider.error.message
      : undefined;
    return [{
      id: rawProvider.id || `provider-${index}`,
      label: rawProvider.title,
      windows,
      ...(rawError ? { error: rawError } : {}),
    }];
  });
}

export default function piDStatus(pi: ExtensionAPI): void {
  let config: DStatusConfig = loadConfig();
  let tui: { requestRender(): void } | undefined;
  let activity: ActivityStatus = { active: false, text: "" };
  let activityFrame = 0;
  let git: Awaited<ReturnType<typeof readGitStatus>>;
  let gitRefreshInFlight = false;
  let sessionUsage: SessionUsage | undefined;
  let latestStatuses = new Map<string, string>();
  let readExtensionStatuses: () => ReadonlyMap<string, string> = () => latestStatuses;
  let currentCtx: ExtensionContext | undefined;
  let quotaGroups: QuotaGroup[] = [];
  let fastMode: FastModeStatus | undefined;
  let dusageSubscribed = false;
  let dfastSubscribed = false;
  let cleanupSession: () => void = () => {};

  const requestRender = () => tui?.requestRender();
  const hasQuotaComponent = () => config.lines.some((line) => line.components.some((component) => component.id === "quota"));
  const hasFastComponent = () => config.lines.some((line) => line.components.some((component) => component.id === "fast"));
  const setDusageSubscription = (enabled: boolean) => {
    if (enabled === dusageSubscribed) return;
    pi.events?.emit(enabled ? "pi-dusage/subscribe" : "pi-dusage/unsubscribe", { version: 1, consumerId: "pi-dstatus" });
    dusageSubscribed = enabled;
  };
  const setDFastSubscription = (enabled: boolean) => {
    if (enabled === dfastSubscribed) return;
    pi.events?.emit(enabled ? "pi-dfast/subscribe" : "pi-dfast/unsubscribe", { version: 1, consumerId: "pi-dstatus" });
    dfastSubscribed = enabled;
  };
  const setActivity = (next: ActivityStatus) => { activity = next; activityFrame = 0; requestRender(); };

  async function refreshGit(): Promise<void> {
    const ctx = currentCtx;
    if (!ctx || gitRefreshInFlight) return;
    gitRefreshInFlight = true;
    try {
      const next = await readGitStatus(pi, ctx.cwd);
      if (currentCtx !== ctx) return;
      git = next;
      requestRender();
    } finally {
      gitRefreshInFlight = false;
    }
  }

  function renderState(ctx: ExtensionContext, statuses: ReadonlyMap<string, string>): RenderState {
    const usage = ctx.getContextUsage();
    const contextWindow = usage?.contextWindow ?? 0;
    return {
      cwd: ctx.cwd,
      git,
      sessionName: ctx.sessionManager.getSessionName(),
      sessionUsage,
      model: ctx.model?.id,
      modelProvider: ctx.model?.provider,
      showModelProvider: config.model?.showProvider,
      thinking: pi.getThinkingLevel(),
      fastMode,
      quotas: contextWindow > 0 && usage?.tokens !== null && usage?.tokens !== undefined
        ? [{ id: "context", used: Math.max(0, usage.tokens), limit: contextWindow }]
        : [],
      quotaGroups,
      quotaSettings: config.quota,
      activity: activity.active && activity.text === "···"
        ? { ...activity, text: ["·  ", "·· ", "···", " ··", "  ·"][activityFrame % 5]! }
        : activity,
      statuses,
    };
  }

  pi.registerCommand("dstatus", {
    description: "Configure the multi-line dstatus footer",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      latestStatuses = new Map(readExtensionStatuses());
      const next = await openSettings(ctx, config, () => {
        latestStatuses = new Map(readExtensionStatuses());
        return renderState(ctx, latestStatuses);
      });
      if (!next) return;
      const quotaWasEnabled = hasQuotaComponent();
      const fastWasEnabled = hasFastComponent();
      config = next;
      await saveConfig(config);
      if (quotaWasEnabled !== hasQuotaComponent()) setDusageSubscription(hasQuotaComponent());
      if (fastWasEnabled !== hasFastComponent()) setDFastSubscription(hasFastComponent());
      requestRender();
      ctx.ui.notify("pi-dstatus 配置已保存", "info");
    },
  });

  pi.on("model_select", requestRender);
  pi.on("thinking_level_select", requestRender);
  pi.on("session_info_changed", requestRender);
  pi.on("message_end", (event) => {
    if (event.message.role === "assistant") sessionUsage = appendAssistantUsage(sessionUsage, event.message);
    requestRender();
  });
  pi.on("turn_start", () => setActivity({ active: true, text: "···" }));
  pi.on("turn_end", () => setActivity({ active: false, text: "" }));
  pi.on("tool_execution_start", (event) => setActivity({ active: true, text: event.toolName }));
  pi.on("tool_execution_end", () => setActivity({ active: false, text: "···" }));
  pi.events?.on("pi-dusage/updated", (data) => {
    quotaGroups = parseDusageSnapshot(data);
    requestRender();
  });
  pi.events?.on("pi-dfast/updated", (data) => {
    const next = parseDFastSnapshot(data);
    if (!next) return;
    fastMode = next;
    requestRender();
  });

  pi.on("session_start", (_event, ctx) => {
    cleanupSession();
    git = undefined;
    currentCtx = ctx;
    latestStatuses = new Map();
    readExtensionStatuses = () => latestStatuses;
    quotaGroups = [];
    fastMode = undefined;
    sessionUsage = aggregateSessionUsage(ctx.sessionManager.getEntries());
    if (ctx.mode !== "tui") return;
    setDusageSubscription(hasQuotaComponent());
    setDFastSubscription(hasFastComponent());
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
      setDusageSubscription(false);
      setDFastSubscription(false);
      quotaGroups = [];
      fastMode = undefined;
      sessionUsage = undefined;
      if (tui) tui = undefined;
      if (currentCtx === ctx) currentCtx = undefined;
      ctx.ui.setWorkingVisible(true);
    };
    cleanupSession = cleanup;
    void refreshGit();
    ctx.ui.setFooter((footerTui, _theme, footerData) => {
      tui = footerTui;
      const readStatuses = () => new Map(footerData.getExtensionStatuses());
      readExtensionStatuses = readStatuses;
      const unsubscribe = footerData.onBranchChange(() => { void refreshGit(); requestRender(); });
      return {
        render(width: number): string[] {
          latestStatuses = readStatuses();
          return renderStatusLines(config, renderState(ctx, latestStatuses), width);
        },
        invalidate() {},
        dispose() {
          unsubscribe();
          if (readExtensionStatuses === readStatuses) readExtensionStatuses = () => latestStatuses;
          cleanup();
        },
      };
    });
  });

  pi.on("session_shutdown", () => {
    cleanupSession();
    cleanupSession = () => {};
    currentCtx = undefined;
    readExtensionStatuses = () => latestStatuses;
    git = undefined;
    sessionUsage = undefined;
    fastMode = undefined;
    tui = undefined;
  });
}

export { renderPlainSegments };
