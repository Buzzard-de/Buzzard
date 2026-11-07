/**
 * Single dry-run pipeline: order sim → customs → selection → cost → fallback → notify.
 * Does not bind commerce orders or buy labels.
 */
const { isSalesEnabled } = require("../../salesMode");
const { isCountryEnabled } = require("./countryConfig");
const { simulateOrderLogistics } = require("./orderLogisticsSim");
const { assessCustoms } = require("./customsTaxBridge");
const { quoteCost } = require("./costEngine");
const { proposeFallback } = require("./fallbackEngine");
const { notifyCustomer } = require("./notifyStub");
const { circuitState, retryDecision, enqueueDeadLetter } = require("./resilience");
const { councilStatus } = require("./aiLogisticsCouncil");
const { requestSelectionHold } = require("../pusatLogistics");
const { screenTrade } = require("../../commerce/ab27Logistics");
const { germanyPilot } = require("./germanyPilot");
const { connectMode } = require("./localConnectModes");

function runDryRun(input = {}) {
  const destination = input.destination || "DE";
  const destIso = destination === "GR" ? "EL" : String(destination).toUpperCase();
  const salesEnabled = isSalesEnabled();
  const countryOn = isCountryEnabled(destIso);
  const logistics = simulateOrderLogistics(input);
  const customs = assessCustoms({
    originCountry: input.originCountry || "DE",
    destCountry: destIso,
    productClass: input.productClass,
    partyKnown: Boolean(input.partyKnown),
  });
  const trade = screenTrade({
    origin: input.originCountry || "DE",
    destination: destIso,
    goodsCode: input.productClass,
    value: input.value || 0,
  });
  const cost = quoteCost({ country: destIso, weightKg: input.weightKg });
  const fallback = proposeFallback({ reason: logistics.selection?.reason || "COVERAGE_UNKNOWN" });
  const notify = notifyCustomer({
    channel: "ACCOUNT_PAGE",
    event: "ORDER_CONFIRMED",
    verified: false,
  });
  const hold = requestSelectionHold({ destination: destIso, reason: "NO_VERIFIED_CARRIER" });

  const blocked =
    salesEnabled === false ||
    logistics.cannotStartShipment ||
    customs.hold ||
    trade.autoApproved === false;

  return {
    live: false,
    salesEnabled,
    countryEnabled: countryOn,
    boundToRealOrders: false,
    humanApprovalRequired: true,
    blocked,
    germanyPilot: destIso === "DE" ? germanyPilot().functions : "NOT_PILOT_COUNTRY",
    logistics,
    customs,
    trade: {
      status: trade.status,
      autoApproved: trade.autoApproved,
      sanctionsCleared: trade.sanctionsCleared || false,
      liveDeclaration: false,
    },
    cost,
    fallback,
    notify,
    ai: councilStatus(),
    localConnect: connectMode(input.connectMode || "API_XML"),
    resilience: {
      circuit: circuitState({ failures: 0 }),
      retry: retryDecision({ attempt: 0 }),
      deadLetter: enqueueDeadLetter({ kind: "dry_run" }),
    },
    pusat: hold,
    cannotStartShipment: true,
  };
}

module.exports = { runDryRun };
