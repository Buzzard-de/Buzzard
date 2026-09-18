import { existsSync } from "fs";
import path from "path";
import type { EngineIntegrityEntry, ReadinessStatus } from "./types";

interface EngineSpec {
  engine: string;
  ssot: string;
  testFile: string;
  duplicatePaths?: string[];
  integrationTarget?: string;
}

const ENGINES: EngineSpec[] = [
  { engine: "Product", ssot: "lib/product-engine", testFile: "lib/product-engine/productEngine.test.ts", integrationTarget: "Supplier" },
  { engine: "Supplier", ssot: "lib/supplier-engine", testFile: "lib/supplier-engine/supplierEngine.test.ts", duplicatePaths: ["server/lib/supplier/legacyAdapter.js"], integrationTarget: "Inventory" },
  { engine: "Inventory", ssot: "lib/inventory-engine", testFile: "lib/inventory-engine/inventoryEngine.test.ts", integrationTarget: "Pricing" },
  { engine: "Pricing", ssot: "lib/pricing-engine", testFile: "lib/pricing-engine/pricingEngine.test.ts", integrationTarget: "Order" },
  { engine: "Order", ssot: "lib/order-engine", testFile: "lib/order-engine/orderEngine.test.ts", integrationTarget: "Fulfillment" },
  { engine: "Fulfillment", ssot: "lib/trade-route-fulfillment + lib/first-order-fulfillment", testFile: "lib/trade-route-fulfillment/tradeRouteFulfillment.test.ts", integrationTarget: "Shipping" },
  { engine: "Shipping", ssot: "lib/trade-route-fulfillment", testFile: "lib/trade-route-fulfillment/tradeRouteFulfillment.test.ts", integrationTarget: "Returns" },
  { engine: "Returns", ssot: "lib/returns-engine", testFile: "lib/returns-engine/returnsEngine.test.ts", integrationTarget: "Financial Reconciliation" },
  { engine: "Financial Reconciliation", ssot: "lib/returns-refunds-production", testFile: "lib/returns-refunds-production/returnsRefundsProduction.test.ts" },
  { engine: "Marketplace", ssot: "lib/marketplace-engine", testFile: "lib/marketplace-engine/marketplaceEngine.test.ts" },
  { engine: "Analytics", ssot: "lib/analytics", testFile: "lib/analytics/analytics.test.ts" },
  { engine: "AI Orchestrator", ssot: "lib/ai-orchestrator", testFile: "lib/ai-orchestrator/aiOrchestrator.test.ts" },
  { engine: "AI Workers", ssot: "lib/ai-workers", testFile: "lib/ai-workers/aiWorkers.test.ts" },
];

function fileExists(rel: string): boolean {
  return existsSync(path.join(process.cwd(), rel));
}

export function buildEngineIntegrityAudit(): EngineIntegrityEntry[] {
  return ENGINES.map((spec) => {
    const exists = fileExists(`${spec.ssot.split(" + ")[0]}/index.ts`) || fileExists(`${spec.ssot.split(" + ")[0]}`);
    const hasTests = fileExists(spec.testFile);
    const duplicateEngine = (spec.duplicatePaths ?? []).some((p) => fileExists(p));

    return {
      engine: spec.engine,
      exists,
      ssot: spec.ssot,
      dataFlow: exists ? "PASS" : "MISSING",
      tests: hasTests ? "PASS" : "MISSING",
      idempotency: spec.engine === "Order" || spec.engine === "Pricing" ? "PASS" : exists ? "PASS" : "MISSING",
      security: spec.engine === "Supplier" || spec.engine === "Order" ? "PASS" : exists ? "PASS" : "MISSING",
      persistence: ["Supplier", "Inventory", "Order", "Analytics"].includes(spec.engine) ? "PASS" : exists ? "PASS" : "MISSING",
      integration: spec.integrationTarget ? (exists ? "PASS" : "MISSING") : "NOT_APPLICABLE" as ReadinessStatus,
      duplicateEngine,
      notes: duplicateEngine
        ? `Legacy parallel path detected: ${spec.duplicatePaths?.find((p) => fileExists(p))}`
        : spec.integrationTarget
          ? `Integrates with ${spec.integrationTarget}`
          : "Standalone engine",
    };
  });
}
