import { describe, expect, it } from "vitest";
import { parseDFastSnapshot } from "../src/fast.js";

describe("pi-dfast public snapshot adapter", () => {
  it("accepts valid version 1 snapshots", () => {
    expect(parseDFastSnapshot({ version: 1, enabled: true, active: true, provider: "openai-codex", model: "gpt-5.6-terra" })).toEqual({
      enabled: true,
      active: true,
      provider: "openai-codex",
      model: "gpt-5.6-terra",
    });
  });

  it("ignores malformed or incompatible snapshots", () => {
    expect(parseDFastSnapshot({ version: 2, enabled: true, active: true })).toBeUndefined();
    expect(parseDFastSnapshot({ version: 1, enabled: "yes", active: true })).toBeUndefined();
    expect(parseDFastSnapshot({ version: 1, enabled: true, active: true, model: 56 })).toBeUndefined();
  });
});
