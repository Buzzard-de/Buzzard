import {
  getMaxReservationQuantity,
  getReservationTtlMs,
  getStockRecord,
  upsertStockRecord,
} from "./registry";
import { calculateSaleableQuantity, recomputeStockRecord } from "./stock";
import { emitStockEvent } from "./events";
import type { ReservationResult, StockReservation, SupplierStockRecord } from "./types";

const reservations = new Map<string, StockReservation>();

export function getActiveReservations(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): StockReservation[] {
  expireReservations();
  return [...reservations.values()].filter(
    (r) =>
      r.status === "ACTIVE" &&
      r.productId === productId &&
      r.supplierId === supplierId &&
      r.supplierOfferId === supplierOfferId
  );
}

export function getTotalReservedQuantity(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): number {
  return getActiveReservations(productId, supplierId, supplierOfferId).reduce(
    (sum, r) => sum + r.quantity,
    0
  );
}

function expireReservations(): void {
  const now = Date.now();
  for (const [id, reservation] of reservations) {
    if (reservation.status === "ACTIVE" && new Date(reservation.expiresAt).getTime() <= now) {
      reservations.set(id, { ...reservation, status: "EXPIRED" });
      refreshRecordReservations(reservation.productId, reservation.supplierId, reservation.supplierOfferId);
    }
  }
}

function refreshRecordReservations(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): void {
  const record = getStockRecord(productId, supplierId, supplierOfferId);
  if (!record) return;
  const reservedQuantity = getTotalReservedQuantity(productId, supplierId, supplierOfferId);
  const updated = recomputeStockRecord({ ...record, reservedQuantity });
  upsertStockRecord(updated);
}

/**
 * Create Buzzard order reservation — NOT a supplier-confirmed hold.
 * Uses in-memory atomic check for foundation overselling protection.
 */
export function createStockReservation(input: {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  quantity: number;
  orderId?: string;
}): ReservationResult {
  expireReservations();

  if (input.quantity <= 0) return { ok: false, reason: "INVALID_QUANTITY" };
  if (input.quantity > getMaxReservationQuantity()) return { ok: false, reason: "QUANTITY_TOO_HIGH" };

  const record = getStockRecord(input.productId, input.supplierId, input.supplierOfferId);
  if (!record) return { ok: false, reason: "STOCK_RECORD_NOT_FOUND" };

  const currentReserved = getTotalReservedQuantity(
    input.productId,
    input.supplierId,
    input.supplierOfferId
  );

  const saleable = calculateSaleableQuantity({
    availableQuantity: record.availableQuantity,
    stockBuffer: record.stockBuffer,
    reservedQuantity: currentReserved,
    isStale: record.isStale,
    stalePolicy: record.stalePolicy,
    manuallyDiscontinued: record.manuallyDiscontinued,
    stockStatus: record.stockStatus,
  });

  if (input.quantity > saleable) {
    return { ok: false, reason: "INSUFFICIENT_SALEABLE_STOCK" };
  }

  const now = new Date();
  const reservation: StockReservation = {
    reservationId: `res_${input.productId}_${now.getTime()}`,
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    quantity: input.quantity,
    orderId: input.orderId,
    status: "ACTIVE",
    isSupplierConfirmed: false,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + getReservationTtlMs()).toISOString(),
  };

  reservations.set(reservation.reservationId, reservation);
  refreshRecordReservations(input.productId, input.supplierId, input.supplierOfferId);

  emitStockEvent({
    type: "STOCK_CHANGED",
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    source: "reservation",
    metadata: { action: "RESERVE", quantity: input.quantity, orderId: input.orderId },
  });

  return { ok: true, reservation };
}

export function releaseReservation(reservationId: string): ReservationResult {
  const reservation = reservations.get(reservationId);
  if (!reservation) return { ok: false, reason: "RESERVATION_NOT_FOUND" };
  if (reservation.status !== "ACTIVE") return { ok: false, reason: "RESERVATION_NOT_ACTIVE" };

  reservations.set(reservationId, { ...reservation, status: "RELEASED" });
  refreshRecordReservations(reservation.productId, reservation.supplierId, reservation.supplierOfferId);
  return { ok: true, reservation: { ...reservation, status: "RELEASED" } };
}

export function consumeReservation(reservationId: string): ReservationResult {
  const reservation = reservations.get(reservationId);
  if (!reservation) return { ok: false, reason: "RESERVATION_NOT_FOUND" };
  if (reservation.status !== "ACTIVE") return { ok: false, reason: "RESERVATION_NOT_ACTIVE" };

  reservations.set(reservationId, { ...reservation, status: "CONSUMED" });
  refreshRecordReservations(reservation.productId, reservation.supplierId, reservation.supplierOfferId);
  return { ok: true, reservation: { ...reservation, status: "CONSUMED" } };
}

export function cancelReservation(reservationId: string): ReservationResult {
  const reservation = reservations.get(reservationId);
  if (!reservation) return { ok: false, reason: "RESERVATION_NOT_FOUND" };
  if (reservation.status !== "ACTIVE") return { ok: false, reason: "RESERVATION_NOT_ACTIVE" };

  reservations.set(reservationId, { ...reservation, status: "CANCELLED" });
  refreshRecordReservations(reservation.productId, reservation.supplierId, reservation.supplierOfferId);
  return { ok: true, reservation: { ...reservation, status: "CANCELLED" } };
}

export function clearAllReservations(): void {
  reservations.clear();
}

export function getReservation(reservationId: string): StockReservation | undefined {
  return reservations.get(reservationId);
}

export function listReservations(filter?: { productId?: string; status?: StockReservation["status"] }): StockReservation[] {
  expireReservations();
  return [...reservations.values()].filter((r) => {
    if (filter?.productId && r.productId !== filter.productId) return false;
    if (filter?.status && r.status !== filter.status) return false;
    return true;
  });
}

export function attachReservedQuantity(record: SupplierStockRecord): SupplierStockRecord {
  const reservedQuantity = getTotalReservedQuantity(
    record.productId,
    record.supplierId,
    record.supplierOfferId
  );
  return recomputeStockRecord({ ...record, reservedQuantity });
}
