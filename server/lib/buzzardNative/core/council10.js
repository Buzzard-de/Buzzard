const { ids, getAgent, registerAgent, unregisterAgent, assignVoice } = require("./identityRegistry");
const { forAgent } = require("./capabilityRegistry");
const { check, selfElevate, esatDisableSelf } = require("./permissionEngine");
const { createMultiMemory } = require("./multiMemory");
const { runLoad } = require("./loadProbe");
const { openMeeting } = require("./councilSession");
const { runImportToEuCustomer } = require("./tradeFlow");
const { calculateVat, netIncomeReport, germanyPolicy, payTax, fileReturn } = require("./tax/vatEngine");
const { classify, screen, fileDeclaration, release } = require("./customs/engine");
const { cloneAttempt, verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { speak } = require("./sharedSpeech");

function runCouncil10({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const mem = createMultiMemory();
  mem.put({ actorId: "nedim_bey", ownerId: "nedim_bey", type: "tax_decision", key: "d", value: "vat" });
  mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "customs_decision", key: "d", value: "hs" });
  const extra = registerAgent({
    agent_id: "probe_ai",
    display_name: "Probe AI",
    role: "dynamic_probe",
    specialization: "PROBE",
  });
  unregisterAgent("probe_ai");
  const meeting = openMeeting({
    present: ["pusat", "sinan_bey", "esat_bey", "dogu_bey", "nedim_bey", "tuncay_bey"],
    agenda: "tax-customs",
  });
  const trade = runImportToEuCustomer({ sku: "cotton_tshirt", origin: "TR", destination: "FR", net: 200 });
  const blocked = screen({ actorId: "tuncay_bey", sku: "encryption_module", origin: "DE", destination: "KP" });
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    productionReady: false,
    registered: ids().length,
    identities: ids(),
    nedim: getAgent("nedim_bey"),
    tuncay: getAgent("tuncay_bey"),
    voiceNedim: speak({ agentId: "nedim_bey", text: "a" }).voiceStatus,
    voiceTuncay: speak({ agentId: "tuncay_bey", text: "a" }).voiceStatus,
    copySinanToNedim: assignVoice({ fromId: "sinan_bey", toId: "nedim_bey" }),
    dynamicRegister: extra.ok,
    seedLocked: unregisterAgent("nedim_bey").code,
    memory: {
      nedimToTuncay: mem.get({ actorId: "nedim_bey", ownerId: "tuncay_bey", type: "customs_decision", key: "d" }).code,
      tuncayToNedim: mem.get({ actorId: "tuncay_bey", ownerId: "nedim_bey", type: "tax_decision", key: "d" }).code,
      ameliaTax: mem.get({ actorId: "amelia", ownerId: "nedim_bey", type: "tax_decision", key: "d" }).code,
      tuncayWritesTax: mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "tax_knowledge", key: "x", value: 1 }).code,
    },
    caps: { nedim: forAgent("nedim_bey").map((c) => c.engine), tuncay: forAgent("tuncay_bey").map((c) => c.engine) },
    vatDeFr: calculateVat({
      actorId: "nedim_bey",
      sellerCountry: "DE",
      customerCountry: "FR",
      deliveryCountry: "FR",
      goodsNet: 100,
    }),
    missingVat: calculateVat({ actorId: "nedim_bey", deliveryCountry: "FR" }),
    germany: germanyPolicy(),
    reserveFr: netIncomeReport({
      actorId: "nedim_bey",
      incomeCountry: "FR",
      gross: 100,
      vat: 20,
      supplierCost: 10,
    }),
    reserveDe: netIncomeReport({ actorId: "nedim_bey", incomeCountry: "DE", gross: 100, vat: 19, supplierCost: 10 }),
    classifyUnknown: classify({ actorId: "tuncay_bey", sku: "mystery_widget" }),
    blocked,
    trade,
    meeting,
    official: verifyOfficialFile(),
    clone: cloneAttempt({ requested: true }),
    egress: evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed,
    perms: {
      nedimPay: payTax(),
      nedimFile: fileReturn(),
      tuncayFile: fileDeclaration(),
      tuncayRelease: release(),
      pusatPay: check("pusat", "PAYMENT_ACTIVATE"),
      esat: esatDisableSelf(),
      elevate: selfElevate("nedim_bey", "TAX_PAY"),
      export: check("tuncay_bey", "DATA_EXPORT"),
    },
    load: runLoad(),
  };
}

module.exports = { runCouncil10 };
