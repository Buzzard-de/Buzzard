import { getReservation } from "@/lib/inventory-engine";
import { getOrder } from "@/lib/order-engine";
import { getInterCarsSupplierId } from "./config";
import type { CanonicalCreateOrderPayload } from "./payload";
import type { ValidationCheckResult } from "./types";

export function validateOrderProtections(
  orderId: string,
  payload?: CanonicalCreateOrderPayload,
): { checks: ValidationCheckResult[]; blockers: string[] } {
  const checks: ValidationCheckResult[] = [];
  const blockers: string[] = [];
  const order = getOrder(orderId);
  if (!order || !payload) return { checks, blockers: ["ORDER_NOT_FOUND"] };

  for (const item of order.items.filter((i) => i.supplierId === getInterCarsSupplierId())) {
    if (!item.inventoryReservationId && !order.reservationIds.length) {
      checks.push({
        check: "INVENTORY_RESERVATION",
        category: "INVENTORY",
        status: "BLOCKED",
        message: "Missing reservation",
        blocking: true,
      });
      blockers.push("INVENTORY_RESERVATION_MISSING");
    } else {
      const reservationId = item.inventoryReservationId || order.reservationIds[0];
      const reservation = reservationId ? getReservation(reservationId) : undefined;
      if (!reservation) {
        checks.push({
          check: "INVENTORY_RESERVATION",
          category: "INVENTORY",
          status: "BLOCKED",
          message: "Reservation invalid",
          blocking: true,
        });
        blockers.push("INVENTORY_RESERVATION_INVALID");
      } else if (reservation.status !== "ACTIVE") {
        checks.push({
          check: "INVENTORY_RESERVATION",
          category: "INVENTORY",
          status: "BLOCKED",
          message: `Reservation ${reservation.status}`,
          blocking: true,
        });
        blockers.push("INVENTORY_RESERVATION_EXPIRED");
      } else if (reservation.quantity < item.quantity) {
        blockers.push("INVENTORY_INSUFFICIENT");
      } else {
        checks.push({
          check: "INVENTORY_RESERVATION",
          category: "INVENTORY",
          status: "PASS",
          message: "Reservation valid",
        });
      }
    }

    if (item.supplierCostSnapshot <= 0) {
      blockers.push("PRICE_SNAPSHOT_MISSING");
    } else {
      const line = payload.lines.find((l) => l.supplierSku === (item.sku || payload.lines[0]?.supplierSku));
      if (line && Math.abs(line.unitPrice - item.supplierCostSnapshot) > 0.01) {
        checks.push({
          check: "PRICE_SNAPSHOT",
          category: "PRICING",
          status: "BLOCKED",
          message: "Price mismatch",
          blocking: true,
        });
        blockers.push("PRICE_SNAPSHOT_MISMATCH");
      } else {
        checks.push({
          check: "PRICE_SNAPSHOT",
          category: "PRICING",
          status: "PASS",
          message: "Price snapshot aligned",
        });
      }
    }
  }

  const assignment = order.supplierAssignments.find((a) => a.supplierId === getInterCarsSupplierId());
  if (!assignment) {
    blockers.push("SUPPLIER_ASSIGNMENT_MISMATCH");
  } else {
    checks.push({
      check: "SUPPLIER_ASSIGNMENT",
      category: "SUPPLIER",
      status: "PASS",
      message: "Inter Cars assignment confirmed",
    });
  }

  return { checks, blockers: [...new Set(blockers)] };
}
