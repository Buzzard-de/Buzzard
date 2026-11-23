function actorFromSession(session) {
  const actorId = session?.email || session?.userId || session?.id;
  if (!actorId) return { ok: false, code: "ACTOR_REQUIRED" };
  return { ok: true, actorId: String(actorId), source: "session" };
}

function authorize(action, session) {
  const actor = actorFromSession(session);
  if (!actor.ok) return actor;
  return { ok: true, action, actorId: actor.actorId, source: "session" };
}

function authorizeCreate(session) {
  return authorize("create", session);
}

function authorizeUpdate(session) {
  return authorize("update", session);
}

function authorizeDelete(session) {
  return authorize("delete", session);
}

module.exports = { authorizeCreate, authorizeUpdate, authorizeDelete };
