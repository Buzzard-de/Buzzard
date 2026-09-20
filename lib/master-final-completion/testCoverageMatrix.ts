import type { TestCoverageRow } from "./types";

/** Static registry — vitest/npm scripts executed in gate script; not production evidence. */
export function buildTestCoverageMatrix(): TestCoverageRow[] {
  return [
    { area: "AI", tests: "test:ai-workers", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0", note: "Not LIVE evidence" },
    { area: "MEMORY", tests: "test:central-ai-memory", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "APPROVAL", tests: "test:human-approval-center", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "EXCEPTION", tests: "test:exception-engine", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "MARKETPLACE", tests: "test:marketplace-engine", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "E2E_ORDER", tests: "test:supplier-order-rehearsal", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "SECURITY", tests: "test:final-closure", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
    { area: "EXTERNAL_ACCESS", tests: "test:external-access-control-center", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "1" },
    { area: "RENDER", tests: "test:render-persistence-evidence-bridge", pass: "EXPECTED", fail: "0", blocked: "1", humanRequired: "1" },
    { area: "INTER_CARS", tests: "test:inter-cars-production-access-evidence-bridge", pass: "EXPECTED", fail: "0", blocked: "1", humanRequired: "1" },
    { area: "MASTER_READINESS", tests: "test:master-external-provider-readiness", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "1" },
    { area: "FINAL_COMPLETION", tests: "test:master-final-completion", pass: "EXPECTED", fail: "0", blocked: "0", humanRequired: "0" },
  ];
}
