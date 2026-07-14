import type { SessionEntry } from "@earendil-works/pi-coding-agent";

type AssistantMessage = Extract<Extract<SessionEntry, { type: "message" }>["message"], { role: "assistant" }>;

export interface SessionUsage {
  input: number;
  output: number;
  totalTokens: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  cacheHitRate?: number;
}

export function appendAssistantUsage(current: SessionUsage | undefined, message: AssistantMessage): SessionUsage {
  const input = (current?.input ?? 0) + message.usage.input;
  const output = (current?.output ?? 0) + message.usage.output;
  const totalTokens = (current?.totalTokens ?? 0) + message.usage.totalTokens;
  const cacheRead = (current?.cacheRead ?? 0) + message.usage.cacheRead;
  const cacheWrite = (current?.cacheWrite ?? 0) + message.usage.cacheWrite;
  const cost = (current?.cost ?? 0) + message.usage.cost.total;
  const promptTokens = input + cacheRead + cacheWrite;
  const cacheHitRate = promptTokens > 0 ? (cacheRead / promptTokens) * 100 : undefined;
  return { input, output, totalTokens, cacheRead, cacheWrite, cost, ...(cacheHitRate === undefined ? {} : { cacheHitRate }) };
}

export function aggregateSessionUsage(entries: readonly SessionEntry[]): SessionUsage | undefined {
  let result: SessionUsage | undefined;
  for (const entry of entries) {
    if (entry.type === "message" && entry.message.role === "assistant") {
      result = appendAssistantUsage(result, entry.message);
    }
  }
  return result;
}
