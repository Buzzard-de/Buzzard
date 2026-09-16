import { validateProductionCredentials } from "@/lib/supplier-production-validation/credentialValidation";
import {
  classifyEndpoint,
  extractProfileAllowedHosts,
  validateEndpointUrl,
} from "@/lib/supplier-production-validation/endpointSecurity";
import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { isScopedValidationNetworkEnabled } from "@/lib/supplier-engine/network/scopedValidationNetwork";
import { evaluateOrderLimits } from "@/lib/supplier-order-activation/limits";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { getOrder } from "@/lib/order-engine";
import {
  CONTROLLED_VALIDATION_MAX_QTY,
  CONTROLLED_VALIDATION_MAX_VALUE,
  getCreateOrderEndpointPath,
  getInterCarsSupplierId,
} from "./config";
import { evaluateDeclaredCapability } from "./capability";
import { buildCanonicalPayloadFromOrder } from "./payload";
import { validateOrderProtections } from "./request";
import { checkIdempotency } from "./idempotency";
import { validateControlledValidationApproval } from "./approval";
import { evaluateUpstreamGates, assertAiBoundary } from "./eligibility";
import type { ControlledValidationRunInput, ValidationCheckResult } from "./types";

export function runControlledValidationPreflight(input: ControlledValidationRunInput): {
  checks: ValidationCheckResult[];
  blockers: string[];
  payloadHash?: string;
  orderValue?: number;
  totalQuantity?: number;
} {
  const checks: ValidationCheckResult[] = [];
  const blockers: string[] = [];
  const supplierId = input.supplier || getInterCarsSupplierId();

  const credential = validateProductionCredentials({ supplierId, environment: input.environment || "PRODUCTION" });
  checks.push({
    check: "CREDENTIALS",
    category: "CREDENTIAL",
    status: credential.status === "VALID" || credential.status === "CONFIGURED" ? "PASS" : "BLOCKED",
    message: credential.status,
  });
  blockers.push(...credential.blockerCodes);

  const { state: capState, blockers: capBlockers } = evaluateDeclaredCapability(supplierId);
  const createOrderEnabled =
    capState.declared ||
    process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED === "1" ||
    Boolean((resolvePredefinedLiveProfile()?.endpoints as Record<string, string> | undefined)?.createOrder);
  if (!createOrderEnabled) blockers.push("CREATE_ORDER_NOT_DECLARED");
  blockers.push(...capBlockers.filter((b) => b !== "CREATE_ORDER_NOT_DECLARED" || !createOrderEnabled));

  checks.push({
    check: "CREATE_ORDER_CAPABILITY",
    category: "CAPABILITY",
    status: createOrderEnabled ? "PASS" : "BLOCKED",
    message: createOrderEnabled ? "createOrder enabled" : "createOrder not declared",
  });

  const profile = resolvePredefinedLiveProfile();
  if (profile?.baseUrl) {
    const hosts = extractProfileAllowedHosts(profile.baseUrl, []);
    const path = getCreateOrderEndpointPath();
    const url = `${profile.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    const endpointCheck = validateEndpointUrl(url, hosts, true);
    checks.push({
      check: "ENDPOINT",
      category: "ENDPOINT",
      status: endpointCheck.allowed ? "PASS" : "BLOCKED",
      message: endpointCheck.reason || "Endpoint valid",
    });
    if (!endpointCheck.allowed) blockers.push("ENDPOINT_SECURITY_BLOCKED");
    if (classifyEndpoint(path) !== "ORDER_CREATE") blockers.push("ENDPOINT_CLASSIFICATION_MISMATCH");
  }

  blockers.push(...assertAiBoundary({
    requester: input.requester,
    approver: input.approver,
  }));

  const upstream = evaluateUpstreamGates({
    supplierId,
    market: input.allowedMarket || input.market || "DE",
    channel: input.channel || "DIRECT",
    environment: input.environment || "PRODUCTION",
    requester: input.requester,
    approver: input.approver,
  });
  blockers.push(...upstream.blockers);

  if (isActivationKillSwitched({
    supplierId,
    market: input.allowedMarket || input.market || "DE",
    channel: input.channel || "DIRECT",
  })) {
    blockers.push("KILL_SWITCH_ACTIVE");
  }

  if (!isScopedValidationNetworkEnabled()) {
    blockers.push("SCOPED_VALIDATION_NETWORK_DISABLED");
    checks.push({
      check: "NETWORK_VALIDATION",
      category: "NETWORK",
      status: "BLOCKED",
      message: "SUPPLIER_CONTROLLED_VALIDATION_NETWORK not enabled",
    });
  } else {
    checks.push({
      check: "NETWORK_VALIDATION",
      category: "NETWORK",
      status: "PASS",
      message: "Scoped validation network enabled",
    });
  }

  const approvalCheck = validateControlledValidationApproval({
    validationId: input.validationId || "",
    confirmationNonce: input.confirmationNonce,
    payloadHash: input.payloadHash,
    orderReference: input.orderReference,
  });
  checks.push({
    check: "HUMAN_APPROVAL",
    category: "APPROVAL",
    status: approvalCheck.valid ? "PASS" : "BLOCKED",
    message: approvalCheck.blockers.join(",") || "Approval valid",
  });
  blockers.push(...approvalCheck.blockers);

  let payloadHash = input.payloadHash;
  let orderValue = 0;
  let totalQuantity = 0;

  if (input.orderId) {
    const payloadResult = buildCanonicalPayloadFromOrder(input.orderId);
    checks.push(...payloadResult.checks);
    blockers.push(...payloadResult.blockers);
    payloadHash = payloadResult.payloadHash;

    if (payloadResult.payload) {
      const protections = validateOrderProtections(input.orderId, payloadResult.payload);
      checks.push(...protections.checks);
      blockers.push(...protections.blockers);

      const idem = checkIdempotency(payloadResult.payload);
      checks.push(...idem.checks);
      if (idem.isDuplicate && idem.existingSupplierOrderId) {
        blockers.push("DUPLICATE_IDEMPOTENCY");
      }

      totalQuantity = payloadResult.payload.lines.reduce((s, l) => s + l.quantity, 0);
      orderValue = payloadResult.payload.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

      if (input.allowedProduct) {
        const skuMatch = payloadResult.payload.lines.every((l) => l.supplierSku === input.allowedProduct);
        if (!skuMatch) blockers.push("PRODUCT_RESTRICTION_VIOLATION");
      }

      if (input.allowedMarket && input.allowedMarket !== (input.market || "DE")) {
        blockers.push("MARKET_RESTRICTION_VIOLATION");
      }

      if (approvalCheck.approval && payloadResult.payload.currency !== approvalCheck.approval.currency) {
        blockers.push("CURRENCY_MISMATCH");
      }
    }
  } else {
    blockers.push("ORDER_REFERENCE_MISSING");
  }

  const maxQty = Math.min(CONTROLLED_VALIDATION_MAX_QTY, approvalCheck.approval?.maximumQuantity ?? CONTROLLED_VALIDATION_MAX_QTY);
  const maxValue = Math.min(CONTROLLED_VALIDATION_MAX_VALUE, approvalCheck.approval?.maximumValue ?? CONTROLLED_VALIDATION_MAX_VALUE);

  if (totalQuantity > maxQty) blockers.push("FIRST_ORDER_QUANTITY_EXCEEDED");
  if (orderValue > maxValue) blockers.push("MAX_ORDER_VALUE_EXCEEDED");

  const activation = listActivationRecords()
    .filter(
      (a) =>
        a.supplierId === supplierId &&
        a.market === (input.allowedMarket || input.market || "DE") &&
        a.channel === (input.channel || "DIRECT") &&
        a.environment === (input.environment || "PRODUCTION"),
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (activation) {
    const limits = evaluateOrderLimits({
      activation,
      orderValue,
      isFirstOrder: true,
      totalQuantity,
      itemCount: getOrder(input.orderId || "")?.items.length ?? 1,
    });
    blockers.push(...limits.blockers);
  }

  checks.push({
    check: "FIRST_ORDER_LIMIT",
    category: "LIMITS",
    status: blockers.some((b) => b.includes("ORDER") && b.includes("EXCEEDED")) ? "BLOCKED" : "PASS",
    message: `maxQty=${maxQty} maxValue=${maxValue}`,
  });

  checks.push({
    check: "PAYLOAD_VALIDATION",
    category: "REQUEST",
    status: payloadHash ? "PASS" : "BLOCKED",
    message: payloadHash ? "Payload hash computed" : "Payload missing",
  });

  return { checks, blockers: [...new Set(blockers)], payloadHash, orderValue, totalQuantity };
}
