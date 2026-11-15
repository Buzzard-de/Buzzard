import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gaps = require("../lib/completion/repositoryGaps");
const seo = require("../lib/buzzardNative/core/specialists/seoEngine");

test("local product schema rejects a price while sales are off", () => {
  const draft = seo.draft({
    titleFacts: ["Pad", "iso 9001"],
    lang: "de",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Pad",
      sku: "SKU-1",
      offers: { "@type": "Offer", price: 12, priceCurrency: "EUR" },
    },
  });
  assert.equal(draft.inventedClaimsRejected.length, 1);
  assert.equal(draft.localeKnown, true);
  assert.equal(draft.localeCount, 30);
  assert.equal(draft.schemaCheck.salesPriceBlocked, true);
  assert.equal(draft.schemaCheck.live, false);
  assert.equal(draft.livePublish, false);
  assert.equal(seo.livePublish().code, "HUMAN_GATE_REQUIRED");
});

test("discovered software tasks complete and locked engines stay out of that ratio", () => {
  const checkpoint = path.join(os.tmpdir(), `repo-gaps-${process.pid}.json`);
  const report = gaps.runDiscovered({ checkpointPath: checkpoint });
  assert.equal(report.cursorRunsContinuously, false);
  assert.equal(report.independentWorker, false);
  assert.equal(report.softwareCompleted, report.discoveredSoftware);
  assert.equal(report.autonomousSoftwareCompletion, 1);
  assert.ok(report.projectCompletionIncludingGates < 1);
  assert.equal(report.tasks.find((task) => task.id === "EU27_REGISTRY_IMPORT").status, "EXTERNAL_DEPENDENCY_BLOCKED");
  assert.equal(report.tasks.find((task) => task.id === "LIVE_BANK_CONNECTORS").status, "HUMAN_APPROVAL_REQUIRED");
  assert.equal(report.tasks.find((task) => task.id === "HEARING_HUMAN_STT").status, "EXTERNAL_DEPENDENCY_BLOCKED");
  const saved = JSON.parse(fs.readFileSync(checkpoint, "utf8"));
  assert.equal(saved.softwareCompleted, 2);
  fs.rmSync(checkpoint, { force: true });
});
