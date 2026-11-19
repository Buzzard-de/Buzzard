/**
 * AI Center action boundary.
 * Search, recommendation, and support explanations stay open.
 * Commercial requests are admitted on the existing core_approvals chain and are not executed.
 */
const SURFACES = new Set([
  "smart_search",
  "recommend",
  "support",
  "product_ai",
  "product_copy",
  "translate",
  "review_sentiment",
]);

const ACTION_JOB = Object.freeze({
  place_order: "PLACE_ORDER",
  create_order: "CREATE_ORDER",
  purchase_stock: "PURCHASE_STOCK",
  take_payment: "TAKE_PAYMENT",
  cancel_order: "CANCEL_ORDER",
  start_refund: "START_REFUND",
});

const EXPLICIT_ACTIONS = Object.freeze({
  order: "place_order",
  place_order: "place_order",
  create_order: "create_order",
  buy: "purchase_stock",
  purchase: "purchase_stock",
  purchase_stock: "purchase_stock",
  payment: "take_payment",
  pay: "take_payment",
  checkout: "take_payment",
  cancel: "cancel_order",
  cancel_order: "cancel_order",
  refund: "start_refund",
  start_refund: "start_refund",
});

const PERFORM = [
  { kind: "start_refund", pattern: /\b(refund my|refund order|refund this|refund it|please refund|issue a refund|start a refund|process a refund|could you refund|i want my money back|i would like a refund|erstatte\w*|erstatt\w*|geld zuruck|geld zurueck|bitte erstatten|iade et\w*|iade edin|iade eder|iade istiyorum|iade lutfen|parami iade|parami geri|refudn|refnd|refound|refrund|refundd)\b/i },
  { kind: "cancel_order", pattern: /\b(cancel (my |the )?order|cancel my oder|cancel it|cancle\w*|cancl my order|stornier\w*|storniren|storno|bitte stornieren|siparisi iptal|siparisimi iptal|iptal et)\b/i },
  { kind: "take_payment", pattern: /\b(pay now|pay for|take payment|checkout now|chekout|charge my|charge it|could you charge|bitte bezahlen|odeme yap|odemey yap|odeme yapp|odemeyi al|odemeyi cek|odeyebilir|zahlung ausfuhren|zahlung ausfuehren)\b/i },
  { kind: "purchase_stock", pattern: /\b(buy|buyy|purchase|purchse|purhcase|purchace|kaufen|kaufn|kaufe|kauf das|satin al|satin alir|stok satin al|would like to buy|want to buy|mochte kaufen)\b/i },
  { kind: "place_order", pattern: /\b(place an order|place order|plase an order|palce an order|place a order|order this|can you order|create an order|creat an order|crate an order|bestellung aufgeben|bestell das|ich mochte bestellen|siparis olustur|sipars olustur|siparis ver\w*)\b/i },
];

const ARABIC_PERFORM = [
  { kind: "purchase_stock", pattern: /أريد شراء|اريد شراء|اشتري|اشترِ/ },
  { kind: "cancel_order", pattern: /ألغِ الطلب|الغ الطلب|الغي الطلب|إلغاء الطلب|الغاء الطلب|اريد الغاء الطلب/ },
  { kind: "start_refund", pattern: /أرجع المبلغ|ارجع المبلغ|ارجاع المبلغ|استرجاع المبلغ|استرد المبلغ/ },
  { kind: "take_payment", pattern: /ادفع الآن|ادفع الان|ادفع|أريد أن أدفع|اريد ان ادفع|خذ الدفع/ },
  { kind: "place_order", pattern: /أريد أن أطلب|اريد ان اطلب|اطلب لي|اطلب هذا|قدّم الطلب|قدم الطلب/ },
];

const AMBIGUOUS = /\b(just do it|do the thing|take care of it|help me with my order|can you handle this|halleder misin|bunu hallet|bir sey yap|ilgilenir misin|lutfen ilgilen|mach das|erledige das|kannst du das machen|kummere dich)\b|افعل ذلك|ساعدني في الطلب/;

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function closed(extra = {}) {
  return {
    ok: false,
    informational: false,
    commercial: false,
    pendingApproval: false,
    executed: false,
    dryRun: true,
    providerCalled: false,
    orderStarted: false,
    paymentStarted: false,
    cancelStarted: false,
    refundStarted: false,
    purchaseStarted: false,
    job: null,
    ...extra,
  };
}

