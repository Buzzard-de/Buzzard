import { previewFirstOrder, prepareFirstOrderGate } from "@/lib/supplier-order-activation/firstOrder";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { getLatestArmingForScope } from "./persistence";

/**
 * Bridge to #340 first-order gate — arming alone does not enable execution.
 */
export function evaluateArmingFirstOrderGate(input: {
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  orderValue: number;
  currency: string;
}): { allowed: boolean; blockers: string[]; armed: boolean } {
  const blockers: string[] = [];
  const arming = getLatestArmingForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment: "PRODUCTION",
  });

  const armed = arming?.status === "ARMED";
  if (!armed) blockers.push("PRODUCTION_NOT_ARMED");

  const activation = listActivationRecords()
    .filter(
      (a) =>
        a.supplierId === input.supplierId &&
        a.market === input.market &&
        a.channel === input.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (!activation) {
    blockers.push("ACTIVATION_NOT_FOUND");
    return { allowed: false, blockers, armed };
  }

  const preview = previewFirstOrder({
    activationId: activation.activationId,
    payload: {
      supplierId: input.supplierId,
      market: input.market,
      channel: input.channel,
      items: [{ sku: "arming-gate-check", quantity: 1, unitCost: input.orderValue }],
      shippingAddress: { country: input.market, city: "GateCheck" },
      currency: input.currency,
      inventoryReservationId: "arming-gate-reservation",
      priceSnapshotId: "arming-gate-price",
      supplierAssignmentSnapshotId: "arming-gate-assignment",
    },
  });
  blockers.push(
    ...preview.gates.filter((g) => g.status === "BLOCKED").map((g) => g.check),
  );

  return { allowed: blockers.length === 0, blockers, armed };
}

export { previewFirstOrder, prepareFirstOrderGate };
