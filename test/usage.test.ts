import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { aggregateSessionUsage } from "../src/usage.js";

function assistant(input: number, output: number, cacheRead: number, cacheWrite: number, cost: number): SessionEntry {
  return {
    type: "message",
    id: `${input}-${output}-${cacheRead}-${cacheWrite}`,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "assistant",
      content: [],
      api: "test-api",
      provider: "test-provider",
      model: "test-model",
      usage: {
        input,
        output,
        cacheRead,
        cacheWrite,
        totalTokens: input + output + cacheRead + cacheWrite,
        cost: { input: cost, output: 0, cacheRead: 0, cacheWrite: 0, total: cost },
      },
      stopReason: "stop",
      timestamp: Date.now(),
    },
  } as SessionEntry;
}

describe("session usage aggregation", () => {
  it("aggregates assistant usage and calculates the session cache hit rate", () => {
    const usage = aggregateSessionUsage([
      assistant(1000, 200, 3000, 100, 0.1),
      assistant(4000, 500, 6000, 0, 0.2),
    ]);
    expect(usage).toMatchObject({ input: 5000, output: 700, totalTokens: 14_800, cacheRead: 9000, cacheWrite: 100, cacheHitRate: (9000 / (5000 + 9000 + 100)) * 100 });
    expect(usage?.cost).toBeCloseTo(0.3);
  });

  it("returns undefined when there are no assistant messages", () => {
    expect(aggregateSessionUsage([])).toBeUndefined();
  });
});
