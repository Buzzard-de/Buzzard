/**
 * Delivery evidence is not interchangeable. Delivered ≠ signed ≠ verified location.
 */

const { EVIDENCE_KIND } = require("./secureCommerceConstants");
const { newId, writeAudit } = require("./secureIds");

function record(db, input = {}) {
  const kind = input.kind || EVIDENCE_KIND.NONE;
  if (!Object.values(EVIDENCE_KIND).includes(kind)) {
    return { ok: false, reason: "EVIDENCE_KIND_INVALID" };
  }
  if (input.invented === true) {
    return { ok: false, reason: "INVENTED_EVIDENCE_REJECTED" };
  }
  try {
    const id = newId("sevid");
    db.prepare(
      `INSERT INTO software_delivery_evidence(
        id, shipment_id, order_id, kind, verified, carrier_event_id, details_json
      ) VALUES(?,?,?,?,?,?,?)`
    ).run(
      id,
      input.shipmentId || null,
      input.orderId || null,
      kind,
      kind === EVIDENCE_KIND.SIGNATURE && input.verified === true ? 1 : 0,
      input.carrierEventId || null,
      JSON.stringify({
        deliveredStatusOnly: kind === EVIDENCE_KIND.DELIVERED_STATUS,
        signatureClaimed: kind === EVIDENCE_KIND.SIGNATURE,
        photoClaimed: kind === EVIDENCE_KIND.PHOTO,
        recipientInvented: false,
      })
    );
    writeAudit(db, "evidence.record", input.orderId || input.shipmentId, { kind });
    return {
      ok: true,
      id,
      kind,
      deliveredIsNotSignature: kind !== EVIDENCE_KIND.SIGNATURE,
      verified: kind === EVIDENCE_KIND.SIGNATURE && input.verified === true,
    };
  } catch (error) {
    if (String(error.message || "").includes("UNIQUE")) {
      return { ok: true, duplicate: true, kind };
    }
    return { ok: false, reason: "EVIDENCE_WRITE_FAILED" };
  }
}

function listForShipment(db, shipmentId) {
  return db.prepare("SELECT * FROM software_delivery_evidence WHERE shipment_id = ?").all(shipmentId).map((row) => ({
    id: row.id,
    kind: row.kind,
    verified: row.verified === 1,
    carrierEventId: row.carrier_event_id,
  }));
}

function interpret(statuses) {
  const kinds = new Set((statuses || []).map((s) => s.kind));
  return {
    carrierSaysDelivered: kinds.has(EVIDENCE_KIND.DELIVERED_STATUS),
    signatureEvidence: kinds.has(EVIDENCE_KIND.SIGNATURE),
    photoEvidence: kinds.has(EVIDENCE_KIND.PHOTO),
    verifiedLocation: kinds.has(EVIDENCE_KIND.VERIFIED_LOCATION),
    recipientInfo: kinds.has(EVIDENCE_KIND.RECIPIENT_INFO),
    interchangeable: false,
  };
}

module.exports = { record, listForShipment, interpret, EVIDENCE_KIND };
