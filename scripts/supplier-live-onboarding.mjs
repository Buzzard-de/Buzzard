/**
 * Real B2B supplier live onboarding pipeline (#334).
 * Requires deployment secrets — never commit credentials.
 *
 * Phases:
 * 1. Connection test (SUPPLIER_NETWORK_ENABLED=1, SUPPLIER_LIVE_READ_ENABLED=0)
 * 2. Dry-run test sync
 * 3. Controlled live read (SUPPLIER_LIVE_READ_ENABLED=1)
 */
const foundation = require("../server/lib/supplierFoundation.bundle.cjs");

async function main() {
  const profile = foundation.resolveLiveSupplierProfile?.();

  if (!profile) {
    console.log(JSON.stringify({ source: "SKIPPED", reason: "Live supplier profile not configured" }, null, 2));
    process.exit(0);
  }

  if (!foundation.hasLiveSupplierCredentialsConfigured?.()) {
    const summary = foundation.buildInterCarsProfileSummary?.(profile) || {
      supplierId: profile.supplierId,
      name: profile.name,
      environment: profile.environment,
    };
    console.log(
      JSON.stringify(
        {
          source: "SKIPPED",
          reason: "Live supplier credentials not resolved",
          profile: summary,
          hint: "Set SUPPLIER_LIVE_PROFILE=inter-cars and SUPPLIER_LIVE_CREDENTIALS in deployment secrets",
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const report = await foundation.runSupplierLiveOnboarding?.({
    batchSizes: [10, 50, 100],
    skipLiveRead: process.env.SUPPLIER_LIVE_READ_ENABLED !== "1",
  });

  console.log(JSON.stringify(report, null, 2));

  const connectionFailed =
    report?.connection?.status && report.connection.status !== "CONNECTED" && report.connection.status !== "SKIPPED";
  const dryRunFailed = report?.dryRun?.ok === false && report?.dryRun?.source === "live";

  if (connectionFailed || dryRunFailed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
