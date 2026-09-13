import { SUPPLIER_NETWORK_CONFIG } from "./config";

const JSON_CONTENT = /^application\/(json|.*\+json)/i;
const XML_CONTENT = /^(application|text)\/(xml|.*\+xml)/i;
const CSV_CONTENT = /^text\/(csv|plain)/i;

export function validateResponseSize(body: string, maxBytes = SUPPLIER_NETWORK_CONFIG.maxResponseBytes): {
  ok: boolean;
  truncated: boolean;
  body: string;
} {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(body);
  if (bytes.length <= maxBytes) {
    return { ok: true, truncated: false, body };
  }
  const truncated = new TextDecoder().decode(bytes.slice(0, maxBytes));
  return { ok: false, truncated: true, body: truncated };
}

export function validateContentType(
  contentType: string | undefined,
  expected: "json" | "xml" | "csv" | "any" = "any"
): { ok: boolean; reason?: string } {
  if (!contentType) {
    return expected === "any" ? { ok: true } : { ok: false, reason: "MISSING_CONTENT_TYPE" };
  }
  if (expected === "any") return { ok: true };
  if (expected === "json" && JSON_CONTENT.test(contentType)) return { ok: true };
  if (expected === "xml" && XML_CONTENT.test(contentType)) return { ok: true };
  if (expected === "csv" && CSV_CONTENT.test(contentType)) return { ok: true };
  return { ok: false, reason: "INVALID_CONTENT_TYPE" };
}

export function safeParseJson(body: string): { ok: true; data: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, data: JSON.parse(body) };
  } catch {
    return { ok: false, reason: "MALFORMED_JSON" };
  }
}
