export function runtimeApiOverride(): string {
  if (typeof window === "undefined") return "";
  const injected = (window as Window & { __BUZZARD_API_URL__?: string }).__BUZZARD_API_URL__;
  return String(injected || "").replace(/\/$/, "");
}

export function adminApiBase(): string {
  return (runtimeApiOverride() || process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}
