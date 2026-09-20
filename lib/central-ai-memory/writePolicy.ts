import type { MemorySensitivity, MemoryWritePolicy } from "./types";

const SECRET_PATTERNS = [/api[_-]?key/i, /password/i, /secret/i, /token/i, /oauth/i, /credential/i];

export function classifyMemoryWrite(
  sensitivity: MemorySensitivity,
  payloadSummary: string
): MemoryWritePolicy {
  if (sensitivity === "SENSITIVE") return "REVIEW_REQUIRED";
  if (SECRET_PATTERNS.some((p) => p.test(payloadSummary))) return "DENY";
  if (sensitivity === "FINANCIAL") return "REVIEW_REQUIRED";
  return "ALLOW";
}

export function assertNoSecretInMemoryPayload(payloadSummary: string): void {
  if (SECRET_PATTERNS.some((p) => p.test(payloadSummary))) {
    throw new Error("MEMORY_WRITE_DENIED:SECRET_PATTERN");
  }
}
