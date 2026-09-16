import type { SupplierOrderStatusClass } from "./types";

export function normalizeSupplierOrderStatus(raw?: string): SupplierOrderStatusClass {
  const value = (raw || "").toUpperCase();
  if (value.includes("ACCEPT")) return "ACCEPTED";
  if (value.includes("REJECT")) return "REJECTED";
  if (value.includes("PROCESS")) return "PROCESSING";
  if (value.includes("SHIP")) return "SHIPPED";
  if (value.includes("CANCEL")) return "CANCELLED";
  if (value.includes("SUBMIT")) return "SUBMITTED";
  return "UNKNOWN";
}

export function isStatusCapabilityValidated(): boolean {
  return false;
}
