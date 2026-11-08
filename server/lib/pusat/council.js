/**
 * AI Kurmay Heyeti roster — least privilege, no unlimited share.
 * Esat Bey is a security monitor, not the only defense layer.
 */
const crypto = require("crypto");

const CLASSIFICATION = Object.freeze({
  PUBLIC: "public",
  SHARED: "shared",
  PERSONAL: "personal",
  RESTRICTED: "restricted",
});

const MEMBERS = Object.freeze([
  {
    id: "pusat",
    name: "Pusat Orchestrator",
    role: "central_coordination",
    canRoute: true,
    permissions: ["ai.route", "ai.read", "meeting.chair", "shared.read", "shared.write"],
    share: [CLASSIFICATION.PUBLIC, CLASSIFICATION.SHARED],
  },
  {
    id: "dogu_bey",
    name: "Doğu Bey",
    role: "central_research",
    permissions: ["research.execute", "research.report", "shared.read"],
    share: [CLASSIFICATION.PUBLIC, CLASSIFICATION.SHARED],
  },
  {
    id: "sinan_bey",
    name: "Sinan Bey",
    gender: "male",
    role: "software_architect",
    namedAfter: "Mimar Sinan",
    avatar: "/council/sinan-bey.png",
    permissions: [
      "architecture.design",
      "software.review",
      "task.create",
      "shared.read",
      "research.request",
    ],
    share: [CLASSIFICATION.PUBLIC, CLASSIFICATION.SHARED],
    cannotChair: true,
    cannotEnableSales: true,
    cannotExecutePayments: true,
    cannotBuyStock: true,
    commercialCommit: false,
    liveShipment: false,
    alwaysOnProcess: false,
    replacesEsat: false,
    replacesDogu: false,
  },
  {
    id: "esat_bey",
    name: "Esat Bey",
    role: "security_monitor",
    permissions: ["security.read", "security.alert", "audit.write"],
    share: [CLASSIFICATION.PUBLIC, CLASSIFICATION.RESTRICTED],
    soleDefense: false,
  },
  {
    id: "nesrin_hanim",
    name: "Nesrin Hanım",
    role: "meeting_assistant",
    permissions: ["meeting.minutes", "meeting.remind", "meeting.summarize", "shared.read"],
    share: [CLASSIFICATION.PUBLIC, CLASSIFICATION.SHARED],
    cannotChair: true,
    assistantOnly: true,
  },
  {
    id: "textile_ai",
    name: "Tekstil AI",
    role: "category_expert",
    categoryCode: "bz.17",
    permissions: ["category.read", "research.request", "task.create"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "automotive_ai",
    name: "Otomotiv AI",
    role: "category_expert",
    categoryCode: "bz.01",
    permissions: ["category.read", "research.request", "task.create"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "construction_ai",
    name: "İnşaat makineleri AI",
    role: "category_expert",
    categoryCode: "bz.04",
    permissions: ["category.read", "research.request", "task.create"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "agriculture_ai",
    name: "Tarım AI",
    role: "category_expert",
    categoryCode: "bz.37",
    permissions: ["category.read", "research.request", "task.create"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "electronics_ai",
    name: "Elektronik AI",
    role: "category_expert",
    categoryCode: "bz.12",
    permissions: ["category.read", "research.request", "task.create"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "legal_ai",
    name: "Hukuk AI",
    role: "legal_privacy",
    permissions: ["legal.read", "legal.flag"],
    share: [CLASSIFICATION.PUBLIC],
    cannotFinalizeLegal: true,
  },
  {
    id: "finance_ai",
    name: "Vergi ve Finans AI",
    role: "tax_finance",
    permissions: ["finance.read", "tax.estimate"],
    share: [CLASSIFICATION.PUBLIC],
    cannotExecutePayments: true,
  },
  {
    id: "logistics_ai",
    name: "AB27 Lojistik AI",
    role: "logistics_trade",
    permissions: ["logistics.read", "trade.screen"],
    share: [CLASSIFICATION.PUBLIC],
    cannotAutoClearSanctions: true,
  },
  {
    id: "marketing_ai",
    name: "Pazarlama AI",
    role: "marketing",
    permissions: ["marketing.draft"],
    share: [CLASSIFICATION.PUBLIC],
    mustDiscloseAiIdentity: true,
  },
  {
    id: "customs_ai",
    name: "Tuncay Bey",
    aliasOfNative: "tuncay_bey",
    identitiesMerged: false,
    role: "customs_trade",
    permissions: ["customs.read", "trade.screen"],
    share: [CLASSIFICATION.PUBLIC],
    cannotAutoClearSanctions: true,
    cannotFileDeclaration: true,
  },
  {
    id: "phone_ai",
    name: "Zeynep Hanım",
    aliasOfNative: "zeynep_hanim",
    identitiesMerged: false,
    role: "voice_channel",
    permissions: ["voice.route"],
    share: [CLASSIFICATION.PUBLIC],
    liveCalls: false,
  },
  {
    id: "customer_ai",
    name: "Banu Hanım",
    aliasOfNative: "banu_hanim",
    identitiesMerged: false,
    role: "customer_support",
    permissions: ["customer.read"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "price_ai",
    name: "Akın Bey",
    aliasOfNative: "pricing_ai",
    identitiesMerged: false,
    role: "pricing",
    permissions: ["price.read"],
    share: [CLASSIFICATION.PUBLIC],
    cannotSetLivePrice: true,
  },
  {
    id: "stock_ai",
    name: "Çakır Bey",
    role: "inventory_signal",
    permissions: ["stock.read"],
    share: [CLASSIFICATION.PUBLIC],
    cannotBuyStock: true,
  },
  {
    id: "seo_ai",
    name: "Yılmaz Bey",
    role: "seo",
    permissions: ["seo.draft"],
    share: [CLASSIFICATION.PUBLIC],
  },
  {
    id: "sales_analysis_ai",
    name: "Sencer Bey",
    role: "sales_analysis",
    permissions: ["sales.read"],
    share: [CLASSIFICATION.PUBLIC],
    cannotEnableSales: true,
  },
]);

function getMember(id) {
  return MEMBERS.find((m) => m.id === id) || null;
}

function canShare({ fromId, toId, classification }) {
  if (!fromId || !toId || fromId === toId) return fromId === toId;
  const from = getMember(fromId);
  const to = getMember(toId);
  if (!from || !to) return false;
  if (classification === CLASSIFICATION.PERSONAL) return false;
  if (classification === CLASSIFICATION.RESTRICTED) {
    return from.share.includes(CLASSIFICATION.RESTRICTED) && to.share.includes(CLASSIFICATION.RESTRICTED);
  }
  if (classification === CLASSIFICATION.SHARED) {
    return from.share.includes(CLASSIFICATION.SHARED) && to.share.includes(CLASSIFICATION.SHARED);
  }
  return from.share.includes(CLASSIFICATION.PUBLIC) && to.share.includes(CLASSIFICATION.PUBLIC);
}

function hasPermission(memberId, permission) {
  const member = getMember(memberId);
  return Boolean(member?.permissions?.includes(permission));
}

function createTask({ fromId, title, assigneeId, dueAt, classification = CLASSIFICATION.PUBLIC } = {}) {
  if (!hasPermission(fromId, "task.create") && fromId !== "pusat") {
    return { ok: false, code: "PERMISSION_DENIED" };
  }
  if (!canShare({ fromId, toId: assigneeId, classification }) && fromId !== "pusat") {
    return { ok: false, code: "SHARE_DENIED" };
  }
  return {
    ok: true,
    task: {
      id: `task_${crypto.randomBytes(6).toString("hex")}`,
      title,
      fromId,
      assigneeId,
      dueAt: dueAt || null,
      classification,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    },
  };
}

function roster() {
  return MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    categoryCode: m.categoryCode || null,
    soleDefense: m.soleDefense === true,
    cannotFinalizeLegal: Boolean(m.cannotFinalizeLegal),
    cannotExecutePayments: Boolean(m.cannotExecutePayments),
    cannotChair: Boolean(m.cannotChair),
    assistantOnly: Boolean(m.assistantOnly),
    cannotAutoClearSanctions: Boolean(m.cannotAutoClearSanctions),
    cannotEnableSales: Boolean(m.cannotEnableSales),
    cannotBuyStock: Boolean(m.cannotBuyStock),
    liveCalls: m.liveCalls === true,
    gender: m.gender || null,
    avatar: m.avatar || null,
    commercialCommit: m.commercialCommit === true,
    alwaysOnProcess: m.alwaysOnProcess === true,
  }));
}

module.exports = {
  CLASSIFICATION,
  MEMBERS,
  getMember,
  canShare,
  hasPermission,
  createTask,
  roster,
};
