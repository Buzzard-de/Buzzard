import { randomUUID } from "node:crypto";
import { AuditService } from "./audit.js";
import { now, type RuntimeStore } from "./storage.js";
import type { ApprovalRequest, ExceptionRecord } from "./types.js";

export class ExceptionService {
  constructor(private readonly store: RuntimeStore, private readonly audit: AuditService) {}

  create(input: Omit<ExceptionRecord, "exceptionId" | "createdAt" | "status">): ExceptionRecord {
    const record: ExceptionRecord = {
      ...input,
      exceptionId: randomUUID(),
      createdAt: now(),
      status: "OPEN"
    };
    this.store.exceptions.set(record.exceptionId, record);
    this.audit.write({
      correlationId: record.correlationId,
      sessionId: record.sessionId,
      actor: "exception-service",
      action: "CREATE_EXCEPTION",
      outcome: "OPEN",
      metadata: { exceptionId: record.exceptionId, reason: record.reason }
    });
    return record;
  }

  approval(input: Omit<ApprovalRequest, "approvalId" | "createdAt" | "status">): ApprovalRequest {
    const approval: ApprovalRequest = {
      ...input,
      approvalId: randomUUID(),
      createdAt: now(),
      status: "PENDING"
    };
    this.audit.write({
      correlationId: approval.correlationId,
      sessionId: approval.sessionId,
      actor: "exception-service",
      action: "CREATE_APPROVAL",
      outcome: "PENDING",
      metadata: { approvalId: approval.approvalId, reason: approval.reason }
    });
    return approval;
  }
}