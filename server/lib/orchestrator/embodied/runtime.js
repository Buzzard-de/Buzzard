const crypto = require("crypto");
const { getFlags } = require("../flags");
const { detectPromptInjection, redactObject } = require("../securityGuard");
const { handleRequest } = require("../core");
const tts = require("../providers/tts");
const phone = require("../phoneSession");
const { EMBODIED_STATE } = require("./constants");
const { createCharacterState, applyCharacterPatch } = require("./characterState");
const { createOfficeWorld, cloneWorld, getObject, objectsInZone } = require("./worldGraph");
const { snapshot } = require("./worldState");
const { resolveFallback } = require("./fallback");
const viseme = require("./visemeEngine");
const { planBehavior, materializeStep } = require("./behaviorPlanner");
const { direct } = require("./behaviorDirector");
const { applyInterrupt, resumePaused } = require("./interruption");
const { emit } = require("./eventBus");
const { sanitizePresence, forbidPersistentCamera, sessionOnlyCameraPolicy } = require("./privacy");
const avatar = require("./avatarProvider");
const video = require("./videoSession");
const { nextIdle } = require("./microBehaviors");

const sessions = new Map();
const recentPlans = new Map();

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function createSession({ userId, language, debug } = {}) {
  const flags = getFlags();
  if (!flags.EMBODIED_AI_ENABLED) {
    return { ok: false, code: "EMBODIED_AI_DISABLED" };
  }
  const world = createOfficeWorld();
  const character = createCharacterState({ position: { ...world.spawn } });
  const id = newId("emb");
  const fallback = resolveFallback({
    liveAvatar: avatar.lastLiveSuccess(),
    providerConfigured: avatar.configured(),
    providerWired: avatar.wired(),
    local3d: false,
  });
  const session = {
    id,
    avatarId: "pusat-digital-human-v1",
    worldId: world.id,
    userId: userId || null,
    language: language || "de",
    state: EMBODIED_STATE.IDLE,
    character,
    world,
    presence: sanitizePresence({ present: true }),
    taskStack: [],
    currentTask: null,
    pausedTask: null,
    queued: [],
    provider: avatar.health(),
    renderer: fallback.mode,
    fallback,
    liveAvatar: Boolean(fallback.live),
    liveVideo: false,
    lips: viseme.silence(),
    debug: Boolean(debug) && process.env.NODE_ENV !== "production",
    createdAt: Date.now(),
  };
  sessions.set(id, session);
  emit("avatar.started", { sessionId: id, avatarId: session.avatarId, worldId: world.id, status: session.state });
  return { ok: true, session: publicSession(session) };
}

function activityLabel(state) {
  const map = {
    LISTENING: "Dinliyor",
    THINKING: "Düşünüyor",
    WORKING: "Çalışıyor",
    SPEAKING: "Konuşuyor",
    GETTING_DOCUMENT: "Arşivde",
    USING_COMPUTER: "Masada",
    USING_PHONE: "Aramada",
    HANDOFF: "Handoff",
    IDLE: "Hazır",
  };
  return map[state] || state;
}

function publicSession(session) {
  const world = snapshot(session.world, session.character, { activeTask: session.currentTask, camera: session.camera });
  const out = redactObject({
    id: session.id,
    avatarId: session.avatarId,
    worldId: session.worldId,
    state: session.state,
    activity: activityLabel(session.state),
    character: session.character,
    objects: world.objects,
    world,
    presence: session.presence,
    liveAvatar: Boolean(session.liveAvatar),
    liveVideo: false,
    renderer: session.renderer,
    fallback: session.fallback,
    provider: session.provider,
    currentTask: session.currentTask,
    cameraPolicy: sessionOnlyCameraPolicy(),
    userStatus: session.fallback?.userStatus || "Avatar service unavailable",
  });
  if (session.debug) {
    out.debug = {
      state: session.state,
      currentTask: session.currentTask,
      location: session.character.currentLocation,
      lastAction: session.character.lastAction,
    };
  }
  return out;
}

function getSession(id) {
  const session = sessions.get(id);
  return session ? publicSession(session) : null;
}

function getInternal(id) {
  return sessions.get(id) || null;
}

