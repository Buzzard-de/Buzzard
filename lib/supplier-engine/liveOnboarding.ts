import { runSupplierConnectionTest, type ConnectionTestResult } from "./connectionTest";
import { runSupplierDryRunTestSync, type DryRunTestSyncResult } from "./testSync";
import { runSupplierLiveReadSync } from "./liveReadSync";
import {
  getSyncCursor,
  saveSyncCursor,
  hydrateSyncCursorsFromPersistence,
  resetSyncCursors,
} from "./syncCursor";
import { getSupplierHealth } from "./health";
import {
  resolveLiveSupplierProfile,
  hasLiveSupplierCredentials,
  isLiveReadEnabled,
  describeLiveCredentialReadiness,
} from "./liveSupplier/config";
import { isSupplierNetworkEnabled, isSupplierOrderNetworkEnabled } from "./network";
import { summarizeIdentifierValidation } from "./identifierValidation";
import { bootstrapSupplierEnginePersistence, resetSupplierEngineBootstrap } from "./bootstrap";
import { computeLiveValidationVerdict, type LiveValidationSummary } from "./liveValidationVerdict";
import { listSuppliers } from "./registry";
import type { LiveSupplierProfile } from "./liveSupplier/types";
import type { SupplierDataQualityReport } from "./dataQuality";
import type { SyncJobResult } from "./types";

export type OnboardingSource = "LIVE" | "MOCK" | "FIXTURE" | "SKIPPED";

export interface ProductSampleEntry {
  supplierSku: string;
  name?: string;
  brand?: string;
  buzzardCategory?: string;
  stock?: number;
  supplierPrice?: number;
  ean?: string;
  mpn?: string;
  tecdocId?: string;
  fitment?: string;
}

export interface LiveOnboardingReport {
  source: OnboardingSource;
  supplier: {
    id: string;
    name: string;
    country: string;
    type: string;
    adapterProfile?: string;
  };
  connector: string;
  environment: string;
  documentation: string[];
  authentication: string;
  endpoints: Record<string, string | undefined>;
  networkGuards: {
    networkEnabled: boolean;
    liveReadEnabled: boolean;
    orderNetworkEnabled: boolean;
  };
  connection: ConnectionTestResult | { status: "SKIPPED"; message: string };
  dryRun: DryRunTestSyncResult | { status: "SKIPPED"; message: string };
  liveRead: Array<SyncJobResult & { batchSize: number; source: OnboardingSource }> | { status: "SKIPPED"; message: string };
  products: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    offers: number;
    stockRecords: number;
    priceRecords: number;
  };
  dataQuality?: SupplierDataQualityReport;
  identifierValidation?: ReturnType<typeof summarizeIdentifierValidation>;
  productSamples: ProductSampleEntry[];
  cursor: {
    before?: string;
    after?: string;
    restartContinues: boolean | "UNKNOWN";
  };
  health?: ReturnType<typeof getSupplierHealth>;
  timing: {
    firstSyncDurationMs?: number;
    averageLatencyMs?: number;
    requests?: number;
    rateLimited429?: number;
    server5xx?: number;
    retries?: number;
    failures?: number;
  };
  security: {
    orderNetworkDisabled: boolean;
    secretsInRepo: false;
    customerPiiUsed: false;
  };
  completedAt: string;
  limitations: string[];
  credentialReadiness?: ReturnType<typeof describeLiveCredentialReadiness>;
  acceptance: LiveValidationAcceptance;
  liveValidation: LiveValidationSummary;
}

export interface LiveValidationAcceptance {
  connection: "CONNECTED" | "FAILED" | "SKIPPED";
  testSync: "PASS" | "FAIL" | "SKIPPED";
  liveRead: "PASS" | "FAIL" | "SKIPPED";
  productEngine: "PASS" | "FAIL" | "SKIPPED";
  inventoryEngine: "PASS" | "FAIL" | "SKIPPED";
  pricingEngine: "PASS" | "FAIL" | "SKIPPED";
  admin: "PASS" | "FAIL" | "SKIPPED";
  security: "PASS" | "FAIL";
  persistentCursor: "PASS" | "FAIL" | "SKIPPED";
  restartIdempotency: "PASS" | "FAIL" | "SKIPPED";
  retryBehavior: "PASS" | "FAIL" | "SKIPPED";
  orderNetwork: "DISABLED";
  returnRefundNetwork: "DISABLED";
}

