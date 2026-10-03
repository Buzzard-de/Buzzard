#!/usr/bin/env node
"use strict";

const { createSourceOfTruthService } = require("../server/lib/sot/sourceOfTruthService");
const { ENTITIES, ACTORS } = require("../server/lib/sot/sourceOfTruthRegistry");

function fail(message) {
  console.error(`SOT_VERIFICATION: FAIL`);
  console.error(message);
  process.exit(1);
}

function main() {
  const env = {
    ...process.env,
    BUZZARD_PRODUCT_SOT_ACTIVE: process.env.BUZZARD_PRODUCT_SOT_ACTIVE || "0",
    BUZZARD_SALES_ENABLED: process.env.BUZZARD_SALES_ENABLED || "0",
  };
  const service = createSourceOfTruthService({ env, logAudit: () => {} });
  const listed = service.registry.list();
  if (listed.length !== 4) fail("expected 4 registered SoT entities");

  const expected = {
    [ENTITIES.PRODUCT]: ACTORS.PRODUCT_ENGINE,
    [ENTITIES.ORDER]: ACTORS.ORDER_ENGINE,
    [ENTITIES.AVAILABILITY]: ACTORS.AVAILABILITY_ENGINE,
    [ENTITIES.PRICE]: ACTORS.PRICING_ENGINE,
  };
  const owners = new Set();
  for (const [entity, owner] of Object.entries(expected)) {
    const rec = service.registry.getSoT(entity);
    if (rec.owner !== owner) fail(`${entity} owner ${rec.owner} != ${owner}`);
    if (owners.has(rec.owner)) fail(`duplicate owner ${rec.owner}`);
    owners.add(rec.owner);
    service.assertWrite({ entity, actor: owner, operation: "validate" });
    try {
      service.assertWrite({ entity, actor: ACTORS.PUSAT, operation: "validate" });
      fail("Pusat write was allowed");
    } catch (error) {
      if (error.code !== "SOT_WRITE_AUTHORITY_VIOLATION") fail(error.code);
    }
  }

  if (service.registry.productSotActive) fail("PRODUCT_SOT_ACTIVE must stay off for this validator");
  if (!service.registry.salesLocked) fail("SALES must stay locked for this validator");

  const conflict = service.detectConflict({
    entity: ENTITIES.PRICE,
    sotVersion: 20,
    incomingVersion: 21,
    expectedVersion: 18,
    source: ACTORS.PRICING_ENGINE,
  });
  if (conflict.type !== "VERSION_CONFLICT") fail(`expected VERSION_CONFLICT got ${conflict.type}`);

  if (typeof service.idempotency.execute !== "function") fail("idempotency adapter missing");
  if (typeof service.audit.record !== "function") fail("audit integration missing");
  if (typeof service.ensureCorrelationId !== "function") fail("correlation integration missing");

  const status = service.getStatus();
  if (status.product.status !== "LOCKED") fail("product write should be locked");
  if (status.order.status !== "LOCKED") fail("order external sales should be locked");

  console.log("SOT_VERIFICATION: PASS");
  console.log(`PRODUCT owner=${expected.PRODUCT} status=${status.product.status}`);
  console.log(`ORDER owner=${expected.ORDER} status=${status.order.status}`);
  console.log(`AVAILABILITY owner=${expected.AVAILABILITY} status=${status.availability.status}`);
  console.log(`PRICE owner=${expected.PRICE} status=${status.price.status}`);
  console.log("PRODUCT_SOT_ACTIVE=OFF");
  console.log("SALES=LOCKED");
}

main();
