/**
 * Browser connect policy. Server guardedFetch does not apply in the browser.
 * Runtime CSP is still the browser enforcement; this is the parallel allowlist.
 */
const FORBIDDEN = [
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.claude.ai",
  "api.stripe.com",
  "api-m.paypal.com",
  "api-m.sandbox.paypal.com",
];

const FORBIDDEN_SUFFIXES = [".anthropic.com", ".openai.com", ".claude.ai", ".stripe.com", ".paypal.com", ".googleapis.com"];

const ALLOWED_SUFFIX = [".onrender.com", "buzzard24.de"];

const ANALYTICS_HOSTS = [
  "www.google-analytics.com",
  "region1.google-analytics.com",
  "www.googletagmanager.com",
  "connect.facebook.net",
  "analytics.tiktok.com",
];

function isRebindLookalike(host) {
  const h = String(host || "").toLowerCase();
  return (
    /\b127\.0\.0\.1\b/.test(h) ||
    h.includes("localhost.") ||
    h.endsWith(".nip.io") ||
    h.endsWith(".sslip.io") ||
    h.endsWith(".localtest.me")
  );
}

function evaluateBrowserConnect(destinationUrl) {
  let host = "";
  try {
    host = new URL(destinationUrl, "https://buzzard24.de").hostname.toLowerCase();
  } catch {
    return { allowed: false, code: "INVALID_URL", host: "" };
  }
  if (FORBIDDEN.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { allowed: false, code: "BROWSER_FORBIDDEN_HOST", host };
  }
  if (FORBIDDEN_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))) {
    return { allowed: false, code: "BROWSER_FORBIDDEN_HOST", host };
  }
  if (isRebindLookalike(host) || host === "169.254.169.254" || host.startsWith("fe80:") || host === "::1") {
    return { allowed: false, code: "BROWSER_REBIND_DENIED", host };
  }
  if (ANALYTICS_HOSTS.includes(host)) {
    const telemetryOn = Boolean(
      process.env.NEXT_PUBLIC_GA4_ID ||
        process.env.NEXT_PUBLIC_GTM_ID ||
        process.env.NEXT_PUBLIC_META_PIXEL_ID ||
        process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
    );
    if (!telemetryOn) {
      return { allowed: false, code: "BROWSER_TELEMETRY_OFF", host };
    }
    return { allowed: true, code: "THIRD_PARTY_ANALYTICS", host };
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return { allowed: true, code: "LOCAL_DEV", host };
  }
  if (ALLOWED_SUFFIX.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) {
    return { allowed: true, code: "BROWSER_ALLOW", host };
  }
  return { allowed: false, code: "BROWSER_HOST_DENIED", host };
}

module.exports = { evaluateBrowserConnect, isRebindLookalike, ANALYTICS_HOSTS };
