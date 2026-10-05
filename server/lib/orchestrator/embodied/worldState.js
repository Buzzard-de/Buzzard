const { cloneWorld, getObject, objectsInZone } = require("./worldGraph");

function snapshot(world, character, extras = {}) {
  return {
    roomId: world.id,
    objects: world.objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      zone: obj.zone,
      position: { ...obj.position },
      rotation: obj.rotation,
      scale: obj.size,
      state: obj.state,
      interaction: obj.interactionMethods,
      permissions: obj.permissions,
      availability: obj.state === "missing" ? "unavailable" : "available",
    })),
    avatarPosition: { ...character.position },
    avatarRotation: character.orientation,
    activeTask: extras.activeTask || character.currentTask,
    camera: extras.camera || "FRONT",
    environmentState: extras.environmentState || "office",
  };
}

function objectAt(world, id) {
  return getObject(world, id);
}

function consistentAcrossCameras(world, id) {
  const obj = getObject(world, id);
  return obj ? { id, position: obj.position, cameras: ["FRONT", "BACK", "LEFT", "RIGHT"] } : null;
}

module.exports = {
  snapshot,
  objectAt,
  consistentAcrossCameras,
  cloneWorld,
  objectsInZone,
};
