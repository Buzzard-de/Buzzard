/**
 * Phase 8 logistics evidence. Uses the existing carrier adapters and cost model.
 * No label is purchased and no carrier credential is used.
 */
const { getAdapter, snapshot, foldTrackingEvents, POSTCODE } = require("./carrierContract");
const { verifyAddress } = require("./addressVerification");
const { startReturn } = require("./v5/returnsEngine");
const { snapshot: shippingSnapshot } = require("./shippingConnectorRegistry");
const { quoteCost } = require("./v5/costEngine");

const BRANDS = ["DHL", "DPD", "GLS", "Hermes", "UPS"];

function carrierEvidence() {
  const snap = snapshot();
  const rows = BRANDS.map((id) => {
    const adapter = getAdapter(id);
    const missing = adapter.createShipment({ orderId: "PHASE8-SYN", address: {} });
    const gated = adapter.createShipment({
      orderId: "PHASE8-SYN",
      address: adapter.fixture.request,
    });
    const moving = adapter.trackShipment({ status: Object.keys(adapter.statusMap).find((key) => adapter.statusMap[key] === "IN_TRANSIT") || "IN_TRANSIT" });
    const arrived = adapter.trackShipment({ status: Object.keys(adapter.statusMap).find((key) => adapter.statusMap[key] === "DELIVERED") || "DELIVERED" });
    const secret = "phase8-synthetic-secret";
    const payload = `phase8-${id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const header = require("crypto").createHmac("sha256", secret).update(payload).digest("hex");
    const signed = adapter.verifyWebhook({ payload, header, secret, timestamp: Date.now() });
    const replay = adapter.verifyWebhook({ payload, header, secret, timestamp: Date.now() });
    const noSecret = adapter.verifyWebhook({ payload, header: "x" });
    const returned = adapter.createReturn();
    return {
      id,
      missing: missing.code,
      gated: gated.code,
      live: gated.liveShipment === false && moving.liveShipment === false,
      moved: moving.status,
      arrived: arrived.status,
      signed: signed.ok === true,
      replay: replay.code,
      noSecret: noSecret.code,
      returnCode: returned.code,
    };
  });
  const folded = foldTrackingEvents([
    { id: "e1", status: "IN_TRANSIT" },
    { id: "e1", status: "IN_TRANSIT" },
    { id: "e2", status: "CREATED" },
    { id: "e3", status: "DELIVERED" },
    { id: "e4", status: "FAILED" },
  ]);
  return {
    ok: snap.live === false
      && snap.credentialsStored === false
      && rows.every((row) => row.missing && row.gated === "HUMAN_GATE_REQUIRED" && row.live && row.moved === "IN_TRANSIT" && row.arrived === "DELIVERED" && row.signed && row.replay === "REPLAY" && row.noSecret === "WEBHOOK_SECRET_REQUIRED" && row.returnCode === "HUMAN_GATE_REQUIRED")
      && folded.ignored.some((item) => item.reason === "DUPLICATE")
      && folded.ignored.some((item) => item.reason === "OUT_OF_ORDER")
      && folded.status === "FAILED",
    count: snap.carriers.length,
    brands: rows.map((row) => row.id),
    folded: folded.status,
  };
}

function countryEvidence() {
  const de = getAdapter("POST_DE");
  const fr = getAdapter("POST_FR");
  const badDe = de.validateRequest({ address: { postcode: "ABCDE" } });
  const goodDe = de.validateRequest({ address: { postcode: "10115" } });
  const badFr = fr.validateRequest({ address: { postcode: "7500" } });
  const goodFr = fr.validateRequest({ address: { postcode: "75001" } });
  const address = verifyAddress({
    recipient: "Synthetic",
    street: "Musterstr 1",
    city: "Berlin",
    postalCode: "10115",
    country: "DE",
  });
  const quote = quoteCost({ carrierId: "DHL", country: "DE", weightKg: 1, liveRate: false });
  const shipping = shippingSnapshot();
  const ret = startReturn({ orderId: "PHASE8-SYN", reason: "SYNTHETIC" });
  return {
    ok: POSTCODE.DE.test("10115")
      && badDe.ok === false
      && goodDe.ok === true
      && badFr.ok === false
      && goodFr.ok === true
      && address.ok === true
      && quote.total === "UNKNOWN"
      && quote.liveRate === false
      && quote.estimateIsNotPrice === true
      && shipping.anyLive === false
      && shipping.liveShipment === false
      && ret.live === false
      && ret.state === "RETURN_REQUESTED",
    de: goodDe.protocol,
    quote: quote.total,
    returnState: ret.state,
  };
}

function runPhase8Evidence() {
  const carriers = carrierEvidence();
  const country = countryEvidence();
  return {
    ok: carriers.ok === true && country.ok === true,
    carriers,
    country,
    live: false,
    productionReady: false,
  };
}

module.exports = { runPhase8Evidence };
