import { randomUUID } from "node:crypto";
import { getPersona } from "./personas.js";
import { now, type RuntimeStore } from "./storage.js";
import type { VoiceSession } from "./types.js";

export class VoiceSessionManager {
  constructor(private readonly store: RuntimeStore) {}

  start(countryCode: string, locale?: string): VoiceSession {
    const persona = getPersona(countryCode);
    const session: VoiceSession = {
      sessionId: randomUUID(),
      correlationId: randomUUID(),
      countryCode: persona.countryCode,
      locale: locale ?? persona.locale,
      detectedLanguage: persona.language,
      personaId: persona.personaId,
      status: "ACTIVE",
      context: {},
      pendingTaskIds: [],
      createdAt: now(),
      updatedAt: now()
    };
    this.store.sessions.set(session.sessionId, session);
    this.store.states.set(session.sessionId, {
      sessionId: session.sessionId,
      version: 1,
      data: {},
      updatedAt: now()
    });
    return session;
  }

  patch(sessionId: string, patch: Partial<VoiceSession>): VoiceSession {
    const current = this.store.sessions.get(sessionId);
    if (!current) throw new Error("SESSION_NOT_FOUND");
    const updated = { ...current, ...patch, updatedAt: now() };
    this.store.sessions.set(sessionId, updated);
    return updated;
  }

  end(sessionId: string): void {
    this.patch(sessionId, { status: "ENDED" });
  }
}