import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import type { E2eHarnessMode } from "./types";

export function resolveDefaultE2eMode(): E2eHarnessMode {
  return "LOCAL";
}

export function evaluateProductionE2eGate(): { allowed: boolean; status: "BLOCKED" | "HUMAN_REQUIRED"; reasons: string[] } {
  const reasons: string[] = [];
  const flags = getProductionFlagsSnapshot();
  if (flags.SALES === "ON") reasons.push("SALES_ENABLED");
  if (flags.SUPPLIER_ORDER_NETWORK === "ON") reasons.push("SUPPLIER_ORDER_NETWORK");
  if (flags.PAYMENT_PRODUCTION === "ON") reasons.push("PAYMENT_PRODUCTION");
  if (process.env.E2E_CONTROLLED_PRODUCTION !== "1") reasons.push("E2E_CONTROLLED_PRODUCTION_NOT_ARMED");
  if (process.env.FIRST_ORDER_GATE !== "VALIDATED") reasons.push("FIRST_ORDER_GATE");
  if (process.env.HUMAN_APPROVAL_VALIDATED !== "1") reasons.push("HUMAN_APPROVAL");
  if (process.env.FOUR_EYES_VALIDATED !== "1") reasons.push("FOUR_EYES");
  return {
    allowed: reasons.length === 0,
    status: reasons.length === 0 ? "HUMAN_REQUIRED" : "BLOCKED",
    reasons,
  };
}

export function isE2eTestOrderId(orderId: string): boolean {
  return orderId.startsWith("E2E_TEST") || orderId.includes(":E2E_TEST:");
}

export function formatE2eTestOrderId(suffix: string): string {
  return `E2E_TEST-${suffix}`;
}
