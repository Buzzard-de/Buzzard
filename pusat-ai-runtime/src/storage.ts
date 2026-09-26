import type { AuditEvent, ExceptionRecord, SharedState, VoiceSession } from "./types.js";

export interface RuntimeStore {
  sessions: Map<string, VoiceSession>;
  states: Map<string, SharedState>;
  idempotency: Map<string, unknown>;
  exceptions: Map<string, ExceptionRecord>;
  audit: AuditEvent[];
}

export function createRuntimeStore(): RuntimeStore {
  return {
    sessions: new Map(),
    states: new Map(),
    idempotency: new Map(),
    exceptions: new Map(),
    audit: []
  };
}

export function now(): string {
  return new Date().toISOString();
}