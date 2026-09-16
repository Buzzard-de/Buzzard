import { randomUUID, createHash } from "crypto";
import { getInterCarsSupplierId } from "./config";
import type { ControlledValidationApproval, ControlledValidationScope } from "./types";

const approvalStore = new Map<string, ControlledValidationApproval>();

export function buildConfirmationNonce(input: {
  validationId: string;
  orderReference: string;
  supplierId: string;
  payloadHash: string;
  expiresAt: string;
}): string {
  const raw = `${input.validationId}:${input.orderReference}:${input.supplierId}:${input.payloadHash}:${input.expiresAt}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function createControlledValidationApproval(input: {
  validationId: string;
  supplier?: string;
  scope: ControlledValidationScope;
  maximumQuantity: number;
  maximumValue: number;
  currency: string;
  allowedProduct: string;
  allowedMarket: string;
  expiresAt: string;
  approvedBy: string;
  orderReference: string;
  payloadHash: string;
}): ControlledValidationApproval {
  const supplier = input.supplier || getInterCarsSupplierId();
  const approvalTimestamp = new Date().toISOString();
  const confirmationNonce = buildConfirmationNonce({
    validationId: input.validationId,
    orderReference: input.orderReference,
    supplierId: supplier,
    payloadHash: input.payloadHash,
    expiresAt: input.expiresAt,
  });

  const approval: ControlledValidationApproval = {
    approvalId: `cva_${randomUUID().slice(0, 12)}`,
    validationId: input.validationId,
    supplier,
    scope: input.scope,
    maximumQuantity: input.maximumQuantity,
    maximumValue: input.maximumValue,
    currency: input.currency,
    allowedProduct: input.allowedProduct,
    allowedMarket: input.allowedMarket,
    expiresAt: input.expiresAt,
    approvedBy: input.approvedBy,
    approvalTimestamp,
    orderReference: input.orderReference,
    payloadHash: input.payloadHash,
    confirmationNonce,
    status: "APPROVED",
  };

  approvalStore.set(input.validationId, approval);
  return approval;
}

export function getControlledValidationApproval(validationId: string): ControlledValidationApproval | undefined {
  return approvalStore.get(validationId);
}

export function validateControlledValidationApproval(input: {
  validationId: string;
  confirmationNonce?: string;
  payloadHash?: string;
  orderReference?: string;
}): { valid: boolean; blockers: string[]; approval?: ControlledValidationApproval } {
  const blockers: string[] = [];
  const approval = approvalStore.get(input.validationId);
  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") {
    blockers.push("APPROVAL_NOT_APPROVED");
  }
  if (Date.parse(approval.expiresAt) <= Date.now()) {
    blockers.push("APPROVAL_EXPIRED");
  }
  if (input.confirmationNonce && input.confirmationNonce !== approval.confirmationNonce) {
    blockers.push("CONFIRMATION_NONCE_MISMATCH");
  }
  if (input.payloadHash && input.payloadHash !== approval.payloadHash) {
    blockers.push("PAYLOAD_HASH_MISMATCH");
  }
  if (input.orderReference && input.orderReference !== approval.orderReference) {
    blockers.push("ORDER_REFERENCE_MISMATCH");
  }
  return { valid: blockers.length === 0, blockers, approval };
}

export function revokeControlledValidationApproval(validationId: string): void {
  const approval = approvalStore.get(validationId);
  if (approval) approval.status = "REVOKED";
}

export function resetControlledValidationApprovalsForTests(): void {
  approvalStore.clear();
}
