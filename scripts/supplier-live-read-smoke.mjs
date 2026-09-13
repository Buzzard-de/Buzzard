/**
 * Optional sandbox smoke — runs only when live credentials and SUPPLIER_LIVE_READ_ENABLED=1.
 * Does not assert fake success; exits non-zero on connection failure.
 */
const foundation = require("../server/lib/supplierFoundation.bundle.cjs");

async function main() {
  const profile = foundation.resolveLiveSupplierProfile?.();
  if (!profile) {
    console.error("SKIPPED — live supplier profile not configured");
    process.exit(0);
  }

  if (!foundation.hasLiveSupplierCredentialsConfigured?.()) {
    console.error("SKIPPED — live supplier credentials not resolved");
    process.exit(0);
  }

  const connection = await foundation.runSupplierConnectionTest(profile.supplierId);
  console.log(JSON.stringify({ phase: "connection-test", ...connection }, null, 2));

  if (connection.status !== "CONNECTED") {
    process.exit(1);
  }

  const dryRun = await foundation.runSupplierDryRunTestSync(profile.supplierId, {
    integrationType: "b2b-sandbox",
  });
  console.log(JSON.stringify({ phase: "dry-run-sync", ok: dryRun.ok, source: dryRun.source, productsFound: dryRun.productsFound }, null, 2));

  if (!dryRun.ok && dryRun.source === "live") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
