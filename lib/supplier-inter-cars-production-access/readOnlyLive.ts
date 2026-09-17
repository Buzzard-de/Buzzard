import { getLatestValidationForScope } from "@/lib/supplier-production-validation/persistence";
import { isLiveReadEnabled } from "@/lib/supplier-engine/liveSupplier/config";
import type { ReadOnlyLiveStatus } from "./types";
import { getInterCarsSupplierId } from "./config";

/** Reports read-only live status from #339 SSOT — never fabricates VALIDATED. */
export function resolveReadOnlyLiveStatus(credentialsStatus: string): ReadOnlyLiveStatus {
  const latest = getLatestValidationForScope({
    supplierId: getInterCarsSupplierId(),
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  if (
    latest?.healthStatus === "LIVE_READ_VALIDATED" &&
    latest.catalogReadStatus === "LIVE_READ_VALIDATED"
  ) {
    return "VALIDATED";
  }

  if (credentialsStatus === "NOT_CONFIGURED" || credentialsStatus === "BLOCKED") {
    return "BLOCKED";
  }

  if (isLiveReadEnabled() && (credentialsStatus === "VALID" || credentialsStatus === "CONFIGURED")) {
    return "NOT_RUN";
  }

  return "NOT_RUN";
}
