/**
 * Declared vs provider-verified identity. Never store declared as verified.
 * Address mismatch is a risk signal, not fraud proof.
 */

const { newId, writeAudit, parseJson } = require("./secureIds");

function record(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return { ok: false, reason: "ORDER_REQUIRED" };

  const declared = {
    name: input.declaredName || null,
    ibanLast4: input.declaredIbanLast4 || null,
    billingAddress: input.declaredBillingAddress || null,
    deliveryAddress: input.declaredDeliveryAddress || null,
  };
  const verified = {
    name: input.verifiedName || null,
    ibanNameMatch: input.ibanNameMatch == null ? null : Boolean(input.ibanNameMatch),
    billingAddress: input.verifiedBillingAddress || null,
    deliveryAddress: input.verifiedDeliveryAddress || null,
    source: input.verificationSource || null,
  };

  if (!input.verificationSource) {
    verified.name = null;
    verified.ibanNameMatch = null;
    verified.billingAddress = null;
    verified.deliveryAddress = null;
  }

  const mismatch =
    declared.deliveryAddress &&
    verified.deliveryAddress &&
    declared.deliveryAddress !== verified.deliveryAddress;

  const status = input.verificationSource ? (mismatch ? "MISMATCH" : "PROVIDER_VERIFIED") : "UNVERIFIED";
  const id = newId("sidn");
  db.prepare(
    `INSERT INTO software_identity_signals(
      id, order_id, declared_json, verified_json, status, source, verified_at, limitations
    ) VALUES(?,?,?,?,?,?,?,?)`
  ).run(
    id,
    orderId,
    JSON.stringify(declared),
    JSON.stringify(verified),
    status,
    input.verificationSource || null,
    input.verificationSource ? new Date().toISOString() : null,
    input.limitations || "No Bundesbank or bank home-address API is assumed."
  );
  writeAudit(db, "identity.record", orderId, { status, mismatch: Boolean(mismatch) });
  return {
    ok: true,
    id,
    status,
    declared,
    verified,
    addressMismatch: Boolean(mismatch),
    mismatchIsNotFraudProof: true,
    legitimateAlternatives: ["gift", "workplace", "family", "authorized_recipient"],
    lawfulBasisReviewRequired: true,
  };
}

function latest(db, orderId) {
  const row = db
    .prepare("SELECT * FROM software_identity_signals WHERE order_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(orderId);
  if (!row) return null;
  return {
    status: row.status,
    declared: parseJson(row.declared_json, {}),
    verified: parseJson(row.verified_json, {}),
    source: row.source,
    verifiedAt: row.verified_at,
    limitations: row.limitations,
  };
}

module.exports = { record, latest };
