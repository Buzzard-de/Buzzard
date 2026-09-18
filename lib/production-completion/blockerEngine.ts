import { getAllProviderStates } from "@/lib/production-access/providerRegistry";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionArmingDashboard } from "@/lib/supplier-production-order-arming/admin";
import { getFirstProductionOrderDashboard } from "@/lib/supplier-first-production-order/admin";
import { getControlledGoLiveDashboard } from "@/lib/supplier-controlled-go-live/admin";
import { getObservationDashboard } from "@/lib/supplier-go-live-observation/admin";
import type { BlockerSeverity, StructuredBlocker } from "./types";

function blocker(
  code: string,
  severity: BlockerSeverity,
  description: string,
  resolution: string,
  provider?: string,
  status: StructuredBlocker["status"] = "BLOCKED",
): StructuredBlocker {
  return { code, severity, provider, description, resolution, status };
}

export function buildStructuredBlockers(): StructuredBlocker[] {
  const blockers: StructuredBlocker[] = [];
  const interCars = evaluateInterCarsProductionAccess();
  const providers = getAllProviderStates();

  if (interCars.productionCredentials === "NOT_CONFIGURED") {
    blockers.push(
      blocker(
        "MISSING_INTER_CARS_CREDENTIAL",
        "CRITICAL",
        "Inter Cars production credentials not configured",
        "Deploy OAuth2 credentials via Secret Manager and set SUPPLIER_LIVE_CREDENTIALS_SECRET_REF",
        "inter-cars",
        "NOT_CONFIGURED",
      ),
    );
  }

  if (interCars.createOrderCapability !== "VALIDATED") {
    blockers.push(
      blocker(
        "CREATE_ORDER_NOT_VALIDATED",
        "CRITICAL",
        "Controlled #342 CreateOrder validation not passed with genuine evidence",
        "Run controlled live validation with four-eyes approval when credentials are available",
        "inter-cars",
        "UNVERIFIED",
      ),
    );
  }

  if (interCars.readOnlyLiveValidation !== "VALIDATED") {
    blockers.push(
      blocker(
        "INTER_CARS_READ_NOT_VALIDATED",
        "HIGH",
        "Inter Cars read-only live validation not completed",
        "Enable SUPPLIER_LIVE_READ_ENABLED=1 and run health/catalog/stock/price checks",
        "inter-cars",
        "UNVERIFIED",
      ),
    );
  }

  for (const p of providers) {
    if (p.providerId === "inter-cars") continue;
    if (p.liveValidation !== "VALIDATED") {
      const code = `${p.providerId.toUpperCase().replace("-", "_")}_NOT_VALIDATED`;
      blockers.push(
        blocker(
          code,
          "HIGH",
          `${p.domain} production not validated`,
          `Configure secret reference and run safe read-only validation for ${p.providerId}`,
          p.providerId,
          p.accessState === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "UNVERIFIED",
        ),
      );
    }
  }

  try {
    const arming = getProductionArmingDashboard();
    if (arming.armingState !== "ARMED") {
      blockers.push(
        blocker(
          "ARMING_NOT_COMPLETE",
          "CRITICAL",
          "#343 production order arming not complete",
          "Complete #342 validation then arm production order gate",
          "inter-cars",
          "BLOCKED",
        ),
      );
    }
  } catch {
    blockers.push(
      blocker("ARMING_UNAVAILABLE", "CRITICAL", "Arming dashboard unavailable", "Verify supplier-production-order-arming module", "inter-cars"),
    );
  }

  try {
    const firstOrder = getFirstProductionOrderDashboard();
    if (firstOrder.firstOrderState !== "EXECUTED") {
      blockers.push(
        blocker(
          "FIRST_ORDER_NOT_EXECUTED",
          "CRITICAL",
          "First production supplier order not executed with genuine evidence",
          "Execute controlled first order via #344 with dual approval",
          "inter-cars",
          firstOrder.firstOrderState === "BLOCKED" ? "BLOCKED" : "UNVERIFIED",
        ),
      );
    }
  } catch {
    blockers.push(
      blocker("FIRST_ORDER_UNAVAILABLE", "CRITICAL", "First order dashboard unavailable", "Verify supplier-first-production-order module"),
    );
  }

  try {
    const goLive = getControlledGoLiveDashboard();
    if (goLive.controlledGoLive !== "ACTIVE") {
      blockers.push(
        blocker(
          "CONTROLLED_GO_LIVE_NOT_ACTIVE",
          "HIGH",
          "#345 controlled go-live not active",
          "Complete first production order and activate controlled go-live",
          "inter-cars",
          "BLOCKED",
        ),
      );
    }
  } catch {
    /* module may not be initialized in test */
  }

  try {
    const obs = getObservationDashboard();
    if (obs.observationState !== "COMPLETED" && obs.observationState !== "ACTIVE") {
      blockers.push(
        blocker(
          "OBSERVATION_NOT_COMPLETED",
          "HIGH",
          "#346 observation period not completed",
          "Run observation window after controlled go-live",
          "inter-cars",
          "BLOCKED",
        ),
      );
    }
  } catch {
    /* module may not be initialized in test */
  }

  return blockers;
}
