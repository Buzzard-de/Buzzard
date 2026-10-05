const { ZONES } = require("./constants");

function objectDef(partial) {
  return {
    id: partial.id,
    type: partial.type,
    zone: partial.zone,
    position: partial.position,
    rotation: partial.rotation || 0,
    size: partial.size || { x: 0.6, y: 0.8, z: 0.6 },
    state: partial.state || "closed",
    capabilities: partial.capabilities || [],
    permissions: partial.permissions || ["look_at", "walk_to"],
    interactionMethods: partial.interactionMethods || [],
    walkable: false,
    blocking: partial.blocking !== false,
  };
}

function createOfficeWorld() {
  const objects = [
    objectDef({ id: "desk_main", type: "DESK", zone: ZONES.FRONT, position: { x: 5, y: 0, z: 1.2 }, size: { x: 2, y: 0.8, z: 1 }, capabilities: ["place", "work"] }),
    objectDef({ id: "chair_main", type: "CHAIR", zone: ZONES.FRONT, position: { x: 5, y: 0, z: 2.2 }, capabilities: ["sit"], permissions: ["sit_down", "stand_up", "walk_to"] }),
    objectDef({ id: "computer_main", type: "COMPUTER", zone: ZONES.FRONT, position: { x: 5, y: 0.8, z: 0.9 }, blocking: false, capabilities: ["type", "search"], permissions: ["click", "type", "scroll", "read"] }),
    objectDef({ id: "display_primary", type: "SCREEN", zone: ZONES.FRONT, position: { x: 5, y: 1.2, z: 0.7 }, blocking: false }),
    objectDef({ id: "notebook", type: "NOTEBOOK", zone: ZONES.FRONT, position: { x: 5.7, y: 0.8, z: 1.1 }, blocking: false, capabilities: ["write"], permissions: ["write", "inspect"] }),
    objectDef({ id: "pen", type: "PEN", zone: ZONES.FRONT, position: { x: 5.9, y: 0.8, z: 1.15 }, blocking: false, capabilities: ["take"], permissions: ["take", "put"] }),
    objectDef({ id: "phone_front", type: "PHONE", zone: ZONES.FRONT, position: { x: 4.2, y: 0.8, z: 1.1 }, blocking: false, capabilities: ["call"], permissions: ["call", "answer", "hang_up"] }),
    objectDef({ id: "camera_user", type: "CAMERA", zone: ZONES.FRONT, position: { x: 5, y: 1.6, z: 0.4 }, blocking: false }),
    objectDef({ id: "mic", type: "MIC", zone: ZONES.FRONT, position: { x: 4.7, y: 0.8, z: 1.0 }, blocking: false }),
    objectDef({ id: "cabinet", type: "CABINET", zone: ZONES.BACK, position: { x: 3.5, y: 0, z: 8.6 }, size: { x: 1.4, y: 1.8, z: 0.7 }, capabilities: ["open", "store"], permissions: ["open", "close", "retrieve_document", "store_document"] }),
    objectDef({ id: "bookshelf", type: "BOOKSHELF", zone: ZONES.BACK, position: { x: 6.5, y: 0, z: 8.6 }, size: { x: 1.6, y: 2, z: 0.5 } }),
    objectDef({ id: "archive", type: "ARCHIVE", zone: ZONES.BACK, position: { x: 5, y: 0, z: 8.8 }, size: { x: 1, y: 1.6, z: 0.5 } }),
    objectDef({ id: "files", type: "FILES", zone: ZONES.BACK, position: { x: 3.5, y: 1, z: 8.4 }, blocking: false, state: "stored" }),
    objectDef({ id: "screens_ops", type: "SCREEN", zone: ZONES.LEFT, position: { x: 0.6, y: 1.4, z: 5 }, size: { x: 0.2, y: 1.6, z: 3 } }),
    objectDef({ id: "world_map", type: "DECOR", zone: ZONES.LEFT, position: { x: 0.5, y: 1.6, z: 3 }, blocking: false }),
    objectDef({ id: "lounge", type: "CHAIR", zone: ZONES.LEFT, position: { x: 1.6, y: 0, z: 6.5 }, capabilities: ["sit"] }),
    objectDef({ id: "printer", type: "PRINTER", zone: ZONES.RIGHT, position: { x: 8.7, y: 0, z: 3.2 }, capabilities: ["print"], permissions: ["print", "walk_to"] }),
    objectDef({ id: "desk_secondary", type: "DESK", zone: ZONES.RIGHT, position: { x: 8.5, y: 0, z: 5.5 }, size: { x: 1.4, y: 0.8, z: 0.9 } }),
    objectDef({ id: "phone_right", type: "PHONE", zone: ZONES.RIGHT, position: { x: 8.4, y: 0.8, z: 5.3 }, blocking: false, capabilities: ["call"], permissions: ["call", "answer", "hang_up"] }),
    objectDef({ id: "scanner", type: "SCANNER", zone: ZONES.RIGHT, position: { x: 8.8, y: 0, z: 7.2 }, capabilities: ["scan"], permissions: ["scan"] }),
    objectDef({ id: "door", type: "DOOR", zone: ZONES.CENTER, position: { x: 5, y: 0, z: 9.6 }, size: { x: 1.2, y: 2.1, z: 0.2 }, blocking: false }),
  ];
  return {
    id: "pusat-office-v1",
    bounds: { minX: 0, minZ: 0, maxX: 10, maxZ: 10 },
    objects,
    spawn: { x: 5, y: 0, z: 3.2 },
  };
}

function cloneWorld(world) {
  return JSON.parse(JSON.stringify(world));
}

function getObject(world, id) {
  return world.objects.find((row) => row.id === id) || null;
}

function objectsInZone(world, zone) {
  return world.objects.filter((row) => row.zone === zone);
}

function footprintBlocked(world, x, z, ignoreId) {
  return world.objects.some((obj) => {
    if (!obj.blocking || obj.id === ignoreId) return false;
    const dx = Math.abs(x - obj.position.x);
    const dz = Math.abs(z - obj.position.z);
    return dx < (obj.size.x / 2 + 0.35) && dz < (obj.size.z / 2 + 0.35);
  });
}

function inBounds(world, x, z) {
  return x >= world.bounds.minX && x <= world.bounds.maxX && z >= world.bounds.minZ && z <= world.bounds.maxZ;
}

function setObjectState(world, id, state) {
  const obj = getObject(world, id);
  if (!obj) return { ok: false, code: "OBJECT_NOT_FOUND" };
  obj.state = state;
  return { ok: true, object: obj };
}

function moveObject(world, id, position) {
  const obj = getObject(world, id);
  if (!obj) return { ok: false, code: "OBJECT_NOT_FOUND" };
  obj.position = { ...obj.position, ...position };
  return { ok: true, object: obj };
}

module.exports = {
  createOfficeWorld,
  cloneWorld,
  getObject,
  objectsInZone,
  footprintBlocked,
  inBounds,
  setObjectState,
  moveObject,
};