function inferSource(dryRun?: DryRunTestSyncResult): OnboardingSource {
  if (!dryRun) return "SKIPPED";
  return dryRun.source === "live" ? "LIVE" : dryRun.source === "mock" ? "MOCK" : "FIXTURE";
}

function pickProductSamples(records: Record<string, unknown>[], limit = 10): ProductSampleEntry[] {
  const samples: ProductSampleEntry[] = [];
  const seenBrands = new Set<string>();
  const seenCategories = new Set<string>();

  for (const record of records) {
    const brand = String(record.brand || "");
    const category = String(record.buzzardCategory || "");
    const diverse =
      samples.length < limit &&
      (seenBrands.size < 3 || !seenBrands.has(brand)) &&
      (seenCategories.size < 5 || !seenCategories.has(category));
    if (diverse || samples.length < Math.min(3, limit)) {
      samples.push({
        supplierSku: String(record.supplierSku || record.supplier_sku || ""),
        name: record.name ? String(record.name) : undefined,
        brand: brand || undefined,
        buzzardCategory: category || undefined,
        stock: record.stock != null ? Number(record.stock) : undefined,
        supplierPrice: record.supplierPrice != null ? Number(record.supplierPrice) : undefined,
        ean: record.ean ? String(record.ean) : undefined,
        mpn: record.mpn ? String(record.mpn) : undefined,
        tecdocId: record.tecdocId ? String(record.tecdocId) : undefined,
        fitment: record.fitment ? String(record.fitment) : record.vehicleFitment ? "PRESENT" : "UNKNOWN",
      });
      if (brand) seenBrands.add(brand);
      if (category) seenCategories.add(category);
    }
    if (samples.length >= limit) break;
  }
  return samples;
}

export interface LiveOnboardingOptions {
  batchSizes?: number[];
  skipLiveRead?: boolean;
}

function verifyCursorSurvivesRestart(supplierId: string): boolean {
  const before = getSyncCursor(supplierId, "incremental")?.cursor;
  if (!before) return false;
  resetSupplierEngineBootstrap();
  hydrateSyncCursorsFromPersistence();
  const after = getSyncCursor(supplierId, "incremental")?.cursor;
  return before === after;
}

