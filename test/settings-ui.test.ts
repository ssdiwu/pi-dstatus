import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { openSettings } from "../src/settings-ui.js";
import piDStatus from "../extensions/index.js";

const theme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

function renderState() {
  return {
    cwd: "/preview",
    git: { branch: "main", staged: 0, modified: 0, untracked: 0 },
    model: "provider/model",
    thinking: "high",
    contextTokens: 10_000,
    contextWindow: 128_000,
    activity: { active: false, text: "" },
    statuses: new Map([["mcp", "MCP: ready"]]),
  };
}

describe("/dstatus settings integration", () => {
  it("renders preview from the production renderer and saves the edited draft", async () => {
    let component: any;
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, defaultConfig(), renderState);
    await Promise.resolve();
    expect(component.render(100).join("\n")).toContain("preview");
    expect(component.render(100).join("\n")).toContain("MCP: ready");
    component.handleInput("a");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines).toHaveLength(2);
  });

  it("cancels the draft without returning a configuration", async () => {
    let component: any;
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, defaultConfig(), renderState);
    await Promise.resolve();
    component.handleInput("\x1b");
    await expect(promise).resolves.toBeUndefined();
  });

  it("registers /dstatus and safely guards non-TUI mode", async () => {
    let command: any;
    const pi: any = {
      registerCommand: (_name: string, definition: any) => { command = definition; },
      on: () => undefined,
      getThinkingLevel: () => "off",
    };
    piDStatus(pi);
    expect(command).toBeDefined();
    const notifications: string[] = [];
    await command.handler("", { mode: "print", ui: { notify: (message: string) => notifications.push(message) } });
    expect(notifications.join("\n")).toContain("TUI");
  });
});
