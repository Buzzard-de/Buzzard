"use strict";

const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sourceOfTruthRegistry");
const { createSotConflictDetector } = require("./sotConflictDetector");
const { createSotAudit } = require("./sotAudit");
const { createSotVersionStore } = require("./sotVersions");
const { versionConflict } = require("./sotErrors");
const { newCorrelationId } = require("../operations/correlationContext");

function createPriceSot(options = {}) {
  const registry = options.registry || createSourceOfTruthRegistry({ env: options.env });
  const versions = options.versions || createSotVersionStore();
  const conflicts = options.conflicts || createSotConflictDetector();
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit });
  const pricing = options.pricing || null;

  function assertOwner(input) {
    return registry.assertWriteAuthority({
      entity: ENTITIES.PRICE,
      actor: input.actor,
      operation: input.operation || "price.write",
      correlationId: input.correlationId,
    });
  }

  function getPrice(input = {}) {
    const productId = input.productId || input.sku;
    if (pricing && typeof pricing.quotePrice === "function") {
      return {
        ...pricing.quotePrice(input),
        entity: ENTITIES.PRICE,
        entityId: productId,
        version: versions.getVersion(ENTITIES.PRICE, productId),
        source: ACTORS.PRICING_ENGINE,
      };
    }
    return {
      entity: ENTITIES.PRICE,
      entityId: productId,
      version: versions.getVersion(ENTITIES.PRICE, productId),
      source: ACTORS.PRICING_ENGINE,
    };
  }

  function calculatePrice(input = {}) {
    return getPrice(input);
  }

  function getPriceVersion(input = {}) {
    return versions.getVersion(ENTITIES.PRICE, input.productId || input.sku);
  }

  function setPrice(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    try {
      assertOwner({ ...input, operation: "setPrice", correlationId });
    } catch (error) {
      audit.record({ result: "rejected", entity: ENTITIES.PRICE, actor: input.actor, source: input.source, operation: "setPrice", reason: error.code, correlationId });
      throw error;
    }
    const entityId = input.productId || input.sku;
    const current = versions.getVersion(ENTITIES.PRICE, entityId);
    if (input.expectedVersion != null && Number(input.expectedVersion) !== current) {
      throw versionConflict({
        entity: ENTITIES.PRICE,
        entityId,
        expectedVersion: input.expectedVersion,
        actualVersion: current,
        correlationId,
      });
    }
    const conflict = conflicts.detectConflict({
      entity: ENTITIES.PRICE,
      sotVersion: current,
      incomingVersion: input.incomingVersion != null ? input.incomingVersion : current + 1,
      expectedVersion: input.expectedVersion,
      source: input.source || input.actor,
      correlationId,
    });
    if (conflict.type === "OWNERSHIP_CONFLICT") {
      audit.record({ result: "conflict", entity: ENTITIES.PRICE, entityId, actor: input.actor, source: input.source, operation: "setPrice", reason: "OWNERSHIP_CONFLICT", version: current, correlationId });
      const { writeAuthorityViolation } = require("./sotErrors");
      throw writeAuthorityViolation({
        entity: ENTITIES.PRICE,
        actor: input.actor || input.source,
        owner: ACTORS.PRICING_ENGINE,
        operation: "setPrice",
        correlationId,
      });
    }
    const version = versions.nextVersion(ENTITIES.PRICE, entityId);
    const quote = calculatePrice(input);
    audit.record({ result: "accepted", entity: ENTITIES.PRICE, entityId, actor: input.actor, source: input.source, operation: "setPrice", version, correlationId });
    return {
      entity: ENTITIES.PRICE,
      entityId,
      version,
      source: ACTORS.PRICING_ENGINE,
      updatedAt: new Date().toISOString(),
      correlationId,
      quote,
      persistedToListing: false,
    };
  }

  return Object.freeze({
    getPrice,
    calculatePrice,
    setPrice,
    getPriceVersion,
  });
}

module.exports = { createPriceSot };
