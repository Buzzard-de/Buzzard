import { createHash } from "crypto";

export type SimulatedSupplierStatus =
  | "SANDBOX_ACCEPTED"
  | "SIMULATED_CONFIRMED"
  | "SIMULATED_PROCESSING"
  | "SIMULATED_SHIPPED"
  | "SIMULATED_DELIVERED";

export interface SimulatedTracking {
  trackingId: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  shipmentStatus: string;
  simulated: true;
  classification: "SIMULATED";
}

export function advanceSimulatedSupplierStatus(
  current: SimulatedSupplierStatus
): SimulatedSupplierStatus {
  const flow: SimulatedSupplierStatus[] = [
    "SANDBOX_ACCEPTED",
    "SIMULATED_CONFIRMED",
    "SIMULATED_PROCESSING",
    "SIMULATED_SHIPPED",
    "SIMULATED_DELIVERED",
  ];
  const idx = flow.indexOf(current);
  return flow[Math.min(idx + 1, flow.length - 1)]!;
}

export function buildSimulatedTracking(sandboxOrderId: string): SimulatedTracking {
  const hash = createHash("sha256").update(sandboxOrderId).digest("hex").slice(0, 10).toUpperCase();
  const trackingNumber = `SANDBOX-TRACK-${hash}`;
  return {
    trackingId: `sim_trk_${hash}`,
    trackingNumber,
    carrier: "SANDBOX_CARRIER",
    trackingUrl: `https://sandbox.buzzard.local/rehearsal/tracking/${hash}`,
    shipmentStatus: "SIMULATED_IN_TRANSIT",
    simulated: true,
    classification: "SIMULATED",
  };
}

export function classifySupplierOrderReference(ref?: string): "SANDBOX" | "LIVE" | "UNKNOWN" {
  if (!ref) return "UNKNOWN";
  if (ref.startsWith("SANDBOX-ORDER-")) return "SANDBOX";
  return "LIVE";
}
