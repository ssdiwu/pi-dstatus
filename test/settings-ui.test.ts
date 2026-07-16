import { describe, expect, it, vi } from "vitest";
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
    quotas: [{ id: "context", used: 10_000, limit: 128_000 }],
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
    expect(component.render(200).join("\n")).toContain("d 删除行");
    expect(component.render(200).join("\n")).toContain("n 新增（右侧插入）");
    expect(component.render(200).join("\n")).toContain("组件可跨行");
    component.handleInput("a");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines).toHaveLength(2);
  });

  it("lets the user pick a specific component", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "dir" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, renderState);
    await Promise.resolve();
    expect(component.render(100).join("\n")).toContain("⟦目录⟧");
    component.handleInput("n");
    expect(component.render(100).join("\n")).toContain("选择要加入的组件");
    component.handleInput("\x1b[B");
    component.handleInput("\r");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines[0]?.components.map((item) => item.id)).toEqual(["dir", "git"]);
  });

  it("uses c to replace the selected component", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "dir" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, renderState);
    await Promise.resolve();
    component.handleInput("c");
    expect(component.render(100).join("\n")).toContain("选择要替换的组件");
    component.handleInput("\x1b[B");
    component.handleInput("\r");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines[0]?.components.map((item) => item.id)).toEqual(["git"]);
  });

  it("binds the selected quota component to a dynamically discovered provider", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "quota" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const getRenderState = () => ({
      ...renderState(),
      quotaGroups: [
        { id: "openai-codex", label: "Codex", windows: [{ id: "5h", label: "5h", remainingPercent: 77 }] },
        { id: "zai-coding-cn", label: "z.ai Coding CN", windows: [{ id: "5h", label: "5h", remainingPercent: 99 }] },
      ],
    });
    const promise = openSettings(ctx, config, getRenderState);
    await Promise.resolve();
    component.handleInput("\r");
    component.handleInput("\r");
    component.handleInput("\x1b[B");
    component.handleInput("\r");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines[0]?.components).toEqual([{ id: "quota", key: "zai-coding-cn" }]);
  });

  it("shows an actionable empty state when no quota provider is discovered", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "quota" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, renderState);
    await Promise.resolve();
    component.handleInput("\r");
    component.handleInput("\r");
    expect(component.render(100).join("\n")).toContain("暂无可用 quota 模型");
    component.handleInput("\x1b");
    component.handleInput("\x1b");
    component.handleInput("\x1b");
    await expect(promise).resolves.toBeUndefined();
  });

  it("binds the selected statuses component to a discovered status key", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "statuses" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const getRenderState = () => ({
      ...renderState(),
      statuses: new Map([["mcp", "MCP: ready"], ["dteam", "1 worker active"]]),
    });
    const promise = openSettings(ctx, config, getRenderState);
    await Promise.resolve();
    component.handleInput("\r");
    component.handleInput("\r");
    component.handleInput("\x1b[B");
    component.handleInput("\r");
    component.handleInput("s");
    const saved = await promise;
    expect(saved?.lines[0]?.components).toEqual([{ id: "statuses", key: "dteam" }]);
  });

  it("keeps configured status keys selectable when runtime values are empty", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "statuses" }, { id: "statuses", key: "mcp" }, { id: "statuses", key: "dgoal" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, () => ({ ...renderState(), statuses: new Map() }));
    await Promise.resolve();
    component.handleInput("\r");
    component.handleInput("\r");
    expect(component.render(100).join("\n")).toContain("mcp");
    component.handleInput("\x1b");
    component.handleInput("\x1b");
    component.handleInput("\x1b");
    await expect(promise).resolves.toBeUndefined();
  });

  it("keeps parent shortcuts inactive inside component settings", async () => {
    let component: any;
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "quota" }, { id: "dir" }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, () => ({
      ...renderState(),
      quotaGroups: [{ id: "openai-codex", label: "Codex", windows: [{ id: "5h", label: "5h", remainingPercent: 80 }] }],
    }));
    await Promise.resolve();
    component.handleInput("\r");
    component.handleInput("n");
    expect(component.render(120).join("\n")).not.toContain("选择要加入的组件");
    component.handleInput("\x1b");
    component.handleInput("\x1b");
    await expect(promise).resolves.toBeUndefined();
  });

  it("sanitizes configured dynamic keys before displaying them", async () => {
    let component: any;
    const maliciousKey = "\x1b[2J\x1b[H";
    const config = defaultConfig();
    config.lines[0]!.components = [{ id: "statuses", key: maliciousKey }];
    const ctx: any = {
      mode: "tui",
      ui: {
        custom: (factory: any) => new Promise((resolve) => {
          component = factory({ requestRender: () => undefined }, theme, {}, resolve);
        }),
      },
    };
    const promise = openSettings(ctx, config, renderState);
    await Promise.resolve();
    const output = component.render(120).join("\n");
    expect(output).not.toContain("\x1b[2J");
    expect(output).not.toContain("\x1b[H");
    component.handleInput("\x1b");
    await expect(promise).resolves.toBeUndefined();
  });

  it("does not render zero context usage when Pi reports it as unknown", () => {
    let sessionStart: any;
    let footerFactory: any;
    const pi: any = {
      registerCommand: () => undefined,
      on: (name: string, handler: any) => { if (name === "session_start") sessionStart = handler; },
      events: { on: () => undefined, emit: () => undefined },
      getThinkingLevel: () => "off",
      exec: async () => ({ code: 1, stdout: "", stderr: "" }),
    };
    piDStatus(pi);
    const ctx: any = {
      mode: "tui",
      cwd: "/tmp",
      model: { id: "provider/model" },
      getContextUsage: () => ({ tokens: null, percent: null, contextWindow: 128_000 }),
      sessionManager: { getSessionName: () => undefined, getEntries: () => [] },
      ui: {
        setWorkingVisible: () => undefined,
        setFooter: (factory: any) => { footerFactory = factory; },
      },
    };
    sessionStart({}, ctx);
    const footer = footerFactory({ requestRender: () => undefined }, theme, {
      getExtensionStatuses: () => new Map(),
      onBranchChange: () => () => undefined,
    });
    expect(footer.render(200).join("\n")).not.toContain("0%");
    footer.dispose();
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

  it("loads current footer statuses before opening the settings picker", async () => {
    let command: any;
    let sessionStart: any;
    let footerFactory: any;
    let customComponent: any;
    const handlers = new Map<string, (event: any, ctx: any) => void>();
    let currentStatuses = new Map<string, string>();
    const pi: any = {
      registerCommand: (_name: string, definition: any) => { command = definition; },
      on: (name: string, handler: any) => {
        if (name === "session_start") sessionStart = handler;
        else if (name === "session_shutdown") handlers.set(name, handler);
      },
      events: { on: () => undefined, emit: () => undefined },
      getThinkingLevel: () => "off",
      exec: async () => ({ code: 1, stdout: "", stderr: "" }),
    };
    piDStatus(pi);
    const themeWithUi = { ...theme, fg: (_color: string, text: string) => text };
    const ctx: any = {
      mode: "tui",
      cwd: "/tmp",
      model: { id: "provider/model" },
      getContextUsage: () => ({ tokens: 10, contextWindow: 128_000 }),
      sessionManager: { getSessionName: () => undefined, getEntries: () => [] },
      ui: {
        setWorkingVisible: () => undefined,
        setFooter: (factory: any) => { footerFactory = factory; },
        custom: (factory: any) => {
          customComponent = factory({ requestRender: () => undefined }, themeWithUi, {}, () => undefined);
          return new Promise(() => undefined);
        },
        notify: () => undefined,
      },
    };
    sessionStart({}, ctx);
    footerFactory({ requestRender: () => undefined }, themeWithUi, {
      getExtensionStatuses: () => currentStatuses,
      onBranchChange: () => () => undefined,
    });
    const promise = command.handler("", ctx);
    await Promise.resolve();
    currentStatuses = new Map([["dteam", "1 worker active"]]);
    customComponent.handleInput("n");
    for (let index = 0; index < 7; index += 1) customComponent.handleInput("\x1b[B");
    customComponent.handleInput("\r");
    expect(customComponent.render(120).join("\n")).toContain("1 worker active");
    handlers.get("session_shutdown")?.({}, ctx);
    void promise;
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

  it("reloads an externally changed layout every minute", async () => {
    vi.useFakeTimers();
    let externalConfig = defaultConfig();
    vi.resetModules();
    vi.doMock("../src/config.js", async () => {
      const actual = await vi.importActual<typeof import("../src/config.js")>("../src/config.js");
      return {
        ...actual,
        loadConfig: () => externalConfig,
        loadConfigAsync: async () => externalConfig,
        saveConfig: async () => undefined,
      };
    });

    try {
      const { CONFIG_REFRESH_INTERVAL_MS, default: createExtension } = await import("../extensions/index.js");
      let sessionStart: any;
      let footerFactory: any;
      const pi: any = {
        registerCommand: () => undefined,
        on: (name: string, handler: any) => { if (name === "session_start") sessionStart = handler; },
        events: { on: () => undefined, emit: () => undefined },
        getThinkingLevel: () => "off",
        exec: () => new Promise(() => undefined),
      };
      createExtension(pi);
      const ctx: any = {
        mode: "tui",
        cwd: "/tmp",
        model: { id: "provider/model" },
        getContextUsage: () => ({ tokens: 10, contextWindow: 128_000 }),
        sessionManager: { getSessionName: () => undefined, getEntries: () => [] },
        ui: {
          setWorkingVisible: () => undefined,
          setFooter: (factory: any) => { footerFactory = factory; },
        },
      };
      sessionStart({}, ctx);
      const requestRender = vi.fn();
      const footer = footerFactory({ requestRender }, theme, {
        getExtensionStatuses: () => new Map(),
        onBranchChange: () => () => undefined,
      });

      externalConfig = { ...defaultConfig(), lines: [] };
      await vi.advanceTimersByTimeAsync(CONFIG_REFRESH_INTERVAL_MS);

      expect(requestRender).toHaveBeenCalled();
      expect(footer.render(200)).toEqual([]);
      footer.dispose();
    } finally {
      vi.doUnmock("../src/config.js");
      vi.useRealTimers();
      vi.resetModules();
    }
  });
});
