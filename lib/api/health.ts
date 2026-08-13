import { apiBaseUrl, isApiConfigured } from "./config";

export type ApiHealthState = "checking" | "live" | "unconfigured" | "down";

export interface ApiHealthSnapshot {
  state: ApiHealthState;
  moduleCount: number | null;
}

function countEnabledModules(data: Record<string, unknown>): number {
  return Object.entries(data).filter(
    ([key, value]) =>
      key !== "integrations" &&
      key !== "data" &&
      key !== "automation" &&
      key !== "observability" &&
      typeof value === "object" &&
      value !== null &&
      (value as { enabled?: boolean }).enabled === true
  ).length;
}

export async function fetchApiHealth(): Promise<ApiHealthSnapshot> {
  if (!isApiConfigured()) {
    return { state: "unconfigured", moduleCount: null };
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/api/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return { state: "down", moduleCount: null };
    }
    const data = (await response.json()) as Record<string, unknown>;
    return {
      state: "live",
      moduleCount: countEnabledModules(data),
    };
  } catch {
    return { state: "down", moduleCount: null };
  }
}
