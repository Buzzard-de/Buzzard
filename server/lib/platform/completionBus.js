/**
 * Single integration snapshot of existing modules. Not live production.
 */
const { inventory } = require("../buzzardNative/core/specialistInventory");
const { snapshot: engines, buyStock } = require("../commerce/engineRegistry");
const { runConnected, runAll } = require("../commerce/connectedWorkflow");
const { handle, draftEmail } = require("../customer/banuDesk");
const { paymentStatus, fraudScreen } = require("../finance/bankingAdapter");
const { simulateTrack } = require("../logistics/carrierAdapter");
const { verify: verifyPaymentWebhook } = require("../finance/paymentWebhook");
const { probe: probe16 } = require("../workstreams/special16Runtime");
const { snapshot: streams } = require("../workstreams/special16");
const { coverage, publishBanner } = require("../storefront/holidayProgram");
const { SHARED } = require("../security/egressPolicy");
const { assessVoice } = require("../voice/voiceReadiness");
const { send, migrateNumber } = require("../comms/whatsappSandbox");
const { createCears } = require("../security/cears/engine");
const { createLocker } = require("../security/evidenceLocker");
const { recordIncident } = require("../security/cearsLocker");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");
const { validateTaxonomy } = require("../taxonomy/validateTaxonomy");
const { split } = require("../finance/taxReserves");
const { executiveSize } = require("../buzzardNative/core/councilConfig");

function integrate({ root = process.cwd() } = {}) {
  const specialists = inventory();
  const mem = createMultiMemory();
  const shared = mem.put({
    actorId: "pusat",
    ownerId: "pusat",
    type: "shared_knowledge",
    key: "platform_status",
    value: "dry_run",
  });
  const personalDenied = mem.get({ actorId: "sinan_bey", ownerId: "pusat", type: "personal", key: "x" });
  const cears = createCears();
  const locker = createLocker();
  const incident = recordIncident({ cears, locker, title: "integration-probe", bytes: "probe" });
  const commerce = {
    happy: runConnected("happy"),
    duplicate: runConnected("duplicate_order"),
    payment: runConnected("failed_payment"),
    refund: runConnected("partial_refund"),
    buy: buyStock(),
    all: runAll(),
    paymentMachine: paymentStatus({ from: "CREATED", event: "authorize" }),
    fraud: fraudScreen({ amount: 20, country: "DE" }),
    track: simulateTrack({ status: "IN_TRANSIT" }),
    webhook: verifyPaymentWebhook({ payload: "evt", header: null, secret: "s".repeat(32) }),
  };
  const desk = handle({ text: "Wo ist meine Bestellung?", locale: "de", facts: { orderId: "SYN-1" } });
  const emailDraft = draftEmail({ locale: "de", intent: "faq", facts: { orderId: "SYN-1" } });
  const holidays = coverage();
  const tax = {
    fr: split({ netProfit: 100, taxEstimate: 20, country: "FR" }),
    de: split({ netProfit: 100, taxEstimate: 20, country: "DE" }),
  };
  return {
    live: false,
    productionReady: false,
    llmCouncil: false,
    specialists,
    engines: engines(),
    commerce,
    desk: { sent: desk.sent, intent: desk.intent || null, draftSent: emailDraft.sent, autoSend: emailDraft.autoSendAuthorized },
    workstreamProbes: probe16(),
    whatsapp: { sent: send().sent, migrate: migrateNumber().code },
    voice: assessVoice(),
    holidays: { ...holidays, publish: publishBanner() },
    streams: streams(),
    tax,
    incident: { live: incident.live, notify: incident.notify, worm: incident.worm },
    memory: { sharedOk: shared.ok !== false, personalCrossDenied: personalDenied.ok === false },
    taxonomy: validateTaxonomy({ root }),
    council: executiveSize(),
    egressDefault: SHARED.default,
    dropshipping: commerce.buy.code === "HUMAN_GATE_REQUIRED",
  };
}

module.exports = { integrate };
