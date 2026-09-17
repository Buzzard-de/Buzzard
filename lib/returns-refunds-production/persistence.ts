import type { SupplierRecoveryRecord } from "./types";

const records = new Map<string, SupplierRecoveryRecord>();

export function saveRecoveryRecord(record: SupplierRecoveryRecord): void {
  records.set(record.recoveryId, { ...record });
}

export function getRecoveryRecord(recoveryId: string): SupplierRecoveryRecord | undefined {
  return records.get(recoveryId);
}

export function resetReturnsRefundsForTests(): void {
  records.clear();
}
