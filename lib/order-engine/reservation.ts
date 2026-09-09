import {
  createStockReservation,
  releaseReservation,
  consumeReservation,
} from "@/lib/inventory-engine";
import type { OrderErrorCode } from "./types";

export interface ReservationAttempt {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  quantity: number;
  orderId: string;
}

export interface ReservationBatchResult {
  ok: boolean;
  reservationIds: string[];
  errorCode?: OrderErrorCode;
  errorMessage?: string;
}

export async function reserveInventoryForOrder(
  attempts: ReservationAttempt[]
): Promise<ReservationBatchResult> {
  const reservationIds: string[] = [];

  for (const attempt of attempts) {
    const result = createStockReservation({
      productId: attempt.productId,
      supplierId: attempt.supplierId,
      supplierOfferId: attempt.supplierOfferId,
      quantity: attempt.quantity,
      orderId: attempt.orderId,
    });

    if (!result.ok || !result.reservation) {
      rollbackReservations(reservationIds);
      const reason = result.reason ?? "RESERVATION_FAILED";
      return {
        ok: false,
        reservationIds: [],
        errorCode: reason === "INSUFFICIENT_SALEABLE_STOCK" ? "OUT_OF_STOCK" : "RESERVATION_FAILED",
        errorMessage: reason,
      };
    }

    reservationIds.push(result.reservation.reservationId);
  }

  return { ok: true, reservationIds };
}

export function rollbackReservations(reservationIds: string[]): void {
  for (const id of reservationIds) {
    releaseReservation(id);
  }
}

export function consumeReservations(reservationIds: string[]): void {
  for (const id of reservationIds) {
    consumeReservation(id);
  }
}