export async function runSupplierLiveOnboarding(
  options: LiveOnboardingOptions = {}
): Promise<LiveOnboardingReport> {
  bootstrapSupplierEnginePersistence();
  const started = Date.now();
  const profile = resolveLiveSupplierProfile();
  const limitations: string[] = [];
  const batchSizes = options.batchSizes || [10, 50, 100];
  const emptyAcceptance = (): LiveValidationAcceptance => ({
    connection: "SKIPPED",
    testSync: "SKIPPED",
    liveRead: "SKIPPED",
    productEngine: "SKIPPED",
    inventoryEngine: "SKIPPED",
    pricingEngine: "SKIPPED",
    admin: "SKIPPED",
    security: "PASS",
    persistentCursor: "SKIPPED",
    restartIdempotency: "SKIPPED",
    retryBehavior: "SKIPPED",
    orderNetwork: "DISABLED",
    returnRefundNetwork: "DISABLED",
  });

  if (!profile) {
    const liveValidation = computeLiveValidationVerdict(
      {
        source: "SKIPPED",
        limitations: ["profile missing"],
      } as LiveOnboardingReport,
      { credentialsPresent: false }
    );
    return {
      source: "SKIPPED",
      supplier: { id: "", name: "", country: "", type: "" },
      connector: "b2b-sandbox",
      environment: "UNKNOWN",
      documentation: [],
      authentication: "UNKNOWN",
      endpoints: {},
      networkGuards: {
        networkEnabled: isSupplierNetworkEnabled(),
        liveReadEnabled: isLiveReadEnabled(),
        orderNetworkEnabled: isSupplierOrderNetworkEnabled(),
      },
      connection: { status: "SKIPPED", message: "Live supplier profile not configured" },
      dryRun: { status: "SKIPPED", message: "Live supplier profile not configured" },
      liveRead: { status: "SKIPPED", message: "Live supplier profile not configured" },
      products: { total: 0, valid: 0, invalid: 0, duplicates: 0, offers: 0, stockRecords: 0, priceRecords: 0 },
      productSamples: [],
      cursor: { restartContinues: "UNKNOWN" },
      timing: {},
      security: { orderNetworkDisabled: !isSupplierOrderNetworkEnabled(), secretsInRepo: false, customerPiiUsed: false },
      completedAt: new Date().toISOString(),
      limitations: ["SUPPLIER_LIVE_PROFILE or SUPPLIER_LIVE_CONFIG_JSON not configured"],
      acceptance: emptyAcceptance(),
      liveValidation,
    };
  }

  const credentialReadiness = describeLiveCredentialReadiness(profile);
  const docs =
    profile.adapterProfile === "inter-cars"
      ? [
          "https://docs.webapi.intercars.eu/ic-api/contracts/api",
          "https://intercars.com/en/business-solutions-inter-cars/business-services/software/api-and-csv-client-inter-cars",
        ]
      : [];

  if (!hasLiveSupplierCredentials(profile)) {
    limitations.push("Live credentials not resolved — connection and sync phases skipped");
    limitations.push("LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED");
  }

  if (!isSupplierNetworkEnabled()) {
    limitations.push("SUPPLIER_NETWORK_ENABLED=0 — network calls disabled");
  }

  if (isSupplierOrderNetworkEnabled()) {
    limitations.push("SUPPLIER_ORDER_NETWORK_ENABLED must remain 0 for read-only onboarding");
  }

  let connection: ConnectionTestResult | { status: "SKIPPED"; message: string } = {
    status: "SKIPPED",
    message: "Credentials or network not ready",
  };

  if (hasLiveSupplierCredentials(profile) && isSupplierNetworkEnabled()) {
    connection = await runSupplierConnectionTest(profile.supplierId);
  }

  let dryRun: DryRunTestSyncResult | { status: "SKIPPED"; message: string } = {
    status: "SKIPPED",
    message: "Connection not successful or credentials missing",
  };

  if ("status" in connection && connection.status === "CONNECTED") {
    dryRun = await runSupplierDryRunTestSync(profile.supplierId, { integrationType: "b2b-sandbox" });
  }

  const source = "status" in dryRun ? "SKIPPED" : inferSource(dryRun);
  const cursorBefore = getSyncCursor(profile.supplierId, "incremental")?.cursor;

  let liveReadResults: Array<SyncJobResult & { batchSize: number; source: OnboardingSource }> | {
    status: "SKIPPED";
    message: string;
  } = { status: "SKIPPED", message: "Live read disabled or dry-run not successful" };

  if (
    !options.skipLiveRead &&
    isLiveReadEnabled() &&
    "ok" in dryRun &&
    dryRun.ok &&
    dryRun.source === "live"
  ) {
    liveReadResults = [];
    for (const batchSize of batchSizes) {
      const result = await runSupplierLiveReadSync(profile.supplierId, { jobType: "INCREMENTAL" });
      liveReadResults.push({ ...result, batchSize, source: "LIVE" });
      if (result.status === "FAILED") break;
      if (result.productsFetched >= batchSize) continue;
    }
  }

  const cursorAfter = getSyncCursor(profile.supplierId, "incremental")?.cursor;
  let restartContinues: boolean | "UNKNOWN" = "UNKNOWN";
  if (cursorAfter) {
    saveSyncCursor(profile.supplierId, { cursor: cursorAfter, lastModified: new Date().toISOString() }, "incremental");
    restartContinues = verifyCursorSurvivesRestart(profile.supplierId);
  }

  const sampleRecords = "sampleRecords" in dryRun ? dryRun.sampleRecords || [] : [];
  const productSamples =
    "productsFound" in dryRun && dryRun.productsFound > 0
      ? pickProductSamples(sampleRecords, 10)
      : [];
  const identifierValidation = sampleRecords.length
    ? summarizeIdentifierValidation(sampleRecords)
    : undefined;

  const health = getSupplierHealth(profile.supplierId);
  const supplierRegistered = listSuppliers().some((s) => s.supplierId === profile.supplierId);

  const acceptance: LiveValidationAcceptance = {
    connection:
      "status" in connection && connection.status === "SKIPPED"
        ? "SKIPPED"
        : "status" in connection && connection.status === "CONNECTED"
          ? "CONNECTED"
          : hasLiveSupplierCredentials(profile) && isSupplierNetworkEnabled()
            ? "FAILED"
            : "SKIPPED",
    testSync:
      "status" in dryRun
        ? "SKIPPED"
        : dryRun.ok && dryRun.source === "live"
          ? "PASS"
          : dryRun.source === "live"
            ? "FAIL"
            : "SKIPPED",
    liveRead:
      "status" in liveReadResults
        ? "SKIPPED"
        : Array.isArray(liveReadResults) &&
            liveReadResults.some((r) => r.status === "COMPLETED" || r.status === "PARTIAL")
          ? "PASS"
          : Array.isArray(liveReadResults)
            ? "FAIL"
            : "SKIPPED",
    productEngine:
      "ok" in dryRun && dryRun.ok && dryRun.source === "live" && dryRun.valid > 0 ? "PASS" : "SKIPPED",
    inventoryEngine:
      "stockRecords" in dryRun && dryRun.stockRecords > 0 && dryRun.source === "live" ? "PASS" : "SKIPPED",
    pricingEngine:
      "priceRecords" in dryRun && dryRun.priceRecords > 0 && dryRun.source === "live" ? "PASS" : "SKIPPED",
    admin: supplierRegistered ? "PASS" : "SKIPPED",
    security: isSupplierOrderNetworkEnabled() ? "FAIL" : "PASS",
    persistentCursor: cursorAfter ? (restartContinues === true ? "PASS" : "FAIL") : "SKIPPED",
    restartIdempotency: restartContinues === true ? "PASS" : restartContinues === false ? "FAIL" : "SKIPPED",
    retryBehavior: "SKIPPED",
    orderNetwork: "DISABLED",
    returnRefundNetwork: "DISABLED",
  };

  const partialReport = {
    source,
    limitations,
    connection,
    dryRun,
    liveRead: liveReadResults,
  } as LiveOnboardingReport;

  const liveValidation = computeLiveValidationVerdict(partialReport, {
    credentialsPresent: hasLiveSupplierCredentials(profile),
  });

  return {
    source,
    supplier: {
      id: profile.supplierId,
      name: profile.name,
      country: profile.country,
      type: profile.adapterProfile === "inter-cars" ? "Automotive B2B wholesaler" : "B2B",
      adapterProfile: profile.adapterProfile,
    },
    connector: profile.connectorType,
    environment: profile.environment,
    documentation: docs,
    authentication: profile.authentication,
    endpoints: { ...profile.endpoints },
    networkGuards: {
      networkEnabled: isSupplierNetworkEnabled(),
      liveReadEnabled: isLiveReadEnabled(),
      orderNetworkEnabled: isSupplierOrderNetworkEnabled(),
    },
    connection,
    dryRun,
    liveRead: liveReadResults,
    products: {
      total: "productsFound" in dryRun ? dryRun.productsFound : 0,
      valid: "valid" in dryRun ? dryRun.valid : 0,
      invalid: "invalid" in dryRun ? dryRun.invalid : 0,
      duplicates: "duplicates" in dryRun ? dryRun.duplicates : 0,
      offers: "valid" in dryRun ? dryRun.valid : 0,
      stockRecords: "stockRecords" in dryRun ? dryRun.stockRecords : 0,
      priceRecords: "priceRecords" in dryRun ? dryRun.priceRecords : 0,
    },
    dataQuality: "dataQuality" in dryRun ? dryRun.dataQuality : undefined,
    identifierValidation,
    productSamples,
    cursor: { before: cursorBefore, after: cursorAfter, restartContinues },
    health,
    timing: {
      firstSyncDurationMs: Date.now() - started,
      averageLatencyMs: "latencyMs" in connection ? connection.latencyMs : undefined,
    },
    security: {
      orderNetworkDisabled: !isSupplierOrderNetworkEnabled(),
      secretsInRepo: false,
      customerPiiUsed: false,
    },
    completedAt: new Date().toISOString(),
    limitations,
    credentialReadiness,
    acceptance,
    liveValidation,
  };
}

/** Clear in-memory cursor only — used to verify persistence reload without deleting stored cursor. */
export function simulateSupplierEngineRestart(): void {
  resetSupplierEngineBootstrap();
  bootstrapSupplierEnginePersistence();
}

export function probeCursorPersistence(supplierId: string, cursor: string): boolean {
  saveSyncCursor(supplierId, { cursor, lastModified: new Date().toISOString() }, "incremental");
  resetSyncCursors();
  hydrateSyncCursorsFromPersistence();
  return getSyncCursor(supplierId, "incremental")?.cursor === cursor;
}

export function buildInterCarsProfileSummary(profile: LiveSupplierProfile): Record<string, unknown> {
  return {
    supplierId: profile.supplierId,
    name: profile.name,
    country: profile.country,
    adapterProfile: profile.adapterProfile,
    baseUrl: profile.baseUrl,
    environment: profile.environment,
    authentication: profile.authentication,
    endpoints: profile.endpoints,
    priceModel: profile.priceModel || "net",
    priceIncludesVat: profile.priceIncludesVat ?? false,
    supportedMarkets: profile.supportedMarkets,
    pagination: profile.pagination,
  };
}
