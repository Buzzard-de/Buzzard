import type { StockBufferConfig } from "./types";

/** Apply stock buffer to supplier available quantity. */
export function applyStockBuffer(
  availableQuantity: number,
  buffer: StockBufferConfig
): number {
  const qty = Math.max(0, availableQuantity);
  if (buffer.type === "percentage") {
    const bufferAmount = Math.floor(qty * buffer.value);
    return Math.max(0, qty - bufferAmount);
  }
  return Math.max(0, qty - Math.floor(buffer.value));
}

export function describeStockBuffer(buffer: StockBufferConfig): string {
  if (buffer.type === "percentage") {
    return `${(buffer.value * 100).toFixed(0)}%`;
  }
  return `${buffer.value} units`;
}
