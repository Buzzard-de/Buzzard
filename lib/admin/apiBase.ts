export function runtimeApiOverride(): string {
  if (typeof window === "undefined") return "";
  const injected = (window as Window & { __BUZZARD_API_URL__?: string }).__BUZZARD_API_URL__;
  return String(injected || "").replace(/\/$/, "");
}

export function localDevelopmentApiBase(hostname?: string): string {
  const host =
    hostname ||
    (typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1");
  const protocol =
    typeof window !== "undefined" && window.location.protocol ? window.location.protocol : "http:";
  if (host === "localhost" || host === "127.0.0.1") {
    return `${protocol}//${host}:3001`;
  }
  return "http://127.0.0.1:3001";
}

export function adminApiBase(): string {
  const override = runtimeApiOverride();
  if (override) return override;
  const configured = String(process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  // Production static export must fail closed without an explicit public API URL.
  // Local next-dev is often started without NEXT_PUBLIC_* baked in; matching the
  // current page hostname keeps CORS same-origin-host with the API on :3001.
  if (process.env.NODE_ENV === "production") return "";
  return localDevelopmentApiBase();
}
