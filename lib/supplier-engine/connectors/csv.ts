import { SupplierConnector } from "./base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../types";
import { getTestCsvFeed } from "../fixtures";

function detectDelimiter(line: string): string {
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

export function parseCsvFeed(csv: string): Record<string, unknown>[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const records: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const record: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const val = (values[idx] || "").trim();
      record[h] = /^\d+(\.\d+)?$/.test(val) ? Number(val) : val;
    });
    records.push(record);
  }
  return records;
}

export class CsvSupplierConnector extends SupplierConnector {
  private csvContent: string;

  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}, csvContent?: string) {
    super(supplier, connectorConfig, "csv");
    this.csvContent = csvContent ?? getTestCsvFeed(supplier.supplierId);
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    this.checkCapability("csv");
    return { ok: true, message: "CSV connector ready (file feed, dry-run)" };
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const records = parseCsvFeed(this.csvContent);
    return {
      status: records.length > 0 ? "HEALTHY" : "DEGRADED",
      latencyMs: Date.now() - start,
      lastSuccessfulSync: new Date().toISOString(),
      productsFetched: records.length,
      productsUpdated: 0,
      productsFailed: 0,
      connector: "csv",
      supplierId: this.supplierId,
    };
  }

  protected async doFetchProducts(): Promise<FetchResult> {
    this.checkCapability("csv");
    const records = parseCsvFeed(this.csvContent);
    return {
      ok: true,
      records,
      total: records.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    const products = await this.doFetchProducts();
    const filtered = options?.skus?.length
      ? products.records.filter((r) => options.skus!.includes(String(r.article_number)))
      : products.records;
    return {
      ok: true,
      records: filtered.map((r) => ({ supplier_sku: r.article_number, stock: r.stock_qty })),
      total: filtered.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  protected async doFetchPrices(options?: { skus?: string[] }): Promise<FetchResult> {
    const products = await this.doFetchProducts();
    const filtered = options?.skus?.length
      ? products.records.filter((r) => options.skus!.includes(String(r.article_number)))
      : products.records;
    return {
      ok: true,
      records: filtered.map((r) => ({
        supplier_sku: r.article_number,
        supplier_price: { amount: r.price_net, currency: this.config.currency },
      })),
      total: filtered.length,
      fetchedAt: new Date().toISOString(),
      dryRun: true,
    };
  }

  setCsvContent(csv: string): void {
    this.csvContent = csv;
  }
}
