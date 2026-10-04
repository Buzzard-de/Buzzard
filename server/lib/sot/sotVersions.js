"use strict";

function createSotVersionStore() {
  const versions = new Map();

  function key(entity, entityId) {
    return `${entity}:${entityId}`;
  }

  function getVersion(entity, entityId) {
    return versions.get(key(entity, entityId)) || 0;
  }

  function setVersion(entity, entityId, version) {
    versions.set(key(entity, entityId), Number(version));
    return Number(version);
  }

  function nextVersion(entity, entityId) {
    const next = getVersion(entity, entityId) + 1;
    versions.set(key(entity, entityId), next);
    return next;
  }

  return Object.freeze({ getVersion, setVersion, nextVersion });
}

module.exports = { createSotVersionStore };
