export interface FastModeStatus {
  enabled: boolean;
  active: boolean;
  provider?: string;
  model?: string;
}

export function parseDFastSnapshot(value: unknown): FastModeStatus | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.version !== 1 || typeof snapshot.enabled !== "boolean" || typeof snapshot.active !== "boolean") return undefined;
  if (snapshot.provider !== undefined && typeof snapshot.provider !== "string") return undefined;
  if (snapshot.model !== undefined && typeof snapshot.model !== "string") return undefined;
  return {
    enabled: snapshot.enabled,
    active: snapshot.active,
    ...(snapshot.provider ? { provider: snapshot.provider as string } : {}),
    ...(snapshot.model ? { model: snapshot.model as string } : {}),
  };
}
