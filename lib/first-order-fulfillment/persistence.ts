import type { FulfillmentPipelineRecord } from "./types";

const records = new Map<string, FulfillmentPipelineRecord>();

export function saveFulfillmentPipelineRecord(record: FulfillmentPipelineRecord): void {
  records.set(record.pipelineId, { ...record });
}

export function getFulfillmentPipelineRecord(pipelineId: string): FulfillmentPipelineRecord | undefined {
  return records.get(pipelineId);
}

export function listFulfillmentPipelineRecords(): FulfillmentPipelineRecord[] {
  return [...records.values()];
}

export function resetFulfillmentPipelineForTests(): void {
  records.clear();
}
