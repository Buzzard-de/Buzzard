import { randomBytes, randomUUID } from "crypto";
import { recordFirstOrderAudit } from "./audit";
import { EXECUTION_AUTH_TTL_MS } from "./config";
import { isFirstOrderKillSwitched } from "./killSwitch";
import { validateFirstProductionOrderApproval } from "./approval";
import {
  getExecutionAuthorization,
  getFirstProductionOrderRecord,
  saveExecutionAuthorization,
  saveFirstProductionOrderRecord,
} from "./persistence";
import { assertFirstOrderNetworkSafety } from "./safety";
import type { ExecutionAuthorization, FirstProductionOrderPayload } from "./types";

const usedAuthorizationIds = new Set<string>();

export function authorizeFirstProductionOrderExecution(input: {
  executionId: string;
  actorId: string;
  approvalId?: string;
}): { ok: boolean; authorization?: ExecutionAuthorization; blockers: string[] } {
  const blockers: string[] = [];

  try {
    assertFirstOrderNetworkSafety();
  } catch {
    blockers.push("NETWORK_MUST_REMAIN_DISABLED");
  }

  const record = getFirstProductionOrderRecord(input.executionId);
  if (!record) blockers.push("EXECUTION_NOT_FOUND");
  if (record && record.state !== "APPROVED") blockers.push("FIRST_ORDER_NOT_APPROVED");
  if (record && Date.parse(record.expiresAt) <= Date.now()) blockers.push("EXECUTION_EXPIRED");

  const approvalCheck = record
    ? validateFirstProductionOrderApproval({
        executionId: input.executionId,
        approvalId: input.approvalId,
        payload: record.payload,
      })
    : { valid: false, blockers: ["EXECUTION_NOT_FOUND"] as string[] };
  if (!approvalCheck.valid) blockers.push(...approvalCheck.blockers);

  if (record && isFirstOrderKillSwitched({
    supplierId: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
  })) {
    blockers.push("KILL_SWITCH_ACTIVE");
    recordFirstOrderAudit({
      type: "FIRST_ORDER_KILL_SWITCHED",
      executionId: record.executionId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      actor: input.actorId,
    });
  }

  if (blockers.length > 0) {
    return { ok: false, blockers: [...new Set(blockers)] };
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXECUTION_AUTH_TTL_MS).toISOString();
  const authorization: ExecutionAuthorization = {
    authorizationId: `fpoauth_${randomUUID().slice(0, 12)}`,
    executionId: record!.executionId,
    orderId: record!.orderId,
    supplier: record!.supplier,
    payloadHash: record!.payload.payloadHash,
    approvalId: approvalCheck.approval!.approvalId,
    armingId: record!.armingId,
    scope: record!.scope,
    limits: record!.limits,
    nonce: randomBytes(16).toString("hex"),
    status: "ACTIVE",
    createdAt,
    expiresAt,
  };

  saveExecutionAuthorization(authorization);
  record!.authorization = authorization;
  record!.state = "EXECUTION_AUTHORIZED";
  record!.updatedAt = createdAt;
  saveFirstProductionOrderRecord(record!);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_AUTHORIZED",
    executionId: record!.executionId,
    orderId: record!.orderId,
    supplierId: record!.supplier,
    correlationId: record!.correlationId,
    actor: input.actorId,
    detail: {
      authorizationId: authorization.authorizationId,
      payloadHash: authorization.payloadHash,
      expiresAt,
    },
  });

  return { ok: true, authorization, blockers: [] };
}

export function validateExecutionAuthorization(input: {
  authorizationId: string;
  executionId: string;
  payload: FirstProductionOrderPayload;
}): { valid: boolean; blockers: string[]; authorization?: ExecutionAuthorization } {
  const blockers: string[] = [];
  const auth = getExecutionAuthorization(input.authorizationId);

  if (!auth) {
    blockers.push("AUTHORIZATION_MISSING");
    return { valid: false, blockers };
  }
  if (auth.status === "USED") blockers.push("AUTHORIZATION_REPLAY");
  if (auth.status === "EXPIRED" || Date.parse(auth.expiresAt) <= Date.now()) blockers.push("AUTHORIZATION_EXPIRED");
  if (auth.executionId !== input.executionId) blockers.push("AUTHORIZATION_EXECUTION_MISMATCH");
  if (auth.payloadHash !== input.payload.payloadHash) blockers.push("PAYLOAD_HASH_CHANGED");
  if (auth.orderId !== input.payload.orderId) blockers.push("ORDER_ID_MISMATCH");
  if (usedAuthorizationIds.has(auth.authorizationId)) blockers.push("AUTHORIZATION_REPLAY");

  return { valid: blockers.length === 0, blockers, authorization: auth };
}

export function consumeExecutionAuthorization(authorizationId: string): void {
  const auth = getExecutionAuthorization(authorizationId);
  if (auth) {
    auth.status = "USED";
    auth.usedAt = new Date().toISOString();
    saveExecutionAuthorization(auth);
    usedAuthorizationIds.add(authorizationId);
  }
}

export function resetAuthorizationForTests(): void {
  usedAuthorizationIds.clear();
}
