"use strict";

const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sourceOfTruthRegistry");
const { writeBlocked, versionConflict } = require("./sotErrors");
const { createSotConflictDetector } = require("./sotConflictDetector");
const { createSotAudit } = require("./sotAudit");
const { createSotVersionStore } = require("./sotVersions");
const { newCorrelationId } = require("../operations/correlationContext");

function createProductSot(options = {}) {
  const registry = options.registry || createSourceOfTruthRegistry({ env: options.env });
  const versions = options.versions || createSotVersionStore();
  const conflicts = options.conflicts || createSotConflictDetector();
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit });
  const productService = options.productService || null;
  const existing = options.existingProductSot || null;
  const env = options.env || process.env;

  function correlation(id) {
    return id || newCorrelationId();
  }

  function isActive() {
    if (existing && typeof existing.isSotActive === "function") return existing.isSotActive();
    return env.BUZZARD_PRODUCT_SOT_ACTIVE === "1";
  }

  function assertProductWriteAuthority(input) {
    return registry.assertWriteAuthority({
      entity: ENTITIES.PRODUCT,
      actor: input.actor,
      operation: input.operation || "product.write",
      correlationId: input.correlationId,
    });
  }

  function getProduct(productId) {
    if (productService && typeof productService.getProduct === "function") {
      const row = productService.getProduct(productId);
      if (!row) return null;
      return {
        entity: ENTITIES.PRODUCT,
        entityId: row.id,
        version: versions.getVersion(ENTITIES.PRODUCT, row.id),
        source: ACTORS.PRODUCT_ENGINE,
        sku: row.sku,
        title: row.title,
        updatedAt: row.updated_at || row.updatedAt || null,
      };
    }
    return {
      entity: ENTITIES.PRODUCT,
      entityId: productId,
      version: versions.getVersion(ENTITIES.PRODUCT, productId),
      source: ACTORS.PRODUCT_ENGINE,
    };
  }

  function getProductVersion(productId) {
    return versions.getVersion(ENTITIES.PRODUCT, productId);
  }

  function createProduct(input = {}) {
    const correlationId = correlation(input.correlationId);
    try {
      assertProductWriteAuthority({ actor: input.actor, operation: "createProduct", correlationId });
    } catch (error) {
      audit.record({ result: "rejected", entity: ENTITIES.PRODUCT, actor: input.actor, source: input.source, operation: "createProduct", reason: error.code, correlationId });
      throw error;
    }
    if (!isActive()) {
      audit.record({ result: "rejected", entity: ENTITIES.PRODUCT, actor: input.actor, operation: "createProduct", reason: "PRODUCT_SOT_INACTIVE", correlationId });
      throw writeBlocked({ entity: ENTITIES.PRODUCT, reason: "PRODUCT_SOT_INACTIVE", correlationId });
    }
    const entityId = input.productId || input.id || "product_pending";
    const version = versions.nextVersion(ENTITIES.PRODUCT, entityId);
    audit.record({ result: "accepted", entity: ENTITIES.PRODUCT, entityId, actor: input.actor, source: input.source, operation: "createProduct", version, correlationId });
    return { entity: ENTITIES.PRODUCT, entityId, version, source: ACTORS.PRODUCT_ENGINE, updatedAt: new Date().toISOString(), correlationId };
  }

  function updateProduct(input = {}) {
    const correlationId = correlation(input.correlationId);
    try {
      assertProductWriteAuthority({ actor: input.actor, operation: "updateProduct", correlationId });
    } catch (error) {
      audit.record({ result: "rejected", entity: ENTITIES.PRODUCT, actor: input.actor, source: input.source, operation: "updateProduct", reason: error.code, correlationId });
      throw error;
    }
    if (!isActive()) {
      audit.record({ result: "rejected", entity: ENTITIES.PRODUCT, actor: input.actor, operation: "updateProduct", reason: "PRODUCT_SOT_INACTIVE", correlationId });
      throw writeBlocked({ entity: ENTITIES.PRODUCT, reason: "PRODUCT_SOT_INACTIVE", correlationId });
    }
    const entityId = input.productId;
    const current = versions.getVersion(ENTITIES.PRODUCT, entityId);
    if (input.expectedVersion != null && Number(input.expectedVersion) !== current) {
      audit.record({ result: "conflict", entity: ENTITIES.PRODUCT, entityId, actor: input.actor, operation: "updateProduct", reason: "SOT_VERSION_CONFLICT", version: current, expectedVersion: input.expectedVersion, correlationId });
      throw versionConflict({ entity: ENTITIES.PRODUCT, entityId, expectedVersion: input.expectedVersion, actualVersion: current, correlationId });
    }
    const incoming = input.incomingVersion != null ? input.incomingVersion : current + 1;
    const conflict = conflicts.detectConflict({
      entity: ENTITIES.PRODUCT,
      sotVersion: current,
      incomingVersion: incoming,
      expectedVersion: input.expectedVersion,
      source: input.source || input.actor,
      correlationId,
    });
    if (conflict.type !== "NO_CONFLICT") {
      audit.record({ result: "conflict", entity: ENTITIES.PRODUCT, entityId, actor: input.actor, source: input.source, operation: "updateProduct", reason: conflict.type, version: current, correlationId });
      const { sotError } = require("./sotErrors");
      throw sotError(conflict.type === "VERSION_CONFLICT" ? "SOT_VERSION_CONFLICT" : "SOT_CONFLICT_DETECTED", conflict.type, conflict, 409);
    }
    const version = versions.nextVersion(ENTITIES.PRODUCT, entityId);
    audit.record({ result: "accepted", entity: ENTITIES.PRODUCT, entityId, actor: input.actor, source: input.source, operation: "updateProduct", version, correlationId });
    return { entity: ENTITIES.PRODUCT, entityId, version, source: ACTORS.PRODUCT_ENGINE, updatedAt: new Date().toISOString(), correlationId };
  }

  return Object.freeze({
    getProduct,
    createProduct,
    updateProduct,
    getProductVersion,
    assertProductWriteAuthority,
    isActive,
  });
}

module.exports = { createProductSot };
