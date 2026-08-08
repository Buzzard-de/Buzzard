export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return Boolean(apiBaseUrl());
}

export function isAiChatEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "0") return false;
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production";
}