function setPresence(id, input) {
  const session = sessions.get(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  const blocked = forbidPersistentCamera(input);
  if (!blocked.ok) return blocked;
  session.presence = sanitizePresence(input);
  return { ok: true, presence: session.presence };
}

function worldSnapshot(id, camera) {
  const session = sessions.get(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  return {
    ok: true,
    camera: camera || "FRONT",
    objects: session.world.objects,
    zones: ["FRONT", "BACK", "LEFT", "RIGHT", "CENTER"].map((zone) => ({
      zone,
      objects: objectsInZone(session.world, zone).map((row) => row.id),
    })),
  };
}

async function handleTurn(id, input = {}) {
  const session = sessions.get(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  const flags = getFlags();
  const started = Date.now();
  const injection = detectPromptInjection(input.message || input.text || "");
  if (injection.detected) {
    session.state = EMBODIED_STATE.WAITING;
    emit("avatar.error", { sessionId: id, error: "PROMPT_INJECTION" });
    return { ok: false, code: "PROMPT_INJECTION", visual: false, session: publicSession(session) };
  }

  if (input.interrupt) {
    Object.assign(session, applyInterrupt(session, { kind: input.interruptKind || "USER_CURRENT_REQUEST", task: input.task }));
    session.lips = viseme.silence();
    session.character = applyCharacterPatch(session.character, { speaking: false, listening: true });
    avatar.interrupt(session.avatarSessionId);
    emit("avatar.interrupted", { sessionId: id, status: session.state });
  }

  session.state = EMBODIED_STATE.LISTENING;
  emit("avatar.listening", { sessionId: id, status: session.state });

  session.state = EMBODIED_STATE.THINKING;
  emit("avatar.thinking", { sessionId: id, status: session.state });

  const orch = await handleRequest({
    message: input.message,
    language: input.language || session.language,
    channel: input.channel || (input.audio ? "VOICE" : "TEXT"),
    userId: session.userId,
    conversationId: input.conversationId,
    sessionId: id,
  });

  const highRiskPending = orch.state === "WAITING_APPROVAL" || orch.approval?.required;
  const documentFound = Boolean(input.truth?.documentFound);
  const truth = {
    documentFound,
    callAuthorized: Boolean(input.truth?.callAuthorized && orch.ok && !highRiskPending),
    callProviderLive: Boolean(input.truth?.callProviderLive),
    engineResultOk: Boolean(orch.ok && !highRiskPending),
    notePersisted: Boolean(input.truth?.notePersisted),
    approvalPending: Boolean(highRiskPending),
  };

  if (highRiskPending) {
    session.state = EMBODIED_STATE.WAITING;
    emit("avatar.task_started", { sessionId: id, status: "WAITING_APPROVAL" });
    const direction = direct({
      state: session.state,
      sessionId: id,
      listening: true,
      risk: "HIGH",
      userVideoPriority: session.presence.cameraOn,
    });
    return {
      ok: true,
      orchestrator: orch,
      behavior: { plan: [{ action: "speak", text: "Onay bekliyorum." }], blockedVisual: true },
      direction,
      session: publicSession(session),
      latencyMs: Date.now() - started,
    };
  }

  if (input.resume) {
    Object.assign(session, resumePaused(session));
  }

  const recent = recentPlans.get(id) || [];
  const planned = flags.BEHAVIOR_PLANNER_ENABLED
    ? planBehavior({
        goal: input.goal || input.message,
        intent: orch.intent?.intent,
        characterState: session.character,
        truth,
        recentSequences: recent,
        urgency: input.urgency,
        hour: new Date().getHours(),
      })
    : { ok: true, plan: [{ action: "speak" }], signature: "speak" };

  recent.push(planned.signature);
  if (recent.length > 8) recent.shift();
  recentPlans.set(id, recent);

  const executed = [];
  for (const step of planned.plan) {
    const result = materializeStep(session.world, session.character, step, truth);
    executed.push(result);
    if (!result.ok) {
      session.state = EMBODIED_STATE.ERROR;
      emit("avatar.error", { sessionId: id, error: result.code, status: session.state });
      const failText =
        result.code === "DOCUMENT_NOT_FOUND"
          ? "Dosyayı burada bulamadım. İsterseniz dijital arşivden kontrol edebilirim."
          : result.code === "PHONE_PROVIDER_NOT_CONFIGURED"
            ? "Telefon sağlayıcısı yapılandırılmadı. Sahte çağrı başlatamam."
            : "Bu hareketi şu anda güvenli şekilde tamamlayamadım.";
      session.character = applyCharacterPatch(session.character, { lastAction: step.action, speaking: true });
      return {
        ok: true,
        orchestrator: orch,
        behavior: planned,
        executed,
        failed: result,
        reply: failText,
        fakeDocument: false,
        fakeCall: false,
        session: publicSession(session),
        latencyMs: Date.now() - started,
      };
    }
    if (result.nextPosition) {
      session.character = applyCharacterPatch(session.character, {
        position: result.nextPosition,
        lastAction: result.action,
        posture: result.action === "sit_down" ? "sitting" : session.character.posture,
      });
    }
    if (result.action === "sit_down") {
      session.character = applyCharacterPatch(session.character, { posture: "sitting", lastAction: "sit_down" });
    }
    if (result.action === "stand_up") {
      session.character = applyCharacterPatch(session.character, { posture: "standing", lastAction: "stand_up" });
    }
    if (result.action === "walk_to") emit("avatar.walking", { sessionId: id, actionId: result.action });
    if (result.action === "retrieve_document") emit("avatar.object_taken", { sessionId: id, actionId: result.action });
  }

  let ttsResult = { ok: false, code: "TTS_SKIPPED" };
  if (flags.VOICE_ENABLED && orch.reply) {
    ttsResult = await tts.synthesize({ text: orch.reply, language: session.language });
  }

  session.state = EMBODIED_STATE.SPEAKING;
  emit("avatar.speaking", { sessionId: id, status: session.state });
  const direction = direct({
    state: session.state,
    sessionId: id,
    speaking: true,
    ttsLive: Boolean(ttsResult.ok && tts.lastLiveSuccess && tts.lastLiveSuccess()),
    speechText: orch.reply,
    durationMs: ttsResult.durationMs,
    userVideoPriority: session.presence.cameraOn,
    walking: executed.some((row) => row.action === "walk_to"),
    cabinet: executed.some((row) => row.targetId === "cabinet" || row.action === "retrieve_document"),
  });
  session.lips = direction.lips;
  session.character = applyCharacterPatch(session.character, {
    speaking: true,
    lastAction: executed[executed.length - 1]?.action || "speak",
    nextAction: null,
    attentionTarget: direction.gaze,
  });
  session.state = EMBODIED_STATE.IDLE;
  emit("avatar.task_completed", { sessionId: id, status: session.state, latencyMs: Date.now() - started });

  return {
    ok: true,
    orchestrator: orch,
    behavior: planned,
    executed,
    direction,
    tts: ttsResult.ok ? { ok: true } : ttsResult,
    session: publicSession(session),
    latencyMs: Date.now() - started,
    liveAvatar: Boolean(session.liveAvatar),
    renderer: session.renderer,
  };
}

function idleTick(id) {
  const session = sessions.get(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  const micro = nextIdle({ sessionId: id, state: session.state, speaking: false, listening: false });
  return { ok: true, micro, session: publicSession(session) };
}

function handoff(id, extra = {}) {
  const session = sessions.get(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  session.state = EMBODIED_STATE.HANDOFF;
  session.character = applyCharacterPatch(session.character, { speaking: false, listening: true, availability: "handoff" });
  emit("avatar.handoff", { sessionId: id, status: session.state });
  const transferred = phone.handoff({
    conversationId: extra.conversationId,
    locale: session.language,
    reason: extra.reason || "embodied-handoff",
    channel: extra.channel || "VIDEO",
    extra,
  });
  return { ok: true, handoff: transferred, session: publicSession(session), voicePreserved: true };
}

function cloneSessionWorld(id) {
  const session = sessions.get(id);
  if (!session) return null;
  return cloneWorld(session.world);
}

function getObjectPublic(id, objectId) {
  const session = sessions.get(id);
  if (!session) return null;
  return getObject(session.world, objectId);
}

module.exports = {
  createSession,
  getSession,
  getInternal,
  handleTurn,
  setPresence,
  worldSnapshot,
  idleTick,
  handoff,
  cloneSessionWorld,
  getObjectPublic,
  publicSession,
};
