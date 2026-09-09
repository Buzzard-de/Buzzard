import { SupplierConnector } from "./base";
import type { ConnectorConfig, FetchResult, HealthCheckResult, SupplierConfig } from "../types";
import { getTestXmlFeed } from "../fixtures";

function parseXmlProducts(xml: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  if (!xml?.trim()) return records;

  const productBlocks = xml.match(/<product>([\s\S]*?)<\/product>/gi) || [];
  for (const block of productBlocks) {
    const record: Record<string, unknown> = {};
    const tagPattern = /<(\w+)>([^<]*)<\/\1>/g;
    let match;
    while ((match = tagPattern.exec(block)) !== null) {
      const key = match[1];
      const value = match[2].trim();
      record[key] = /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
    if (Object.keys(record).length) records.push(record);
  }
  return records;
}

export class XmlSupplierConnector extends SupplierConnector {
  private xmlContent: string;

  constructor(supplier: SupplierConfig, connectorConfig: ConnectorConfig = {}, xmlContent?: string) {
    super(supplier, connectorConfig, "xml");
    this.xmlContent = xmlContent ?? getTestXmlFeed(supplier.supplierId);
  }

  async connect(): Promise<{ ok: boolean; message: string }> {
    this.checkCapability("xml");
    return { ok: true, message: "XML connector ready (file/HTTP feed, dry-run)" };
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    let status: HealthCheckResult["status"] = "HEALTHY";
    let productsFetched = 0;
    let lastError: string | undefined;

    try {
      const records = parseXmlProducts(this.xmlContent);
      productsFetched = records.length;
      if (!records.length) status = "DEGRADED";
    } catch (e) {
      status = "UNHEALTHY";
      lastError = e instanceof Error ? e.message : "XML_PARSE_ERROR";
    }

    return {
      status,
      latencyMs: Date.now() - start,
      lastSuccessfulSync: status === "HEALTHY" ? new Date().toISOString() : undefined,
      lastError,
      productsFetched,
      productsUpdated: 0,
      productsFailed: 0,
      connector: "xml",
      supplierId: this.supplierId,
    };
  }

  protected async doFetchProducts(): Promise<FetchResult> {
    this.checkCapability("xml");
    try {
      const trimmed = this.xmlContent.trim();
      if (trimmed && !trimmed.startsWith("<?") && !trimmed.startsWith("<")) {
        return {
          ok: false,
          records: [],
          total: 0,
          fetchedAt: new Date().toISOString(),
          error: "MALFORMED_XML",
        };
      }
      const records = parseXmlProducts(this.xmlContent);
      const looksLikeProductFeed = /<product[\s>]/i.test(this.xmlContent);
      if (looksLikeProductFeed && records.length === 0) {
        return {
          ok: false,
          records: [],
          total: 0,
          fetchedAt: new Date().toISOString(),
          error: "MALFORMED_XML",
        };
      }
      return {
        ok: true,
        records,
        total: records.length,
        fetchedAt: new Date().toISOString(),
        dryRun: true,
      };
    } catch (e) {
      return {
        ok: false,
        records: [],
        total: 0,
        fetchedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "MALFORMED_XML",
      };
    }
  }

  protected async doFetchStock(options?: { skus?: string[] }): Promise<FetchResult> {
    const products = await this.doFetchProducts();
    if (!products.ok) return products;
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
    if (!products.ok) return products;
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

  /** Test helper — inject malformed XML */
  setXmlContent(xml: string): void {
    this.xmlContent = xml;
  }
}
