/**
 * AI Kurmay Heyeti roster — least privilege, no unlimited share.
 * Esat Bey is a security monitor, not the only defense layer.
 */
const crypto = require("crypto");
const { resolveIdentity, LEGACY_ALIAS_TO_NATIVE } = require("../buzzardNative/core/councilAliasMap");
const { SEED_IDS, getAgent } = require("../buzzardNative/core/identityRegistry");
const { explicitPermissions } = require("../buzzardNative/core/permissionEngine");

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
    permissions: ["ai.route", "ai.read", "meeting.chair", "shared.read", "shared.write", "task.create", "research.request"],
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

function resolveMember(id) {
  const requestedId = String(id || "").trim();
  const exact = getMember(requestedId);
  const resolved = resolveIdentity(requestedId);
  if (exact) {
    return {
      ok: true,
      member: exact,
      requestedId,
      nativeId: exact.aliasOfNative || (resolved.ok ? resolved.nativeId : null),
      identitiesMerged: false,
      kind: resolved.kind || "MEMBERS",
    };
  }
  if (resolved.ok && resolved.kind === "NATIVE") {
    const aliasId = Object.keys(LEGACY_ALIAS_TO_NATIVE).find((k) => LEGACY_ALIAS_TO_NATIVE[k] === requestedId);
    const aliasMember = aliasId ? getMember(aliasId) : null;
    return {
      ok: Boolean(getMember(requestedId) || aliasMember || resolved.ok),
      member: exact,
      aliasMember: aliasMember || null,
      requestedId,
      nativeId: resolved.nativeId,
      identitiesMerged: false,
      kind: "NATIVE",
      note: "native_id_is_not_a_MEMBERS_row; alias_row_kept_separate",
    };
  }
  if (!resolved.ok && resolved.code === "NOT_NATIVE_SEED" && exact) {
    return { ok: true, member: exact, requestedId, nativeId: null, identitiesMerged: false };
  }
  return { ok: false, code: resolved.code || "UNKNOWN_IDENTITY", requestedId, identitiesMerged: false };
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

function createTask({
  fromId,
  title,
  assigneeId,
  dueAt,
  classification = CLASSIFICATION.PUBLIC,
  originRequesterId = null,
  delegationChain = [],
} = {}) {
  const actors = [];
  if (originRequesterId) actors.push(originRequesterId);
  for (const id of delegationChain || []) actors.push(id);
  actors.push(fromId);
  for (const actor of actors) {
    if (!hasPermission(actor, "task.create")) {
      return {
        ok: false,
        code: "PERMISSION_DENIED",
        permission: { actor, perm: "task.create", decision: "DENY", permissionIncreased: false },
        assigned: false,
      };
    }
  }
  if (!canShare({ fromId, toId: assigneeId, classification })) {
    return { ok: false, code: "SHARE_DENIED", permission: { actor: fromId, perm: "share", decision: "DENY", classification } };
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

function projectMember(m) {
  return {
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
  };
}

function memberForSeed(seedId) {
  return getMember(seedId) || MEMBERS.find((member) => member.aliasOfNative === seedId) || null;
}

function seedParticipant(seedId) {
  const agent = getAgent(seedId);
  const member = memberForSeed(seedId);
  const permissions = explicitPermissions(seedId);
  return {
    id: seedId,
    name: agent?.display_name || null,
    role: agent?.role || null,
    seedId,
    permissions,
    councilPermissions: member ? [...member.permissions] : [],
    present: Boolean(agent),
    chair: seedId === "pusat",
    canBuyStock: false,
    canExecutePayments: false,
    canEnableSales: false,
    canExportCustomerData: false,
    canDeploy: false,
    canDistribute: false,
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
    shipmentCreated: false,
    refunded: false,
  };
}

function roster(scope) {
  if (scope === "seed-meeting") {
    const seen = new Set();
    const participants = [];
    for (const id of SEED_IDS) {
      if (seen.has(id)) continue;
      seen.add(id);
      participants.push(seedParticipant(id));
    }
    return participants;
  }
  return MEMBERS.map(projectMember);
}

function holdSeedMeeting() {
  const participants = roster("seed-meeting");
  const ids = participants.map((participant) => participant.id);
  const unique = new Set(ids);
  const complete =
    ids.length === SEED_IDS.length &&
    unique.size === SEED_IDS.length &&
    SEED_IDS.every((id) => unique.has(id)) &&
    participants.every((participant) => participant.present && participant.name && participant.role);
  const decision = {
    text: "Synthetic local minutes. No commercial execution.",
    recordedBy: "pusat",
    executed: false,
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
    shipmentCreated: false,
    refunded: false,
    exported: false,
    deployed: false,
    salesEnabled: false,
  };
  return {
    ok: complete,
    synthetic: true,
    productionReady: false,
    productionClaim: false,
    salesEnabled: false,
    chairId: "pusat",
    participants,
    count: participants.length,
    uniqueCount: unique.size,
    decisions: [decision],
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
    shipmentCreated: false,
    refunded: false,
    exported: false,
    deployed: false,
  };
}

function delegateWithinMeeting({ fromId, toId, permission } = {}) {
  const participants = roster("seed-meeting");
  const from = participants.find((participant) => participant.id === fromId);
  const to = participants.find((participant) => participant.id === toId);
  const blocked = new Set([
    "STOCK_BUY",
    "SUPPLIER_PAY",
    "PAYMENT_ACTIVATE",
    "LIVE_PAYMENT",
    "BANK_TRANSFER",
    "SALES_ACTIVATE",
    "SALES_WRITE",
    "DATA_EXPORT",
    "DEPLOY",
    "DEPLOYMENT",
    "SHIPMENT_CREATE",
    "CUSTOMER_REFUND",
    "PRICE_PUBLISH_LIVE",
  ]);
  if (!from || !to) {
    return { ok: false, code: "UNKNOWN_IDENTITY", permissionIncreased: false, granted: false, executed: false };
  }
  const originHas = from.permissions.includes(permission);
  const targetHas = to.permissions.includes(permission);
  if (blocked.has(permission) || !originHas) {
    return {
      ok: false,
      code: "DELEGATION_ESCALATION_DENIED",
      permissionIncreased: false,
      granted: false,
      executed: false,
      salesEnabled: false,
      orderCreated: false,
      paymentCreated: false,
      purchased: false,
    };
  }
  return {
    ok: targetHas,
    code: targetHas ? "ALLOW" : "PERMISSION_DENIED",
    permissionIncreased: false,
    granted: false,
    executed: false,
    salesEnabled: false,
    orderCreated: false,
    paymentCreated: false,
    purchased: false,
  };
}

module.exports = {
  CLASSIFICATION,
  MEMBERS,
  getMember,
  resolveMember,
  canShare,
  hasPermission,
  createTask,
  roster,
  holdSeedMeeting,
  delegateWithinMeeting,
};
