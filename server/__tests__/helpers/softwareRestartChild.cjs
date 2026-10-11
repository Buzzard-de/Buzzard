#!/usr/bin/env node
/**
 * Isolated process helper: write or read a software shipment via BUZZARD_DB_PATH.
 */
const action = process.argv[2];
const trackingNumber = process.argv[3];
const customerId = process.argv[4] || "cust-restart";
const orderId = process.argv[5] || "ord-restart";

const { db } = require("../../lib/db");
const software = require("../../lib/software");
software.initialize(db);

if (action === "write") {
  const created = software.tracking.createShipment(db, {
    orderId,
    customerId,
    trackingNumber,
    carrier: "DHL",
    events: [{ status: "IN_TRANSIT", description: "accepted" }],
  });
  process.stdout.write(
    JSON.stringify({
      ok: created.ok,
      id: created.shipment?.id,
      trackingNumber: created.shipment?.trackingNumber,
      pid: process.pid,
    })
  );
  process.exit(0);
}

if (action === "read") {
  const loaded = software.tracking.getForCustomer(db, { trackingNumber, customerId });
  process.stdout.write(
    JSON.stringify({
      ok: loaded.ok,
      id: loaded.shipment?.id,
      status: loaded.shipment?.status,
      pid: process.pid,
    })
  );
  process.exit(0);
}

process.stderr.write("usage: write|read\n");
process.exit(2);
