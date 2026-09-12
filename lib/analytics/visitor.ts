import { getVisitor, upsertVisitor, isVisitorDeleted } from "./registry";
import type { VisitorRecord } from "./types";

export function generateAnonymousVisitorId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `bv_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function touchVisitor(anonymousVisitorId: string, timestamp: string): VisitorRecord {
  if (isVisitorDeleted(anonymousVisitorId)) {
    throw new Error("VISITOR_DELETED");
  }

  const existing = getVisitor(anonymousVisitorId);
  if (existing) {
    const updated: VisitorRecord = {
      ...existing,
      lastSeenAt: timestamp,
      isReturning: existing.sessionCount > 0,
    };
    upsertVisitor(updated);
    return updated;
  }

  const created: VisitorRecord = {
    anonymousVisitorId,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    sessionCount: 0,
    isReturning: false,
  };
  upsertVisitor(created);
  return created;
}

export function incrementVisitorSession(anonymousVisitorId: string): void {
  const visitor = getVisitor(anonymousVisitorId);
  if (!visitor) return;
  upsertVisitor({
    ...visitor,
    sessionCount: visitor.sessionCount + 1,
    isReturning: visitor.sessionCount > 0,
  });
}
