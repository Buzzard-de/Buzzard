import type { ExceptionCategory, ExceptionRecord, ExceptionSeverity, ExceptionStatus } from "./types";

const exceptions = new Map<string, ExceptionRecord>();
let exceptionCounter = 0;

function exceptionId(): string {
  exceptionCounter += 1;
  return `BZ-EX-${String(exceptionCounter).padStart(8, "0")}`;
}

const UNKNOWN_EXTERNAL_CATEGORIES: ExceptionCategory[] = [
  "PAYMENT_FAILURE",
  "SUPPLIER_FAILURE",
  "REFUND_FAILURE",
  "UNKNOWN_EXTERNAL_OUTCOME",
];

export function resetExceptionEngineForTests(): void {
  exceptions.clear();
  exceptionCounter = 0;
}

export function createException(input: {
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  entity: string;
  correlationId: string;
  rootCause: string;
  owner?: string;
}): ExceptionRecord {
  const retryPolicy = resolveRetryPolicy(input.category);
  const now = new Date().toISOString();
  const record: ExceptionRecord = {
    exceptionId: exceptionId(),
    severity: input.severity,
    category: input.category,
    entity: input.entity,
    correlationId: input.correlationId,
    rootCause: input.rootCause,
    status: retryPolicy === "HUMAN_REQUIRED" ? "WAITING_HUMAN" : "OPEN",
    createdAt: now,
    updatedAt: now,
    retryPolicy,
    owner: input.owner ?? "SYSTEM",
    audit: [`CREATED:${now}`],
  };
  exceptions.set(record.exceptionId, record);
  return record;
}

function resolveRetryPolicy(category: ExceptionCategory): ExceptionRecord["retryPolicy"] {
  if (category === "UNKNOWN_EXTERNAL_OUTCOME") return "HUMAN_REQUIRED";
  if (UNKNOWN_EXTERNAL_CATEGORIES.includes(category)) return "NO_AUTO_RETRY";
  if (category === "AI_FAILURE" || category === "DATA_FAILURE") return "RETRY_SAFE";
  return "NO_AUTO_RETRY";
}

export function transitionException(
  exceptionId: string,
  status: ExceptionStatus,
  note: string
): { ok: boolean; record?: ExceptionRecord; errorCode?: string } {
  const record = exceptions.get(exceptionId);
  if (!record) return { ok: false, errorCode: "EXCEPTION_NOT_FOUND" };
  record.status = status;
  record.updatedAt = new Date().toISOString();
  record.audit.push(`${status}:${record.updatedAt}:${note}`);
  return { ok: true, record };
}

export function listExceptions(filter?: { category?: ExceptionCategory; status?: ExceptionStatus }): ExceptionRecord[] {
  return [...exceptions.values()].filter((e) => {
    if (filter?.category && e.category !== filter.category) return false;
    if (filter?.status && e.status !== filter.status) return false;
    return true;
  });
}

export function shouldAutoRetry(record: ExceptionRecord): boolean {
  return record.retryPolicy === "RETRY_SAFE";
}
