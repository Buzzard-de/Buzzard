import type { EngineValidationInput, DeterministicValidationResult, StructuredWorkerOutput } from "./types";
import type { WorkerId } from "./types";

export function runDeterministicValidation(input: EngineValidationInput): DeterministicValidationResult {
  const errors: string[] = [];
  const rec = input.output.recommendation as Record<string, unknown> | undefined;

  switch (input.workerId) {
    case "PRICING_AI": {
      const price = rec?.recommendedPrice as number | undefined;
      if (price !== undefined && price <= 0) errors.push("PRICING_ENGINE:PRICE_MUST_BE_POSITIVE");
      if (rec?.setAuthoritativePrice === true) errors.push("PRICING_ENGINE:CANNOT_SET_AUTHORITATIVE_PRICE");
      break;
    }
    case "SUPPLIER_AI": {
      if (rec?.inventSupplierStock === true) errors.push("SUPPLIER_ENGINE:CANNOT_INVENT_STOCK");
      if (rec?.inventSupplierPrice === true) errors.push("SUPPLIER_ENGINE:CANNOT_INVENT_PRICE");
      if (rec?.createSupplierPayment === true) errors.push("SUPPLIER_ENGINE:CANNOT_CREATE_PAYMENT");
      break;
    }
    case "INVENTORY_AI": {
      if (rec?.createReservation === true) errors.push("INVENTORY_ENGINE:CANNOT_CREATE_RESERVATION");
      if (rec?.overrideStock === true) errors.push("INVENTORY_ENGINE:CANNOT_OVERRIDE_STOCK");
      break;
    }
    case "ORDER_AI": {
      if (rec?.modifyOrderDirectly === true) errors.push("ORDER_ENGINE:MUST_USE_VALID_TRANSITIONS");
      if (rec?.modifyPaymentState === true) errors.push("ORDER_ENGINE:CANNOT_MODIFY_PAYMENT");
      break;
    }
    case "RETURNS_AI": {
      if (rec?.inventSupplierRecovery === true) errors.push("RETURNS_ENGINE:CANNOT_INVENT_RECOVERY");
      if (rec?.modifyReturnDirectly === true) errors.push("RETURNS_ENGINE:MUST_USE_RETURNS_ENGINE");
      break;
    }
    case "FINANCE_AI": {
      if (rec?.overwriteHistorical === true) errors.push("FINANCE:CANNOT_OVERWRITE_HISTORICAL_MARGIN");
      if (rec?.overwriteReturnImpact === true) errors.push("FINANCE:CANNOT_OVERWRITE_RETURN_IMPACT");
      break;
    }
    case "MARKETPLACE_AI": {
      if (rec?.bypassMarketplaceEngine === true) errors.push("MARKETPLACE_ENGINE:CANNOT_BYPASS");
      break;
    }
    case "CUSTOMS_AI": {
      if (rec?.autonomousDeclaration === true) errors.push("CUSTOMS:CANNOT_AUTONOMOUSLY_DECLARE");
      break;
    }
    case "PRODUCT_AI": {
      if (rec?.overwriteCanonicalProduct === true) errors.push("PRODUCT_ENGINE:CANNOT_OVERWRITE_CANONICAL");
      break;
    }
    case "CUSTOMER_SERVICE_AI":
      break;
  }

  if (errors.length > 0) {
    return {
      validationStatus: "FAILED",
      validationErrors: errors,
      finalDecision: errors.some((e) => e.includes("HISTORICAL") || e.includes("OVERWRITE")) ? "ESCALATE" : "REJECT",
      validatedBy: `${input.workerId}_engine_adapter`,
      validatedAt: new Date().toISOString(),
    };
  }

  if (input.output.requiredApproval || input.output.action?.requiresApproval) {
    return {
      validationStatus: "PASSED",
      validationErrors: [],
      finalDecision: "APPROVAL",
      validatedBy: `${input.workerId}_engine_adapter`,
      validatedAt: new Date().toISOString(),
    };
  }

  return {
    validationStatus: input.output.deterministicValidationRequired ? "PASSED" : "NOT_REQUIRED",
    validationErrors: [],
    finalDecision: "ALLOW",
    validatedBy: `${input.workerId}_engine_adapter`,
    validatedAt: new Date().toISOString(),
  };
}

export function validateEngineAdapter(workerId: WorkerId, output: StructuredWorkerOutput, context: EngineValidationInput["context"]) {
  return runDeterministicValidation({ workerId, taskType: "PRODUCT_ANALYSIS", output, context });
}
