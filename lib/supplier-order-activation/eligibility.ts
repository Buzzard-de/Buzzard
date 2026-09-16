import { getLatestValidationForScope } from "@/lib/supplier-production-validation";
import { getLatestRehearsalForScope } from "./persistence";
import { resolveActivationConfig } from "./config";
import type { SupplierOrderActivationRequest } from "./types";

export function evaluateActivationEligibility(input: {
  supplierId: string;
  adapterProfile: string;
  environment: string;
  market: string;
  channel: string;
}): {
  eligible: boolean;
  blockers: string[];
  validationId: string | null;
  rehearsalId: string | null;
} {
  const cfg = resolveActivationConfig();
  const blockers: string[] = [];

  if (input.supplierId !== cfg.interCarsSupplierId) {
    blockers.push("SUPPLIER_NOT_ELIGIBLE");
  }
  if (input.adapterProfile !== cfg.interCarsAdapterProfile) {
    blockers.push("ADAPTER_PROFILE_MISMATCH");
  }
  if (input.environment !== "PRODUCTION") {
    blockers.push("ENVIRONMENT_NOT_PRODUCTION");
  }

  const validation = getLatestValidationForScope({
    supplierId: input.supplierId,
    environment: input.environment,
    market: input.market,
    channel: input.channel,
  });
  const validationId = validation?.validationId ?? null;
  if (!validation || validation.overallStatus !== "PASSED") {
    blockers.push("PRODUCTION_VALIDATION_NOT_READY");
  }
  if (validation?.createOrderCapability === "UNVERIFIED") {
    blockers.push("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
  }

  const rehearsal = getLatestRehearsalForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
  });
  const rehearsalId = rehearsal?.rehearsalId ?? null;
  if (!rehearsal || rehearsal.overallStatus !== "PASSED") {
    blockers.push("REHEARSAL_NOT_COMPLETED");
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    validationId,
    rehearsalId,
  };
}

export function assertScopeMatch(
  activation: SupplierOrderActivationRequest,
  input: { market: string; channel: string; supplierId: string },
): boolean {
  return (
    activation.supplierId === input.supplierId &&
    activation.market === input.market &&
    activation.channel === input.channel
  );
}
