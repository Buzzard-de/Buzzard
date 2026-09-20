export type MemoryType =
  | "FACT"
  | "DECISION"
  | "PREFERENCE"
  | "POLICY"
  | "TASK_CONTEXT"
  | "INCIDENT"
  | "LEARNED_PATTERN";

export type MemoryScope =
  | "GLOBAL"
  | "MARKET"
  | "SUPPLIER"
  | "PRODUCT"
  | "CUSTOMER"
  | "ORDER"
  | "TASK"
  | "AI_WORKER";

export type MemorySensitivity = "PUBLIC" | "INTERNAL" | "FINANCIAL" | "SENSITIVE";

export type MemoryWritePolicy = "ALLOW" | "REVIEW_REQUIRED" | "DENY";

export type MemoryStatus = "ACTIVE" | "UNVERIFIED" | "EXPIRED" | "ARCHIVED";

export interface MemoryProvenance {
  sourceType: string;
  sourceId: string;
  createdBy: string;
  confidence: number;
  timestamp: string;
}

export interface CentralMemoryRecord {
  memoryId: string;
  type: MemoryType;
  scope: MemoryScope;
  scopeKey: string;
  source: MemoryProvenance;
  createdAt: string;
  updatedAt: string;
  confidence: number;
  provenance: MemoryProvenance;
  sensitivity: MemorySensitivity;
  expiresAt?: string;
  status: MemoryStatus;
  payloadSummary: string;
}
