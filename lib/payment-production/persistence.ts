import type { PaymentProductionRecord } from "./types";

const records = new Map<string, PaymentProductionRecord>();

export function savePaymentProductionRecord(record: PaymentProductionRecord): void {
  records.set(record.paymentId, { ...record });
}

export function getPaymentProductionRecord(paymentId: string): PaymentProductionRecord | undefined {
  return records.get(paymentId);
}

export function resetPaymentProductionForTests(): void {
  records.clear();
}
