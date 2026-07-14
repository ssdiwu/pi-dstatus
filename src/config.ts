import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Overflow = "wrap" | "collapse" | "hide";
export type ComponentId = "dir" | "git" | "model" | "thinking" | "context" | "activity" | "statuses";

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
}

export const CONFIG_DIR = join(homedir(), ".pi", "pi-dstatus");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export const OVERFLOWS: Overflow[] = ["wrap", "collapse", "hide"];
export const COMPONENT_IDS: ComponentId[] = ["dir", "git", "model", "thinking", "context", "activity", "statuses"];

export function defaultConfig(): DStatusConfig {
  return {
    version: 1,
    overflow: "wrap",
    lines: [
      {
        id: "line-1",
        components: [
          { id: "dir" },
          { id: "git" },
          { id: "model" },
          { id: "thinking" },
          { id: "context" },
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

function isComponentId(value: unknown): value is ComponentId {
  return typeof value === "string" && COMPONENT_IDS.includes(value as ComponentId);
}

export function validateConfig(value: unknown): DStatusConfig {
  if (!isRecord(value) || value.version !== 1 || !isOverflow(value.overflow) || !Array.isArray(value.lines)) {
    throw new Error("Invalid pi-dstatus configuration");
  }
  const lines: StatusLine[] = value.lines.map((rawLine, index) => {
    if (!isRecord(rawLine) || typeof rawLine.id !== "string" || !Array.isArray(rawLine.components)) {
      throw new Error(`Invalid status line at index ${index}`);
    }
    if (rawLine.overflow !== undefined && !isOverflow(rawLine.overflow)) {
      throw new Error(`Invalid overflow at line ${index}`);
    }
    const components = rawLine.components.map((rawComponent, componentIndex) => {
      if (!isRecord(rawComponent) || !isComponentId(rawComponent.id)) {
        throw new Error(`Invalid component at ${index}:${componentIndex}`);
      }
      if (rawComponent.key !== undefined && typeof rawComponent.key !== "string") {
        throw new Error(`Invalid component key at ${index}:${componentIndex}`);
      }
      return { id: rawComponent.id, ...(rawComponent.key ? { key: rawComponent.key } : {}) };
    });
    return { id: rawLine.id, components, ...(rawLine.overflow ? { overflow: rawLine.overflow } : {}) };
  });
  return { version: 1, overflow: value.overflow, lines };
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
