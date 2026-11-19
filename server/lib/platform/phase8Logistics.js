const { snapshot: carrierSnapshot, getAdapter } = require("../logistics/carrierContract");
const { verifyAddress } = require("../logistics/addressVerification");
const { startReturn } = require("../logistics/v5/returnsEngine");
const { snapshot: shippingSnapshot } = require("../logistics/shippingConnectorRegistry");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase8Logistics() {
  const carriers = carrierSnapshot();
  const adapter = getAdapter("DHL");
  const ship = adapter.createShipment({
    orderId: "DRY-ORD-L8",
    recipient: { name: "Test", country: "DE" },
  });
  const track = adapter.trackShipment({ trackingId: ship.trackingId || ship.fixture?.shipmentNo || "DRY-TRK" });
  const addr = verifyAddress({
    recipient: "Test Kunde",
    street: "Musterstr 1",
    city: "Berlin",
    postalCode: "10115",
    country: "DE",
  });
  const ret = startReturn({ orderId: "DRY-ORD-L8", reason: "DRY" });
  const shipping = shippingSnapshot();

  const checks = [
    { id: "LOG_CARRIER_MASTER", ok: (carriers.carriers?.length || carriers.count || 0) > 0 },
    {
      id: "LOG_CREATE_SHIPMENT",
      ok: ship.liveShipment === false && (ship.code === "HUMAN_GATE_REQUIRED" || ship.ok === true),
    },
    { id: "LOG_TRACKING", ok: track != null && track.live !== true },
    { id: "LOG_ADDRESS", ok: addr.ok === true },
    { id: "LOG_RETURN_ENGINE", ok: ret.live === false && ret.state === "RETURN_REQUESTED" },
    { id: "LOG_CONNECTOR_SNAPSHOT", ok: shipping.anyLive === false && shipping.liveShipment === false },
    { id: "LOG_LIVE_RATES", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #41" },
  ];

  return finalizePhase(8, "Kargo ve lojistik", checks, ["LOG_LIVE_RATES"]);
}

module.exports = { evaluatePhase8Logistics };