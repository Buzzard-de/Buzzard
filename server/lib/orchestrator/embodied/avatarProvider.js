const crypto = require("crypto");
const { getFlags } = require("../flags");
const { redactObject } = require("../securityGuard");
const cost = require("../costControl");
const { providerFetch } = require("../providers/httpClient");
const { assertAllowedUrl } = require("../providers/allowlist");
const { resolveAvatarCatalog } = require("./capabilityRegistry");
const { resolveFallback } = require("./fallback");

const sessions = new Map();
let lastLiveOk = false;

function apiKey() {
  return process.env.AVATAR_API_KEY || process.env.READY_PLAYER_ME_KEY || "";
}

function baseUrl() {
  return String(process.env.AVATAR_BASE_URL || "").replace(/\/$/, "");
}

function configured() {
  return Boolean(process.env.AVATAR_PROVIDER && apiKey());
}

function wired() {
  return Boolean(configured() && baseUrl());
}

function lastLiveSuccess() {
  return lastLiveOk;
}

function capabilities() {
  const catalog = resolveAvatarCatalog();
  if (!configured()) return { ...catalog, capabilities: [], health: "NOT_CONFIGURED" };
  return { ...catalog, health: lastLiveOk ? "READY" : wired() ? "DEGRADED" : "NOT_WIRED" };
}

function health() {
  const flags = getFlags();
  const catalog = capabilities();
  if (!flags.AVATAR_ENABLED && !flags.EMBODIED_AI_ENABLED && !flags.REALTIME_AVATAR_ENABLED) {
    return redactObject({
      ok: false,
      code: "AVATAR_DISABLED",
      configured: configured(),
      wired: wired(),
      live: false,
      status: "DISABLED",
      capabilities: [],
    });
  }
  if (!configured()) {
    return redactObject({
      ok: false,
      code: "AVATAR_PROVIDER_NOT_CONFIGURED",
      configured: false,
      wired: false,
      live: false,
      status: "NOT_CONFIGURED",
      capabilities: [],
    });
  }
  if (!wired()) {
    return redactObject({
      ok: false,
      code: "AVATAR_PROVIDER_NOT_WIRED",
      configured: true,
      wired: false,
      live: false,
      status: "NOT_WIRED",
      provider: process.env.AVATAR_PROVIDER,
      capabilities: catalog.capabilities,
    });
  }
  return redactObject({
    ok: lastLiveOk,
    code: lastLiveOk ? "OK" : "AVATAR_NOT_LIVE",
    configured: true,
    wired: true,
    live: lastLiveOk,
    status: lastLiveOk ? "READY" : "DEGRADED",
    provider: process.env.AVATAR_PROVIDER,
    capabilities: catalog.capabilities,
    fullBody: Boolean(catalog.bodyAnimation),
  });
}

function publicSession(row) {
  return redactObject({
    avatarSessionId: row.id,
    provider: row.provider,
    status: row.status,
    stream: row.stream,
    audioChannel: row.audioChannel,
    videoChannel: row.videoChannel,
    capabilities: row.capabilities,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    live: Boolean(row.live),
  });
}

async function authenticate({ fetchImpl } = {}) {
  if (!configured()) return { ok: false, code: "AVATAR_PROVIDER_NOT_CONFIGURED" };
  if (!wired()) return { ok: false, code: "AVATAR_PROVIDER_NOT_WIRED" };
  const url = `${baseUrl()}/health`;
  const allowed = assertAllowedUrl(url);
  if (!allowed.ok) return { ok: false, code: allowed.code };
  const result = await providerFetch(
    url,
    { headers: { Authorization: `Bearer ${apiKey()}` } },
    { fetchImpl, timeoutMs: 8000, attempts: 1 }
  );
  lastLiveOk = Boolean(result.ok);
  return result.ok
    ? { ok: true, authenticated: true, live: true }
    : { ok: false, code: result.code || "AVATAR_AUTH_FAILED", live: false };
}

function createSession(input = {}) {
  const h = health();
  const fallback = resolveFallback({
    liveAvatar: false,
    providerConfigured: configured(),
    providerWired: wired(),
    local3d: false,
  });
  if (!configured() || !wired()) {
    return { ...h, session: null, fakeLiveVideo: false, fallback };
  }
  return createRemoteSession(input, fallback);
}

