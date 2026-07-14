import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Overflow = "wrap" | "collapse" | "hide";
export type QuotaWindowMode = "5h" | "all";
export interface QuotaSettings {
  window: QuotaWindowMode;
  showReset: boolean;
}
export interface ModelSettings {
  showProvider: boolean;
}
export type ComponentId = "dir" | "session" | "git" | "model" | "thinking" | "context" | "tokens" | "cache" | "cost" | "quota" | "activity" | "statuses";

export interface StatusComponent {
  id: ComponentId;
  key?: string;
}

export interface StatusLine {
  id: string;
  components: StatusComponent[];
  overflow?: Overflow;
}

export interface DStatusConfig {
  version: 1;
  overflow: Overflow;
  lines: StatusLine[];
  model?: ModelSettings;
  quota?: QuotaSettings;
}

export const CONFIG_DIR = join(homedir(), ".pi", "pi-dstatus");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export const OVERFLOWS: Overflow[] = ["wrap", "collapse", "hide"];
export const COMPONENT_IDS: ComponentId[] = ["dir", "git", "model", "thinking", "context", "quota", "activity", "statuses", "session", "tokens", "cache", "cost"];
export const DEFAULT_QUOTA_PROVIDER_IDS = ["openai-codex", "zai-coding-cn", "minimax-cn"];

export function defaultConfig(): DStatusConfig {
  return {
    version: 1,
    overflow: "wrap",
    model: { showProvider: true },
    quota: { window: "5h", showReset: false },
    lines: [
      {
        id: "line-1",
        components: [
          { id: "dir" },
          { id: "git" },
          { id: "model" },
          { id: "thinking" },
          { id: "context" },
          { id: "quota", key: "openai-codex" },
          { id: "quota", key: "zai-coding-cn" },
          { id: "quota", key: "minimax-cn" },
          { id: "activity" },
          { id: "statuses" },
        ],
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOverflow(value: unknown): value is Overflow {
  return value === "wrap" || value === "collapse" || value === "hide";
}

function isQuotaWindowMode(value: unknown): value is QuotaWindowMode {
  return value === "5h" || value === "all";
}

function isComponentId(value: unknown): value is ComponentId {
  return typeof value === "string" && COMPONENT_IDS.includes(value as ComponentId);
}

export function validateConfig(value: unknown): DStatusConfig {
  if (!isRecord(value) || value.version !== 1 || !isOverflow(value.overflow) || !Array.isArray(value.lines)) {
    throw new Error("Invalid pi-dstatus configuration");
  }
  const model = value.model === undefined
    ? { showProvider: true }
    : isRecord(value.model) && typeof value.model.showProvider === "boolean"
      ? { showProvider: value.model.showProvider }
      : (() => { throw new Error("Invalid model settings"); })();
  const quota = value.quota === undefined
    ? { window: "5h" as const, showReset: false }
    : isRecord(value.quota)
      && isQuotaWindowMode(value.quota.window)
      && typeof value.quota.showReset === "boolean"
      ? { window: value.quota.window, showReset: value.quota.showReset }
      : (() => { throw new Error("Invalid quota settings"); })();
  const legacyProviderIdsValue = isRecord(value.quota) && Array.isArray(value.quota.providerIds)
    ? value.quota.providerIds
    : undefined;
  const hasLegacyProviderIds = legacyProviderIdsValue !== undefined;
  const legacyProviderIds = legacyProviderIdsValue
    ? legacyProviderIdsValue.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : DEFAULT_QUOTA_PROVIDER_IDS;
  const migrateLegacyQuota = value.quota === undefined || hasLegacyProviderIds;
  const lines: StatusLine[] = value.lines.map((rawLine, index) => {
    if (!isRecord(rawLine) || typeof rawLine.id !== "string" || !Array.isArray(rawLine.components)) {
      throw new Error(`Invalid status line at index ${index}`);
    }
    if (rawLine.overflow !== undefined && !isOverflow(rawLine.overflow)) {
      throw new Error(`Invalid overflow at line ${index}`);
    }
    const components = rawLine.components.flatMap((rawComponent, componentIndex) => {
      if (!isRecord(rawComponent) || typeof rawComponent.id !== "string") {
        throw new Error(`Invalid component at ${index}:${componentIndex}`);
      }
      if (rawComponent.id === "usage") {
        return [{ id: "tokens" as const }, { id: "cache" as const }, { id: "cost" as const }];
      }
      if (!isComponentId(rawComponent.id)) {
        throw new Error(`Invalid component at ${index}:${componentIndex}`);
      }
      if (rawComponent.key !== undefined && typeof rawComponent.key !== "string") {
        throw new Error(`Invalid component key at ${index}:${componentIndex}`);
      }
      if (rawComponent.id === "quota" && !rawComponent.key && migrateLegacyQuota) {
        return legacyProviderIds.map((key) => ({ id: "quota" as const, key }));
      }
      return [{ id: rawComponent.id, ...(rawComponent.key ? { key: rawComponent.key } : {}) }];
    });
    return { id: rawLine.id, components, ...(rawLine.overflow ? { overflow: rawLine.overflow } : {}) };
  });
  return { version: 1, overflow: value.overflow, lines, model, quota };
}

export function configPath(configDir = CONFIG_DIR): string {
  return join(configDir, "config.json");
}

export function loadConfig(path = CONFIG_PATH): DStatusConfig {
  if (!existsSync(path)) return defaultConfig();
  try {
    return validateConfig(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return defaultConfig();
  }
}

export async function loadConfigAsync(path = CONFIG_PATH): Promise<DStatusConfig> {
  try {
    return validateConfig(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: DStatusConfig, path = CONFIG_PATH): Promise<void> {
  const valid = validateConfig(config);
  const dir = join(path, "..");
  await mkdir(dir, { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(valid, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}
