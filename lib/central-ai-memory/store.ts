import { randomUUID } from "crypto";
import type { CentralMemoryRecord, MemoryScope, MemoryType, MemorySensitivity } from "./types";
import { assertNoSecretInMemoryPayload, classifyMemoryWrite } from "./writePolicy";

const memories = new Map<string, CentralMemoryRecord>();

let memoryCounter = 0;

function memoryId(): string {
  memoryCounter += 1;
  return `BZ-MEM-${String(memoryCounter).padStart(8, "0")}`;
}

export function resetCentralMemoryStoreForTests(): void {
  memories.clear();
  memoryCounter = 0;
}

export function writeMemory(input: {
  type: MemoryType;
  scope: MemoryScope;
  scopeKey: string;
  sensitivity: MemorySensitivity;
  payloadSummary: string;
  confidence: number;
  sourceType: string;
  sourceId: string;
  createdBy: string;
  expiresAt?: string;
}): { ok: boolean; record?: CentralMemoryRecord; policy: string; errorCode?: string } {
  const policy = classifyMemoryWrite(input.sensitivity, input.payloadSummary);
  if (policy === "DENY") {
    return { ok: false, policy, errorCode: "MEMORY_WRITE_DENIED" };
  }
  try {
    assertNoSecretInMemoryPayload(input.payloadSummary);
  } catch {
    return { ok: false, policy: "DENY", errorCode: "MEMORY_WRITE_DENIED_SECRET" };
  }
  if (policy === "REVIEW_REQUIRED") {
    return { ok: false, policy, errorCode: "MEMORY_REVIEW_REQUIRED" };
  }
  const now = new Date().toISOString();
  const provenance = {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    createdBy: input.createdBy,
    confidence: input.confidence,
    timestamp: now,
  };
  const record: CentralMemoryRecord = {
    memoryId: memoryId(),
    type: input.type,
    scope: input.scope,
    scopeKey: input.scopeKey,
    source: provenance,
    createdAt: now,
    updatedAt: now,
    confidence: input.confidence,
    provenance,
    sensitivity: input.sensitivity,
    expiresAt: input.expiresAt,
    status: input.sourceType ? "ACTIVE" : "UNVERIFIED",
    payloadSummary: input.payloadSummary.slice(0, 500),
  };
  memories.set(record.memoryId, record);
  return { ok: true, record, policy };
}

export function listMemories(filter?: { scope?: MemoryScope; scopeKey?: string }): CentralMemoryRecord[] {
  const now = Date.now();
  for (const m of memories.values()) {
    if (m.expiresAt && Date.parse(m.expiresAt) < now && m.status === "ACTIVE") {
      m.status = "EXPIRED";
    }
  }
  return [...memories.values()].filter((m) => {
    if (filter?.scope && m.scope !== filter.scope) return false;
    if (filter?.scopeKey && m.scopeKey !== filter.scopeKey) return false;
    return true;
  });
}

export function getMemoryById(memoryId: string): CentralMemoryRecord | undefined {
  return memories.get(memoryId);
}

export function assertCustomerMemoryIsolation(customerA: string, customerB: string): boolean {
  const a = listMemories({ scope: "CUSTOMER", scopeKey: customerA });
  const b = listMemories({ scope: "CUSTOMER", scopeKey: customerB });
  return a.every((ma) => !b.some((mb) => mb.memoryId === ma.memoryId));
}
