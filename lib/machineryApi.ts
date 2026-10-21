const RENDER_API = "https://buzzard-api.onrender.com";

export function machineryApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && /(^|\.)buzzard24\.de$/i.test(window.location.hostname)) {
    return RENDER_API;
  }
  return "";
}

export function isMachineryApiConfigured(): boolean {
  return Boolean(machineryApiBase());
}
