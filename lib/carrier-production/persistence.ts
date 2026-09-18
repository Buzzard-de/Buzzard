import type { CarrierLabelRecord } from "./types";

const labels = new Map<string, CarrierLabelRecord>();

export function saveCarrierLabelRecord(record: CarrierLabelRecord): void {
  labels.set(record.labelId, { ...record });
}

export function getCarrierLabelRecord(labelId: string): CarrierLabelRecord | undefined {
  return labels.get(labelId);
}

export function resetCarrierProductionForTests(): void {
  labels.clear();
}