async function createRemoteSession(input, fallback) {
  const auth = await authenticate({ fetchImpl: input.fetchImpl });
  if (!auth.ok) {
    return { ok: false, code: auth.code, session: null, live: false, fakeLiveVideo: false, fallback };
  }
  const createUrl = `${baseUrl()}/sessions`;
  const allowed = assertAllowedUrl(createUrl);
  if (!allowed.ok) return { ok: false, code: allowed.code, fakeLiveVideo: false, fallback };
  const created = await providerFetch(
    createUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: input.language || "de" }),
    },
    { fetchImpl: input.fetchImpl, timeoutMs: 8000, attempts: 1 }
  );
  lastLiveOk = Boolean(created.ok);
  if (!created.ok) {
    return { ok: false, code: created.code || "AVATAR_SESSION_FAILED", live: false, fakeLiveVideo: false, fallback };
  }
  const id = `avs_${crypto.randomBytes(6).toString("hex")}`;
  const row = {
    id,
    provider: process.env.AVATAR_PROVIDER,
    status: "CONNECTED",
    stream: "live",
    audioChannel: true,
    videoChannel: true,
    capabilities: capabilities().capabilities,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    live: true,
  };
  sessions.set(id, row);
  cost.recordUsage({ kind: "avatar", provider: row.provider, estimatedCost: 0.08, sessionId: id });
  return { ok: true, session: publicSession(row), live: true, fakeLiveVideo: false, fallback: { mode: "REAL_AVATAR", live: true } };
}

function createAvatarSession(input) {
  return createSession(input);
}

function requireSession(id) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  return { ok: true, row };
}

function startStream(id) {
  const found = requireSession(id);
  if (!found.ok) return { ok: false, code: health().code || found.code, live: false };
  found.row.status = "STREAMING";
  return { ok: Boolean(found.row.live), live: Boolean(found.row.live), status: found.row.status };
}

function stopStream(id) {
  const found = requireSession(id);
  if (!found.ok) return { ok: true, stopped: true, live: false };
  found.row.status = "STOPPED";
  found.row.stream = null;
  return { ok: true, stopped: true, live: false };
}

function patch(id, fields) {
  const found = requireSession(id);
  if (!found.ok) return { ok: false, code: health().code || found.code, live: false };
  Object.assign(found.row, fields);
  return { ok: Boolean(found.row.live), live: Boolean(found.row.live), session: publicSession(found.row) };
}

function setExpression(id, expression) {
  return patch(id, { expression });
}
function setGaze(id, gaze) {
  return patch(id, { gaze });
}
function setPose(id, pose) {
  return patch(id, { pose });
}
function setGesture(id, gesture) {
  return patch(id, { gesture });
}
function setAnimation(id, animation) {
  return patch(id, { animation });
}
function setCamera(id, camera) {
  return patch(id, { camera });
}
function setEnvironment(id, environment) {
  return patch(id, { environment });
}
function speak(id, payload) {
  return patch(id, { speaking: true, speech: payload });
}
function interrupt(id) {
  const found = sessions.get(id);
  if (found) {
    found.speaking = false;
    found.status = "INTERRUPTED";
  }
  return { ok: true, interrupted: true, live: Boolean(found?.live) };
}
function setIdleState(id, idle) {
  return patch(id, { idle });
}
function destroySession(id) {
  sessions.delete(id);
  return { ok: true, destroyed: true };
}

function estimateCost() {
  const est = configured() ? 0.08 : 0;
  if (est) cost.recordUsage({ kind: "avatar", provider: process.env.AVATAR_PROVIDER, estimatedCost: est });
  return { costEstimate: est, costActual: null };
}

module.exports = {
  health,
  capabilities,
  configured,
  wired,
  lastLiveSuccess,
  authenticate,
  createSession,
  createAvatarSession,
  startStream,
  stopStream,
  setExpression,
  setGaze,
  setPose,
  setGesture,
  setAnimation,
  setCamera,
  setEnvironment,
  speak,
  interrupt,
  setIdleState,
  destroySession,
  estimateCost,
};