function foldLatin(text) {
  return text
    .replace(/[öô]/g, "o")
    .replace(/[üû]/g, "u")
    .replace(/[äâ]/g, "a")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ß/g, "ss");
}

function isExplanation(text, folded) {
  return /\b(how|what|where|when|why|policy|status|track|durum|nerede|nasil|politika|wie funktioniert|wo ist|was ist)\b/i.test(folded)
    || /ما هي|أين|اين|سياسة|كيف|حالة الطلب/.test(text);
}

function detectCommercialKind(text, action) {
  const requested = String(action || "").trim().toLowerCase();
  // Own entries only: "constructor" or "__proto__" as an action must not resolve to anything.
  const explicit = Object.prototype.hasOwnProperty.call(EXPLICIT_ACTIONS, requested) ? EXPLICIT_ACTIONS[requested] : null;
  if (explicit) return explicit;
  const folded = foldLatin(text.toLowerCase());
  if (isExplanation(text, folded)) return null;
  for (const rule of ARABIC_PERFORM) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  for (const rule of PERFORM) {
    if (rule.pattern.test(folded)) return rule.kind;
  }
  if (AMBIGUOUS.test(folded) || AMBIGUOUS.test(text)) return "ambiguous";
  return null;
}

function decideAiAction({ surface = "support", text = "", action = null } = {}) {
  const normalizedSurface = SURFACES.has(surface) ? surface : "support";
  const query = cleanText(text);
  const kind = detectCommercialKind(query, action);
  if (kind === "ambiguous") {
    return closed({
      ambiguous: true,
      code: "CLARIFICATION_REQUIRED",
      surface: normalizedSurface,
      query,
      status: 409,
      answer: "Say whether this is a question, or a request to place an order, take payment, cancel, or refund.",
    });
  }
  if (!kind) {
    if (!query && !action) {
      return closed({ code: "INPUT_REQUIRED", surface: normalizedSurface, status: 400 });
    }
    return closed({
      ok: true,
      informational: true,
      code: "INFO",
      surface: normalizedSurface,
      query,
      answer: normalizedSurface === "support"
        ? "I can explain products, orders, and policies. I cannot start an order, payment, cancellation, or refund."
        : query,
      status: 200,
    });
  }
  return closed({
    commercial: true,
    code: "APPROVAL_REQUIRED",
    surface: normalizedSurface,
    kind,
    jobType: ACTION_JOB[kind],
    query,
    status: 202,
  });
}

function screenProductAi(input = {}) {
  const text = cleanText(input.text || [input.name, input.description, input.short_description, input.review].filter(Boolean).join("\n"));
  return decideAiAction({
    surface: input.surface || "product_ai",
    text,
    action: input.action || null,
  });
}

function holdCommercialAiAction({ surface, text, action, actor, subjectId, deps }) {
  const decision = decideAiAction({ surface, text, action });
  if (!decision.commercial) return decision;
  const { admitPeripheralAutomation, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const admitted = admitPeripheralAutomation({
    source: PERIPHERAL_AUTOMATION_SOURCES.AI_CENTER,
    jobType: decision.jobType,
    actor: actor || `ai_center_${decision.surface}`,
    subjectId: subjectId == null ? null : String(subjectId),
    deps,
  });
  return closed({
    ...decision,
    ok: Boolean(admitted.ok),
    pendingApproval: Boolean(admitted.ok),
    approval: admitted.approval || null,
    job: null,
    jobId: admitted.jobId || null,
    code: admitted.ok ? "APPROVAL_REQUIRED" : admitted.code,
    status: admitted.ok ? 202 : admitted.status,
    message: admitted.ok ? undefined : admitted.message,
  });
}

function releaseCommercialAiAction({ approval, jobId, jobType }) {
  const { assertPeripheralExecution, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const gate = assertPeripheralExecution({
    source: PERIPHERAL_AUTOMATION_SOURCES.AI_CENTER,
    jobType,
    jobId,
    approval,
  });
  if (!gate.ok) return closed({ code: gate.code, commercial: true, status: 409 });
  return closed({
    ok: true,
    commercial: true,
    code: "DRY_RUN",
    status: 200,
    held: true,
  });
}

module.exports = {
  ACTION_JOB,
  decideAiAction,
  screenProductAi,
  holdCommercialAiAction,
  releaseCommercialAiAction,
};
