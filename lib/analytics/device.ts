import type { DeviceType } from "./types";

export function classifyDevice(userAgent?: string, screenClass?: string): DeviceType {
  if (screenClass === "mobile") return "MOBILE";
  if (screenClass === "tablet") return "TABLET";
  if (screenClass === "desktop") return "DESKTOP";

  const ua = (userAgent ?? "").toLowerCase();
  if (/ipad|tablet|kindle/.test(ua)) return "TABLET";
  if (/mobile|iphone|android/.test(ua)) return "MOBILE";
  if (/windows|macintosh|linux|cros/.test(ua)) return "DESKTOP";
  return "OTHER";
}

export function privacySafeBrowserFamily(userAgent?: string): string | undefined {
  const ua = userAgent ?? "";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return undefined;
}

export function privacySafeOsFamily(userAgent?: string): string | undefined {
  const ua = userAgent ?? "";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return undefined;
}
