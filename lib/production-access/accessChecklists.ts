import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { getPaymentProductionDashboard } from "@/lib/payment-production/admin";
import { getCarrierProductionDashboard } from "@/lib/carrier-production/admin";
import { getAiProductionDashboard } from "@/lib/ai-production/admin";
import { getReturnsRefundsProductionDashboard } from "@/lib/returns-refunds-production/admin";
import { getTrackingFulfillmentDashboard } from "@/lib/tracking-fulfillment/admin";
import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { AccessChecklistItem, AccessStatus, SecretRefStatus } from "./types";

function item(id: string, label: string, status: AccessStatus): AccessChecklistItem {
  return { id, label, status, required: true };
}

export function buildInterCarsAccessChecklist(secret: SecretRefStatus): AccessChecklistItem[] {
  const diag = evaluateInterCarsProductionAccess();
  return [
    item("ic_production_account", "Inter Cars production API account", "NOT_AVAILABLE"),
    item("ic_oauth2_token", "OAuth2 production token/access", secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("ic_secret_manager", "Deployment Secret Manager entry", secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("ic_live_profile", "SUPPLIER_LIVE_PROFILE=inter-cars", diag.interCarsProfile === "CONFIGURED" ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("ic_read_network", "Read-only network access", process.env.SUPPLIER_LIVE_READ_ENABLED === "1" ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("ic_health", "Health endpoint", diag.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("ic_catalog", "Catalog endpoint", diag.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("ic_stock", "Stock endpoint", diag.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("ic_price", "Price endpoint", diag.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("ic_controlled_validation", "#342 controlled validation", diag.createOrderCapability === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
  ];
}

export function buildPaymentAccessChecklist(secret: SecretRefStatus): AccessChecklistItem[] {
  return [
    item("pay_merchant_account", "Merchant/business account", "NOT_AVAILABLE"),
    item("pay_api_credentials", "Production API credentials", secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("pay_webhook", "Production webhook configuration", "NOT_CONFIGURED"),
    item("pay_webhook_secret", "Webhook signing secret", "NOT_CONFIGURED"),
    item("pay_currencies", "EUR and required market currencies", "UNVERIFIED"),
    item("pay_refund", "Refund capability", "UNVERIFIED"),
    item("pay_secret_manager", "Deployment Secret Manager entry", secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED"),
  ];
}

export function buildCarrierAccessChecklist(secret: SecretRefStatus): AccessChecklistItem[] {
  return [
    item("carrier_account", "Carrier production account", "NOT_AVAILABLE"),
    item("carrier_credentials", "Production API credentials", secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("carrier_service_mapping", "Country/service mapping", "UNVERIFIED"),
    item("carrier_secret_manager", "Deployment Secret Manager entry", secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED"),
  ];
}

export function buildAiAccessChecklist(secret: SecretRefStatus): AccessChecklistItem[] {
  return [
    item("ai_provider_account", "AI production provider account", "NOT_AVAILABLE"),
    item("ai_secret_ref", "Production secret reference", secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED"),
    item("ai_health", "Provider health check", "UNVERIFIED"),
    item("ai_rate_limit", "Rate limit configuration", "UNVERIFIED"),
  ];
}

export function buildReturnsAccessChecklist(secret?: SecretRefStatus): AccessChecklistItem[] {
  const credStatus = secret?.secretResolvable ? "CONFIGURED" : secret?.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED";
  return [
    item("returns_secret_ref", "Returns provider secret reference", credStatus),
    item("returns_eligibility", "Return eligibility rules", "UNVERIFIED"),
    item("returns_supplier_credit", "Supplier credit path", "UNVERIFIED"),
    item("returns_customer_refund", "Customer refund path", "UNVERIFIED"),
    item("returns_production_flag", "Returns production disabled by default", isProductionFlagEnabled("RETURNS_PRODUCTION") ? "BLOCKED" : "CONFIGURED"),
  ];
}

export function buildMarketingAccessChecklist(): AccessChecklistItem[] {
  const providers = ["GOOGLE_ADS", "META", "TIKTOK", "YOUTUBE"] as const;
  const items: AccessChecklistItem[] = [
    item("marketing_spend_off", "Marketing spend disabled by default", isProductionFlagEnabled("MARKETING_SPEND") ? "BLOCKED" : "CONFIGURED"),
  ];
  for (const p of providers) {
    const configured = Boolean(process.env[`${p}_SECRET_REF`]?.trim());
    items.push(item(`marketing_${p.toLowerCase()}`, `${p} secret reference`, configured ? "CONFIGURED" : "NOT_CONFIGURED"));
  }
  return items;
}

function gateStatusToAccess(status: string): AccessStatus {
  if (status === "PASS" || status === "VALIDATED" || status === "EXECUTED" || status === "COMPLETED" || status === "ARMED" || status === "ACTIVE") {
    return "VALIDATED";
  }
  if (status === "CONFIGURED" || status === "ENABLED" || status === "REVIEW_READY") return "CONFIGURED";
  if (status === "NOT_CONFIGURED" || status === "NONE") return "NOT_CONFIGURED";
  if (status === "BLOCKED" || status === "FAILED") return "BLOCKED";
  return "UNVERIFIED";
}

export function buildRealWorldGoLiveChecklist(): AccessChecklistItem[] {
  const interCars = evaluateInterCarsProductionAccess();
  const accessDash = getProductionAccessDashboard();
  const payment = getPaymentProductionDashboard();
  const carrier = getCarrierProductionDashboard();
  const returns = getReturnsRefundsProductionDashboard();
  const ai = getAiProductionDashboard();
  const tracking = getTrackingFulfillmentDashboard();

  return [
    item("rw_ic_credentials", "Inter Cars credentials deployed", interCars.productionCredentials === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "CONFIGURED"),
    item("rw_ic_read_live", "Inter Cars read-only live PASS", interCars.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("rw_342", "#342 genuine controlled validation PASS", interCars.createOrderCapability === "VALIDATED" ? "VALIDATED" : "UNVERIFIED"),
    item("rw_343", "#343 arming PASS", gateStatusToAccess(accessDash.armingState)),
    item("rw_344", "#344 first order PASS", gateStatusToAccess(accessDash.firstOrderState)),
    item("rw_345", "#345 controlled go-live PASS", gateStatusToAccess(accessDash.controlledGoLive)),
    item("rw_346", "#346 observation PASS", gateStatusToAccess(String(accessDash.observationState))),
    item("rw_payment", "Payment production validated", gateStatusToAccess(payment.liveStatus)),
    item("rw_carrier", "Carrier production validated", gateStatusToAccess(carrier.liveStatus)),
    item("rw_tracking", "Tracking production validated", gateStatusToAccess(tracking.liveStatus)),
    item("rw_returns", "Returns/refunds production validated", gateStatusToAccess(returns.liveStatus)),
    item("rw_ai", "AI production validated", gateStatusToAccess(ai.liveStatus)),
    item("rw_sales_closed", "SALES_ENABLED=0 until all mandatory PASS", isProductionFlagEnabled("SALES") ? "BLOCKED" : "CONFIGURED"),
  ];
}
