const { getObject, setObjectState, moveObject } = require("./worldGraph");
const { findPath, approachPoint } = require("./navigation");

const CANONICAL_ACTIONS = [
  "look_at",
  "walk_to",
  "turn_to",
  "sit_down",
  "stand_up",
  "open",
  "close",
  "take",
  "put",
  "pick_up",
  "drop",
  "inspect",
  "read",
  "write",
  "type",
  "click",
  "scroll",
  "print",
  "scan",
  "call",
  "answer",
  "hang_up",
  "open_drawer",
  "close_drawer",
  "open_cabinet",
  "close_cabinet",
  "retrieve_document",
  "store_document",
  "move_object",
  "point",
  "gesture",
  "nod",
  "shake_head",
  "wait",
  "think",
  "speak",
  "listen",
];

function walkTo(world, character, targetId) {
  const obj = getObject(world, targetId);
  if (!obj) return { ok: false, code: "OBJECT_NOT_FOUND", visual: false };
  const dest = approachPoint(obj);
  const path = findPath(world, character.position, dest);
  if (!path.ok) return path;
  return {
    ok: true,
    action: "walk_to",
    targetId,
    path: path.path,
    nextPosition: dest,
    visual: true,
  };
}

function requireWorldTruth(truth, key) {
  if (!truth || truth[key] !== true) {
    return { ok: false, code: "WORLD_TRUTH_MISSING", key, visual: false };
  }
  return { ok: true };
}

function retrieveDocument(world, truth) {
  const allowed = requireWorldTruth(truth, "documentFound");
  if (!allowed.ok) return { ...allowed, code: "DOCUMENT_NOT_FOUND" };
  const cabinet = getObject(world, "cabinet");
  if (!cabinet) return { ok: false, code: "OBJECT_NOT_FOUND" };
  setObjectState(world, "cabinet", "open");
  const files = getObject(world, "files");
  if (files) moveObject(world, "files", { x: 5, y: 0.8, z: 1.2 });
  setObjectState(world, "cabinet", "closed");
  return { ok: true, action: "retrieve_document", visual: true, truthBound: true };
}

function startCall(world, truth) {
  if (!truth || truth.callAuthorized !== true) {
    return { ok: false, code: "CALL_NOT_AUTHORIZED", visual: false };
  }
  if (!truth.callProviderLive) {
    return { ok: false, code: "PHONE_PROVIDER_NOT_CONFIGURED", visual: false };
  }
  return { ok: true, action: "call", targetId: "phone_front", visual: true, truthBound: true };
}

function writeNote(text, truth) {
  if (truth && truth.notePersisted) {
    return { ok: true, action: "write", kind: "PERSISTED_NOTE", visual: true, text: String(text || "").slice(0, 200) };
  }
  return { ok: true, action: "write", kind: "VISUAL_ACTION", visual: true, persisted: false };
}

function computerAction(name, truth) {
  if (!truth || truth.engineResultOk !== true) {
    return { ok: false, code: "ENGINE_TRUTH_MISSING", visual: false, action: name };
  }
  return { ok: true, action: name, visual: true, representationOnly: true };
}

module.exports = {
  CANONICAL_ACTIONS,
  walkTo,
  retrieveDocument,
  startCall,
  writeNote,
  computerAction,
};
