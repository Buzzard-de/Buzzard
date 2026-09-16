import { createConnector } from "@/lib/supplier-engine/connectors/factory";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { withScopedValidationNetwork } from "@/lib/supplier-engine/network/scopedValidationNetwork";
import { B2bSandboxSupplierConnector } from "@/lib/supplier-engine/connectors/b2b-sandbox";
import type { CanonicalCreateOrderPayload } from "./payload";
import { parseInterCarsCreateOrderResponse, validateResponseContract } from "./response";
import { recordControlledValidationHttpCall } from "./safety";
import type { SupplierResponseClass, ValidationCheckResult } from "./types";

export interface ControlledHttpResult {
  httpCallsMade: number;
  responseClass?: SupplierResponseClass;
  supplierOrderId?: string;
  checks: ValidationCheckResult[];
  blockers: string[];
  unknownOutcome: boolean;
  humanReviewRequired: boolean;
  httpStatus?: number;
  latencyMs?: number;
}

export async function executeControlledCreateOrderHttp(input: {
  validationId: string;
  supplierId: string;
  payload: CanonicalCreateOrderPayload;
  correlationId: string;
  transport?: import("@/lib/supplier-engine/network/types").SupplierTransport;
}): Promise<ControlledHttpResult> {
  const checks: ValidationCheckResult[] = [];
  const blockers: string[] = [];
  let httpCallsMade = 0;

  const supplier = getSupplier(input.supplierId);
  if (!supplier) {
    blockers.push("SUPPLIER_NOT_FOUND");
    return { httpCallsMade, checks, blockers, unknownOutcome: false, humanReviewRequired: true };
  }

  const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "b2b-sandbox");
  if (!(connector instanceof B2bSandboxSupplierConnector)) {
    blockers.push("CONNECTOR_NOT_B2B");
    return { httpCallsMade, checks, blockers, unknownOutcome: false, humanReviewRequired: true };
  }

  if (input.transport) {
    connector.setTransport(input.transport);
  }

  const supplierRequest = {
    supplierId: input.payload.supplierId,
    orderId: input.payload.buzzardOrderId,
    lines: input.payload.lines,
    shippingAddress: input.payload.shippingAddress,
  };

  let result: ControlledHttpResult;

  try {
    result = await withScopedValidationNetwork(
      {
        runId: input.validationId,
        validationId: input.validationId,
        supplierId: input.supplierId,
      },
      async () => {
        httpCallsMade++;
        recordControlledValidationHttpCall();
        const op = await connector.executeControlledValidationCreateOrder(supplierRequest, {
          idempotencyKey: input.payload.idempotencyKey,
          correlationId: input.correlationId,
        });

        if (!op.ok) {
          const errorCode = op.errorCode || "UNKNOWN";
          if (errorCode === "TIMEOUT" || errorCode === "NETWORK_ERROR") {
            return {
              httpCallsMade,
              checks: [{
                check: "CONTROLLED_HTTP",
                category: "NETWORK",
                status: "BLOCKED" as const,
                message: errorCode,
              }],
              blockers: ["UNKNOWN_OUTCOME"],
              unknownOutcome: true,
              humanReviewRequired: true,
            };
          }

          const httpStatus = (op.data as { httpStatus?: number })?.httpStatus;
          const parsed = httpStatus
            ? parseInterCarsCreateOrderResponse(op.data, httpStatus)
            : {
                responseClass: "validation_error" as const,
                retryable: false,
                humanReviewRequired: true,
                message: errorCode,
              };

          checks.push(validateResponseContract(parsed));
          return {
            httpCallsMade,
            responseClass: parsed.responseClass,
            supplierOrderId: parsed.supplierOrderId,
            checks,
            blockers: [errorCode],
            unknownOutcome: parsed.responseClass === "unknown",
            humanReviewRequired: parsed.humanReviewRequired,
            httpStatus,
          };
        }

        const data = op.data as { supplierOrderId?: string; status?: string; httpStatus?: number };
        const parsed = parseInterCarsCreateOrderResponse(
          { orderId: data.supplierOrderId, status: data.status || "accepted" },
          data.httpStatus || 200,
        );
        checks.push(validateResponseContract(parsed));

        if (parsed.responseClass !== "accepted") {
          return {
            httpCallsMade,
            responseClass: parsed.responseClass,
            supplierOrderId: parsed.supplierOrderId,
            checks,
            blockers: ["RESPONSE_NOT_ACCEPTED"],
            unknownOutcome: parsed.responseClass === "unknown",
            humanReviewRequired: parsed.humanReviewRequired,
            httpStatus: data.httpStatus,
          };
        }

        return {
          httpCallsMade,
          responseClass: parsed.responseClass,
          supplierOrderId: parsed.supplierOrderId,
          checks,
          blockers: [],
          unknownOutcome: false,
          humanReviewRequired: false,
          httpStatus: data.httpStatus || 200,
        };
      },
    );
  } catch (e) {
    const code = (e as { code?: string }).code || "NETWORK_ERROR";
    blockers.push(code === "TIMEOUT" ? "UNKNOWN_OUTCOME" : "CONTROLLED_HTTP_FAILED");
    return {
      httpCallsMade,
      checks: [{
        check: "CONTROLLED_HTTP",
        category: "NETWORK",
        status: "BLOCKED",
        message: e instanceof Error ? e.message : code,
      }],
      blockers,
      unknownOutcome: true,
      humanReviewRequired: true,
    };
  }

  return result;
}
