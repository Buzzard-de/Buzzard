export interface BatchOptions {
  batchSize?: number;
  cursor?: string;
  onBatch?: (records: unknown[], batchIndex: number) => Promise<void>;
}

export interface BatchResult<T> {
  records: T[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}

export async function processInBatches<T>(
  allRecords: T[],
  processor: (batch: T[], batchIndex: number) => Promise<void>,
  batchSize = 50
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    try {
      await processor(batch, Math.floor(i / batchSize));
      processed += batch.length;
    } catch {
      failed += batch.length;
    }
  }

  return { processed, failed };
}

export function paginateRecords<T>(
  records: T[],
  options: { batchSize?: number; cursor?: string } = {}
): BatchResult<T> {
  const batchSize = options.batchSize ?? 50;
  const start = options.cursor ? parseInt(options.cursor, 10) || 0 : 0;
  const slice = records.slice(start, start + batchSize);
  const next = start + batchSize;
  return {
    records: slice,
    total: records.length,
    cursor: next < records.length ? String(next) : undefined,
    hasMore: next < records.length,
  };
}
