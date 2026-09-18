import type { PaymentProductionRecord, PaymentProductionState } from "./types";

const records = new Map<string, PaymentProductionRecord>();

export function savePaymentProductionRecord(record: PaymentProductionRecord): void {
  records.set(record.paymentId, { ...record });
}

export function getPaymentProductionRecord(paymentId: string): PaymentProductionRecord | undefined {
  return records.get(paymentId);
}

export function getPaymentProductionRecordByOrderId(orderId: string): PaymentProductionRecord | undefined {
  for (const record of records.values()) {
    if (record.orderId === orderId) return record;
  }
  return undefined;
}

export function updatePaymentProductionState(
  paymentId: string,
  state: PaymentProductionState,
  extra: Partial<PaymentProductionRecord> = {},
): PaymentProductionRecord | undefined {
  const record = records.get(paymentId);
  if (!record) return undefined;
  const updated = {
    ...record,
    ...extra,
    state,
    updatedAt: new Date().toISOString(),
  };
  records.set(paymentId, updated);
  return updated;
}

export function resetPaymentProductionForTests(): void {
  records.clear();
}
