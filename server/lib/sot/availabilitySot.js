"use strict";

const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sourceOfTruthRegistry");
const { createSotConflictDetector } = require("./sotConflictDetector");
const { createSotAudit } = require("./sotAudit");
const { createSotVersionStore } = require("./sotVersions");
const { sotError, versionConflict } = require("./sotErrors");
const { newCorrelationId } = require("../operations/correlationContext");

function createAvailabilitySot(options = {}) {
  const registry = options.registry || createSourceOfTruthRegistry({ env: options.env });
  const versions = options.versions || createSotVersionStore();
  const conflicts = options.conflicts || createSotConflictDetector();
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit });
  const inventory = options.inventory || null;

  function assertOwner(input) {
    return registry.assertWriteAuthority({
      entity: ENTITIES.AVAILABILITY,
      actor: input.actor,
      operation: input.operation || "availability.write",
      correlationId: input.correlationId,
    });
  }

  function getAvailability(productId) {
    if (inventory && typeof inventory.getInventory === "function") {
      const row = inventory.getInventory(productId);
      return {
        ...row,
        entity: ENTITIES.AVAILABILITY,
        entityId: productId,
        version: versions.getVersion(ENTITIES.AVAILABILITY, productId),
        source: ACTORS.AVAILABILITY_ENGINE,
      };
    }
    return {
      entity: ENTITIES.AVAILABILITY,
      entityId: productId,
      version: versions.getVersion(ENTITIES.AVAILABILITY, productId),
      source: ACTORS.AVAILABILITY_ENGINE,
    };
  }

  function getAvailabilityVersion(productId) {
    return versions.getVersion(ENTITIES.AVAILABILITY, productId);
  }

  function updateAvailability(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    if (input.actor !== ACTORS.AVAILABILITY_ENGINE) {
      try {
        assertOwner(input);
      } catch (error) {
        audit.record({ result: "rejected", entity: ENTITIES.AVAILABILITY, actor: input.actor, source: input.source, operation: "updateAvailability", reason: error.code, correlationId });
        throw error;
      }
    } else {
      assertOwner(input);
    }
    const current = versions.getVersion(ENTITIES.AVAILABILITY, input.productId);
    const incoming = input.incomingVersion != null ? Number(input.incomingVersion) : current + 1;
    const conflict = conflicts.detectConflict({
      entity: ENTITIES.AVAILABILITY,
      sotVersion: current,
      incomingVersion: incoming,
      expectedVersion: input.expectedVersion,
      source: input.source || input.actor,
      correlationId,
    });
    if (conflict.type === "STALE_WRITE") {
      audit.record({ result: "conflict", entity: ENTITIES.AVAILABILITY, entityId: input.productId, actor: input.actor, source: input.source, operation: "updateAvailability", reason: "STALE_WRITE", version: current, correlationId });
      throw sotError("SOT_STALE_WRITE", "Stale supplier availability update rejected", conflict, 409);
    }
    if (input.expectedVersion != null && Number(input.expectedVersion) !== current) {
      throw versionConflict({
        entity: ENTITIES.AVAILABILITY,
        entityId: input.productId,
        expectedVersion: input.expectedVersion,
        actualVersion: current,
        correlationId,
      });
    }
    const version = versions.nextVersion(ENTITIES.AVAILABILITY, input.productId);
    audit.record({ result: "accepted", entity: ENTITIES.AVAILABILITY, entityId: input.productId, actor: input.actor, source: input.source, operation: "updateAvailability", version, correlationId });
    return {
      entity: ENTITIES.AVAILABILITY,
      entityId: input.productId,
      version,
      source: ACTORS.AVAILABILITY_ENGINE,
      updatedAt: new Date().toISOString(),
      correlationId,
    };
  }

  function reserveAvailability(input = {}) {
    return updateAvailability({ ...input, actor: input.actor || ACTORS.AVAILABILITY_ENGINE, operation: "reserveAvailability" });
  }

  function releaseAvailability(input = {}) {
    return updateAvailability({ ...input, actor: input.actor || ACTORS.AVAILABILITY_ENGINE, operation: "releaseAvailability" });
  }

  return Object.freeze({
    getAvailability,
    updateAvailability,
    reserveAvailability,
    releaseAvailability,
    getAvailabilityVersion,
  });
}

module.exports = { createAvailabilitySot };
