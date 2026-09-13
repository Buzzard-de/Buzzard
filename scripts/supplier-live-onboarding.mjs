/**
 * Real B2B supplier live onboarding pipeline (#334).
 * Requires deployment secrets — never commit credentials.
 */
import { createRequire } from "node:module";

process.env.SUPPLIER_LIVE_PROFILE = process.env.SUPPLIER_LIVE_PROFILE || "inter-cars";

const require = createRequire(import.meta.url);
const foundation = require("../server/lib/supplierFoundation.bundle.cjs");

async function main() {
  const profile = foundation.resolveLiveSupplierProfile?.();

  if (!profile) {
    console.log(
      JSON.stringify(
        {
          liveValidation: {
            verdict: "LIVE NOT VALIDATED / SKIPPED",
            message: "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED",
          },
          reason: "Live supplier profile not configured",
        },
        null,
        2
      )
    );
    process.exit(2);
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
          liveValidation: {
            verdict: "LIVE NOT VALIDATED / SKIPPED",
            message: "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED",
          },
          profile: summary,
          credentialReadiness: foundation.describeLiveCredentialReadiness?.(profile),
          hint: "Set SUPPLIER_LIVE_CREDENTIALS='{\"accessToken\":\"<oauth-bearer>\"}' in deployment secrets",
        },
        null,
        2
      )
    );
    process.exit(2);
  }

  if (process.env.SUPPLIER_ORDER_NETWORK_ENABLED === "1") {
    console.error("SUPPLIER_ORDER_NETWORK_ENABLED must remain 0 for read-only onboarding");
    process.exit(1);
  }

  const report = await foundation.runSupplierLiveOnboarding?.({
    batchSizes: [10, 50, 100],
    skipLiveRead: process.env.SUPPLIER_LIVE_READ_ENABLED !== "1",
  });

  console.log(JSON.stringify(report, null, 2));

  const verdict = report?.liveValidation?.verdict;
  if (verdict === "LIVE VALIDATED") {
    process.exit(0);
  }
  if (verdict === "LIVE VALIDATION FAILED") {
    process.exit(1);
  }
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
