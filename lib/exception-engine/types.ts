export type ExceptionCategory =
  | "PAYMENT_FAILURE"
  | "SUPPLIER_FAILURE"
  | "STOCK_FAILURE"
  | "PRICE_FAILURE"
  | "MARKETPLACE_FAILURE"
  | "CARRIER_FAILURE"
  | "CUSTOMS_FAILURE"
  | "RETURN_FAILURE"
  | "REFUND_FAILURE"
  | "AI_FAILURE"
  | "SECURITY_FAILURE"
  | "DATA_FAILURE"
  | "UNKNOWN_EXTERNAL_OUTCOME";

export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ExceptionStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "WAITING_EXTERNAL"
  | "WAITING_HUMAN"
  | "RESOLVED"
  | "CLOSED"
  | "ESCALATED";

export interface ExceptionRecord {
  exceptionId: string;
  severity: ExceptionSeverity;
  category: ExceptionCategory;
  entity: string;
  correlationId: string;
  rootCause: string;
  status: ExceptionStatus;
  createdAt: string;
  updatedAt: string;
  retryPolicy: "NO_AUTO_RETRY" | "RETRY_SAFE" | "HUMAN_REQUIRED";
  owner: string;
  resolution?: string;
  audit: string[];
}
