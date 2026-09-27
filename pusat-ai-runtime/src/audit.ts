import { randomUUID } from "node:crypto";
import { now, type RuntimeStore } from "./storage.js";

export class AuditService {
  constructor(private readonly store: RuntimeStore) {}

  write(event: Omit<import("./types.js").AuditEvent, "eventId" | "timestamp">): void {
    this.store.audit.push({
      ...event,
      eventId: randomUUID(),
      timestamp: now()
    });
  }
}