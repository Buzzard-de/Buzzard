const listeners = new Map();
const history = [];

function emit(type, payload = {}) {
  const event = {
    type,
    at: Date.now(),
    sessionId: payload.sessionId || null,
    conversationId: payload.conversationId || null,
    avatarId: payload.avatarId || null,
    worldId: payload.worldId || null,
    actionId: payload.actionId || null,
    taskId: payload.taskId || null,
    animationId: payload.animationId || null,
    provider: payload.provider || null,
    latencyMs: payload.latencyMs || null,
    status: payload.status || null,
    error: payload.error || null,
  };
  history.push(event);
  if (history.length > 500) history.shift();
  for (const fn of listeners.get(type) || []) fn(event);
  for (const fn of listeners.get("*") || []) fn(event);
  return event;
}

function on(type, fn) {
  const list = listeners.get(type) || [];
  list.push(fn);
  listeners.set(type, list);
  return () => listeners.set(type, (listeners.get(type) || []).filter((row) => row !== fn));
}

function recent(limit = 20) {
  return history.slice(-limit);
}

function reset() {
  history.length = 0;
  listeners.clear();
}

module.exports = { emit, on, recent, reset };
