import { getSupplier } from "./registry";
import { hasCapability } from "./capabilities";

export type CanonicalTrackingStatus =
  | "LABEL_CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "UNKNOWN";

const STATUS_MAP: Record<string, CanonicalTrackingStatus> = {
  label_created: "LABEL_CREATED",
  picked_up: "PICKED_UP",
  in_transit: "IN_TRANSIT",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  exception: "EXCEPTION",
};

export interface SupplierTrackingSnapshot {
  ok: boolean;
  dryRun: boolean;
  supplierId: string;
  supplierOrderId: string;
  trackingNumber?: string;
  carrier?: string;
  status: CanonicalTrackingStatus;
  rawStatus?: string;
}

export function mapSupplierTrackingStatus(raw: string): CanonicalTrackingStatus {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_MAP[key] ?? "UNKNOWN";
}

export async function fetchSupplierTracking(
  supplierId: string,
  supplierOrderId: string
): Promise<SupplierTrackingSnapshot> {
  const supplier = getSupplier(supplierId);
  if (!supplier || !hasCapability(supplier.capabilities, "trackingAPI")) {
    return {
      ok: false,
      dryRun: true,
      supplierId,
      supplierOrderId,
      status: "UNKNOWN",
    };
  }

  return {
    ok: true,
    dryRun: true,
    supplierId,
    supplierOrderId,
    trackingNumber: `DRY-TRK-${supplierOrderId.slice(-6)}`,
    carrier: "DRY_RUN_CARRIER",
    status: "IN_TRANSIT",
    rawStatus: "in_transit",
  };
}
