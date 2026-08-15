import { apiBaseUrl, isApiConfigured } from "./config";

export interface IntelligenceBridgeStatus {
  bridge: "NOT_CONFIGURED" | "LIVE" | "DOWN";
  intelligenceApiUrl: string | null;
  salesEnabled: boolean;
  catalogMode: boolean;
  message?: string;
  production?: {
    readiness?: {
      ready?: boolean;
      checks?: Array<{ name: string; status: string; blocking?: boolean; detail?: string }>;
    };
    integrations?: Record<string, { status: string; missing?: string[] }>;
  };
}

export async function fetchIntelligenceBridgeStatus(): Promise<IntelligenceBridgeStatus | null> {
  if (!isApiConfigured()) return null;

  try {
    const response = await fetch(`${apiBaseUrl()}/api/intelligence/status`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as IntelligenceBridgeStatus & { success?: boolean };
    return data;
  } catch {
    return null;
  }
}
