export const TRACKING_FULFILLMENT_VERSION = "349.1.0";

export function isSandboxTrackingId(trackingNumber: string): boolean {
  return /^SANDBOX-TRACK-/i.test(trackingNumber.trim());
}

export function resolveTrackingStaleMs(): number {
  return Number(process.env.TRACKING_STALE_MS || String(7 * 24 * 60 * 60 * 1000));
}
