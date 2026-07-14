import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig, loadConfigAsync, saveConfig, validateConfig } from "../src/config.js";

describe("configuration", () => {
  it("has the single default logical line with reusable quota", () => {
    const config = defaultConfig();
    expect(config.overflow).toBe("wrap");
    expect(config.model).toEqual({ showProvider: true });
    expect(config.quota).toEqual({ window: "5h", showReset: false });
    expect(config.lines.map((line) => line.components.map((component) => component.id))).toEqual([
      ["dir", "git", "model", "thinking", "context", "quota", "quota", "quota", "activity", "statuses"],
    ]);
  });

  it("validates and atomically saves a user config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pi-dstatus-"));
    const path = join(dir, "config.json");
    const config = defaultConfig();
    config.lines[0]!.overflow = "collapse";
    await saveConfig(config, path);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(config);
    expect(await loadConfigAsync(path)).toEqual(config);
  });

  it("migrates an unkeyed quota component into separate provider components", () => {
    const config = validateConfig({
      version: 1,
      overflow: "wrap",
      quota: { providerIds: ["openai-codex", "zai-coding-cn"], window: "5h", showReset: false },
      lines: [{ id: "only", components: [{ id: "quota" }] }],
    });
    expect(config.lines[0]!.components).toEqual([
      { id: "quota", key: "openai-codex" },
      { id: "quota", key: "zai-coding-cn" },
    ]);
  });

  it("preserves a newly added unbound quota in the current config format", () => {
    const config = validateConfig({
      version: 1,
      overflow: "wrap",
      quota: { window: "5h", showReset: false },
      lines: [{ id: "only", components: [{ id: "quota" }] }],
    });
    expect(config.lines[0]!.components).toEqual([{ id: "quota" }]);
  });

  it("rejects unknown component ids", () => {
    expect(() => validateConfig({ version: 1, overflow: "wrap", lines: [{ id: "x", components: [{ id: "private" }] }] })).toThrow();
  });
});
