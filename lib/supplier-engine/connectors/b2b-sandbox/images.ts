import { validateSupplierEndpoint } from "../../network/allowlist";

export function validateSupplierImageUrl(url: unknown): { ok: boolean; value?: string; reason?: string } {
  const value = String(url || "").trim();
  if (!value) return { ok: false, reason: "MISSING_IMAGE" };
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, reason: "INVALID_IMAGE_PROTOCOL" };
    }
    const endpointCheck = validateSupplierEndpoint(value);
    if (!endpointCheck.allowed) {
      return { ok: false, reason: endpointCheck.reason || "BLOCKED_IMAGE_HOST" };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, reason: "INVALID_IMAGE_URL" };
  }
}

export function normalizeSupplierImages(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const images: string[] = [];
  for (const entry of list) {
    const url = typeof entry === "string" ? entry : (entry as { url?: string })?.url;
    const validated = validateSupplierImageUrl(url);
    if (validated.ok && validated.value) images.push(validated.value);
  }
  return images.slice(0, 20);
}
