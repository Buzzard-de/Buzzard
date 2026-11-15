const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const queueFile = path.join(dataDir, "notification-queue.json");

const TEMPLATES = {
  new_order: {
    de: { subject: "Bestellbestätigung {{orderNumber}}", body: "Vielen Dank für Ihre Bestellung {{orderNumber}}." },
    en: { subject: "Order confirmation {{orderNumber}}", body: "Thank you for your order {{orderNumber}}." },
    tr: { subject: "Sipariş onayı {{orderNumber}}", body: "{{orderNumber}} numaralı siparişiniz için teşekkürler." },
    ar: { subject: "تأكيد الطلب {{orderNumber}}", body: "شكرًا لطلبك {{orderNumber}}." },
  },
  payment_confirmed: {
    de: { subject: "Zahlung bestätigt {{orderNumber}}", body: "Ihre Zahlung für {{orderNumber}} wurde bestätigt." },
    en: { subject: "Payment confirmed {{orderNumber}}", body: "Your payment for {{orderNumber}} has been confirmed." },
    tr: { subject: "Ödeme onaylandı {{orderNumber}}", body: "{{orderNumber}} için ödemeniz onaylandı." },
    ar: { subject: "تم تأكيد الدفع {{orderNumber}}", body: "تم تأكيد الدفع للطلب {{orderNumber}}." },
  },
  order_shipped: {
    de: { subject: "Versand {{orderNumber}}", body: "Ihre Bestellung {{orderNumber}} wurde versendet." },
    en: { subject: "Shipped {{orderNumber}}", body: "Your order {{orderNumber}} has been shipped." },
    tr: { subject: "Kargoya verildi {{orderNumber}}", body: "{{orderNumber}} siparişiniz kargoya verildi." },
    ar: { subject: "تم الشحن {{orderNumber}}", body: "تم شحن طلبك {{orderNumber}}." },
  },
  order_delivered: {
    de: { subject: "Zugestellt {{orderNumber}}", body: "Ihre Bestellung {{orderNumber}} wurde zugestellt." },
    en: { subject: "Delivered {{orderNumber}}", body: "Your order {{orderNumber}} has been delivered." },
    tr: { subject: "Teslim edildi {{orderNumber}}", body: "{{orderNumber}} siparişiniz teslim edildi." },
    ar: { subject: "تم التسليم {{orderNumber}}", body: "تم تسليم طلبك {{orderNumber}}." },
  },
  abandoned_cart: {
    de: { subject: "Ihr Warenkorb wartet", body: "Sie haben Artikel in Ihrem Warenkorb. Möchten Sie Ihren Einkauf fortsetzen?" },
    en: { subject: "Your cart is waiting", body: "You have items in your cart. Would you like to continue shopping?" },
    tr: { subject: "Sepetiniz bekliyor", body: "Sepetinizde ürünler var. Alışverişe devam etmek ister misiniz?" },
    ar: { subject: "سلتك في انتظارك", body: "لديك منتجات في سلتك. هل تريد متابعة التسوق؟" },
  },
  review_request: {
    de: { subject: "Wie war Ihre Bestellung?", body: "Bitte bewerten Sie Ihre Erfahrung mit Bestellung {{orderNumber}}." },
    en: { subject: "How was your order?", body: "Please review your experience with order {{orderNumber}}." },
    tr: { subject: "Siparişiniz nasıldı?", body: "Lütfen {{orderNumber}} siparişinizi değerlendirin." },
    ar: { subject: "كيف كان طلبك؟", body: "يرجى تقييم تجربتك مع الطلب {{orderNumber}}." },
  },
  return_request: {
    de: { subject: "Rückgabe eingegangen {{orderNumber}}", body: "Wir haben Ihre Rückgabeanfrage für {{orderNumber}} erhalten." },
    en: { subject: "Return received {{orderNumber}}", body: "We received your return request for {{orderNumber}}." },
    tr: { subject: "İade alındı {{orderNumber}}", body: "{{orderNumber}} için iade talebiniz alındı." },
    ar: { subject: "تم استلام الإرجاع {{orderNumber}}", body: "تلقينا طلب الإرجاع للطلب {{orderNumber}}." },
  },
  refund: {
    de: { subject: "Erstattung {{orderNumber}}", body: "Ihre Erstattung für {{orderNumber}} wurde bearbeitet." },
    en: { subject: "Refund {{orderNumber}}", body: "Your refund for {{orderNumber}} has been processed." },
    tr: { subject: "İade {{orderNumber}}", body: "{{orderNumber}} için iadeniz işlendi." },
    ar: { subject: "استرداد {{orderNumber}}", body: "تمت معالجة استرداد الطلب {{orderNumber}}." },
  },
  new_customer: {
    de: { subject: "Willkommen bei Buzzard", body: "Vielen Dank für Ihre Registrierung bei Buzzard." },
    en: { subject: "Welcome to Buzzard", body: "Thank you for registering with Buzzard." },
    tr: { subject: "Buzzard'a hoş geldiniz", body: "Buzzard'a kaydolduğunuz için teşekkürler." },
    ar: { subject: "مرحبًا بك في Buzzard", body: "شكرًا لتسجيلك في Buzzard." },
  },
  low_stock: {
    de: { subject: "Niedriger Lagerbestand", body: "Produkt {{productId}} hat niedrigen Lagerbestand." },
    en: { subject: "Low stock alert", body: "Product {{productId}} is low on stock." },
    tr: { subject: "Düşük stok", body: "{{productId}} ürününde stok azaldı." },
    ar: { subject: "مخزون منخفض", body: "المنتج {{productId}} مخزونه منخفض." },
  },
  supplier_stock_update: {
    de: { subject: "Lieferantenbestand aktualisiert", body: "Lieferant {{supplierId}} Bestand wurde aktualisiert." },
    en: { subject: "Supplier stock updated", body: "Supplier {{supplierId}} stock was updated." },
    tr: { subject: "Tedarikçi stok güncellendi", body: "{{supplierId}} tedarikçi stoku güncellendi." },
    ar: { subject: "تحديث مخزون المورد", body: "تم تحديث مخزون المورد {{supplierId}}." },
  },
  supplier_import_failure: {
    de: { subject: "Import fehlgeschlagen", body: "Lieferantenimport für {{supplierId}} ist fehlgeschlagen." },
    en: { subject: "Import failed", body: "Supplier import for {{supplierId}} failed." },
    tr: { subject: "İçe aktarma başarısız", body: "{{supplierId}} tedarikçi içe aktarması başarısız oldu." },
    ar: { subject: "فشل الاستيراد", body: "فشل استيراد المورد {{supplierId}}." },
  },
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

let isolatedQueue = null;

function isolateNotificationQueue() {
  isolatedQueue = [];
  return isolatedQueue;
}

function releaseNotificationQueue() {
  isolatedQueue = null;
}

function readQueue() {
  if (isolatedQueue) return isolatedQueue.slice();
  if (process.env.VITEST === "true") return [];
  ensureDataDir();
  if (!fs.existsSync(queueFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(queueFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  const next = queue.slice(-1000);
  if (isolatedQueue) {
    isolatedQueue.splice(0, isolatedQueue.length, ...next);
    return;
  }
  if (process.env.VITEST === "true") return;
  ensureDataDir();
  fs.writeFileSync(queueFile, JSON.stringify(next, null, 2), "utf8");
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

const { resolveSupportedLocale } = require("./canonicalLocales");

function resolveLocale(locale) {
  return resolveSupportedLocale(locale, "en");
}

function renderTemplate(eventType, locale, payload) {
  const lang = resolveLocale(locale);
  const tpl = TEMPLATES[eventType]?.[lang] || TEMPLATES[eventType]?.en || TEMPLATES[eventType]?.de;
  if (!tpl) return { subject: eventType, body: JSON.stringify(payload) };
  return {
    subject: interpolate(tpl.subject, payload),
    body: interpolate(tpl.body, payload),
  };
}

const EVENT_POLICIES = Object.freeze({
  new_order: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "orderVerified", purpose: "order_status" },
  payment_confirmed: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "paymentVerified", purpose: "order_status" },
  order_cancelled: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "cancellationVerified", purpose: "order_status" },
  order_shipped: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "shipmentVerified", purpose: "shipment" },
  order_delivered: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "deliveryVerified", purpose: "shipment" },
  return_request: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "returnVerified", purpose: "return" },
  refund: { kind: "transactional", channels: ["email", "sms", "push", "in_app"], fact: "refundVerified", purpose: "refund" },
  abandoned_cart: { kind: "marketing", channels: ["email", "sms", "push"], recovery: true },
  cart_recovered: { kind: "marketing", channels: ["email", "sms", "push"], recovery: true },
  review_request: { kind: "marketing", channels: ["email", "sms", "push"] },
  new_customer: { kind: "marketing", channels: ["email"] },
  low_stock: { kind: "operational", channels: ["email"], fact: "stockVerified", purpose: "inventory_alert" },
  supplier_stock_update: { kind: "operational", channels: ["email"], fact: "stockVerified", purpose: "supplier_ops" },
  supplier_import_failure: { kind: "operational", channels: ["email"], fact: "importFailureVerified", purpose: "supplier_ops" },
});

const RECOVERY_EVENTS = new Set(["abandoned_cart", "cart_recovered"]);

function denySend(reason, extra = {}) {
  return {
    ok: false,
    reason,
    sent: false,
    queued: false,
    stored: false,
    live: false,
    customerNotified: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
    ...extra,
  };
}

function channelOf(request) {
  return String(request.channel || "email").toLowerCase();
}

function recipientFor(channel, request) {
  if (channel === "email") return String(request.email || "").trim();
  if (channel === "sms") return String(request.phone || "").trim();
  if (channel === "push") return String(request.pushToken || request.deviceToken || "").trim();
  if (channel === "in_app") return String(request.customerId || "").trim();
  return "";
}

function legacyMarketingIgnored(request) {
  return request.marketing_email === 1
    || request.marketing_email === "1"
    || request.marketing_email === true
    || request.emailOptIn === true
    || request.marketingConsent === true
    || request.marketing === true
    || request.marketing_tracking === "GRANTED"
    || request.marketingTracking === "GRANTED";
}

function recoverySendDecision(request, eventType) {
  const { assessCartRecovery } = require("./commerce/cartRecoveryGate");
  const { readMarketingConsent } = require("./commerce/marketingConsentGate");
  const channel = String(request.channel || "email").toLowerCase();
  const customerId = request.customerId == null ? "" : String(request.customerId);
  const cartId = request.cartId || request.cartKey || "";
  const decision = assessCartRecovery({
    customerId,
    cartCustomerId: request.cartCustomerId == null ? customerId : request.cartCustomerId,
    cartId,
    channel,
    cartStatus: request.cartStatus,
    orderStatus: request.orderStatus,
    orderId: request.orderId,
    abandonedAt: request.abandonedAt,
    timeout: request.timeout === true,
    networkError: request.networkError === true,
    mock: request.mock === true,
    synthetic: request.synthetic === true,
    source: request.source,
    action: request.action,
    idempotencyKey: request.idempotencyKey || `recovery-send:${customerId}:${cartId}:${channel}:${eventType}`,
  });
  const consent = readMarketingConsent(customerId);
  return {
    ok: false,
    reason: decision.code,
    error: decision.code,
    code: decision.code,
    status: decision.status,
    queued: false,
    sent: false,
    notificationSent: false,
    customerNotified: false,
    messageSent: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    recovered: false,
    orderCreated: false,
    paymentCreated: false,
    emailPermission: consent.emailPermission,
    smsPermission: consent.smsPermission,
    pushPermission: consent.pushPermission,
    channel: decision.channel,
    callerFlagIgnored: true,
    callerPermissionIgnored: request.permission === true || request.ok === true || request.status === 200 || request.authorized === true,
    duplicate: decision.duplicate === true,
    reasons: Array.isArray(decision.reasons) ? decision.reasons.slice() : [decision.code],
  };
}

function marketingDecision(request, policy) {
  const channel = channelOf(request);
  if (channel === "whatsapp" || !policy.channels.includes(channel)) return denySend("channel_rejected", { channel });
  if (request.unsubscribed === true) return denySend("unsubscribed", { channel });
  if (!recipientFor(channel, request)) return denySend("no_recipient", { channel });
  const customerId = request.customerId == null ? "" : String(request.customerId);
  let consent;
  try {
    consent = require("./commerce/marketingConsentGate").readMarketingConsent(customerId);
  } catch {
    return denySend("consent_store_unavailable", { channel });
  }
  if (!consent || consent.storeStatus === "UNAVAILABLE") return denySend("consent_store_unavailable", { channel });
  const permission = channel === "sms"
    ? consent.smsPermission
    : channel === "push"
      ? consent.pushPermission
      : consent.emailPermission;
  const verified = permission === "GRANTED" && consent.granted === true && consent.consentVerified === true;
  if (!verified) {
    return denySend("marketing_consent_required", {
      channel,
      emailPermission: consent.emailPermission || "UNKNOWN",
      smsPermission: consent.smsPermission || "UNKNOWN",
      pushPermission: consent.pushPermission || "UNKNOWN",
      trackingPermission: consent.trackingPermission || "UNKNOWN",
      callerFlagIgnored: true,
    });
  }
  return {
    ok: true,
    reason: "marketing_authorized",
    channel,
    sent: false,
    queued: false,
    live: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
  };
}

function transactionalDecision(request, policy, eventType) {
  const channel = channelOf(request);
  if (legacyMarketingIgnored(request) || request.purpose === "marketing" || request.recovery === true) {
    return denySend("transactional_not_marketing", { channel });
  }
  if (!policy.channels.includes(channel)) return denySend("channel_rejected", { channel });
  if (!recipientFor(channel, request)) return denySend("no_recipient", { channel });
  let verification;
  try {
    verification = require("./commerce/transactionalOrderVerify").verifyTransactionalOrder(request, policy, eventType);
  } catch {
    return denySend("repository_unavailable", { channel });
  }
  if (!verification || verification.ok !== true) {
    return denySend((verification && verification.reason) || "repository_unavailable", { channel });
  }
  return {
    ok: true,
    reason: "transactional_authorized",
    channel,
    sent: false,
    queued: false,
    live: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
  };
}

function operationalDecision(request, policy, eventType) {
  const channel = channelOf(request);
  if (legacyMarketingIgnored(request) || request.purpose === "marketing") return denySend("operational_not_marketing", { channel });
  if (!policy.channels.includes(channel)) return denySend("channel_rejected", { channel });
  if (!recipientFor(channel, request)) return denySend("no_recipient", { channel });
  let verification;
  try {
    verification = require("./commerce/operationalNoticeVerify").verifyOperationalNotice(request, policy, eventType);
  } catch {
    return denySend("repository_unavailable", { channel });
  }
  if (!verification || verification.ok !== true) {
    return denySend((verification && verification.reason) || "repository_unavailable", { channel });
  }
  return {
    ok: true,
    reason: "operational_authorized",
    channel,
    sent: false,
    queued: false,
    live: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
  };
}

function canSend(payload, eventType) {
  const request = payload && typeof payload === "object" ? payload : {};
  const type = String(eventType || "");
  const policy = EVENT_POLICIES[type];
  if (!policy) return denySend("unknown_event_type");
  if (policy.recovery) return recoverySendDecision(request, type);
  if (policy.kind === "marketing") return marketingDecision(request, policy);
  if (policy.kind === "transactional") return transactionalDecision(request, policy, type);
  if (policy.kind === "operational") return operationalDecision(request, policy, type);
  return denySend("unknown_event_type");
}

function queueNotification(entry = {}) {
  const eventType = entry.eventType || entry.type || "";
  const decision = canSend(entry, eventType);
  if (!decision.ok) {
    return {
      ok: false,
      queued: false,
      stored: false,
      sent: false,
      live: false,
      productionReady: false,
      salesOpen: false,
      egress: "DENY",
      reason: decision.reason,
      code: decision.code || decision.reason,
    };
  }
  const queue = readQueue();
  queue.push({
    eventType,
    channel: decision.channel || channelOf(entry),
    queuedAt: new Date().toISOString(),
    sent: false,
    live: false,
    productionReady: false,
  });
  writeQueue(queue);
  return {
    ok: true,
    queued: true,
    stored: true,
    sent: false,
    live: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
    reason: decision.reason,
  };
}

function topicForEvent(type) {
  if (type === "order_shipped" || type === "order_delivered") return "shipment";
  if (type === "return_request") return "return";
  if (type === "refund") return "refund";
  if (type === "payment_confirmed" || type === "new_order" || type === "order_cancelled") return "order_status";
  return "general";
}

const HELD_TEMPLATES = {
  de: { subject: "Status nicht verfügbar {{orderNumber}}", body: "Der Status von {{orderNumber}} ist UNVERIFIED." },
  en: { subject: "Status unavailable {{orderNumber}}", body: "The status of {{orderNumber}} is UNVERIFIED." },
  tr: { subject: "Durum doğrulanmadı {{orderNumber}}", body: "{{orderNumber}} durumu UNVERIFIED." },
  ar: { subject: "الحالة غير مؤكدة {{orderNumber}}", body: "حالة {{orderNumber}} هي UNVERIFIED." },
};

const noticeAttempts = new Map();
const noticeErrors = [];
const automationDecisions = new Map();

function heldTemplate(locale, orderNumber) {
  const lang = resolveLocale(locale);
  const tpl = HELD_TEMPLATES[lang] || HELD_TEMPLATES.en;
  return {
    subject: interpolate(tpl.subject, { orderNumber }),
    body: interpolate(tpl.body, { orderNumber }),
    customerVisible: "UNVERIFIED",
  };
}

function noticeResult(extra = {}) {
  const result = {
    ok: false,
    sent: false,
    queued: false,
    deliveryConfirmed: false,
    customerNotified: false,
    live: false,
    to: null,
    recipient: null,
    attempts: 1,
    customerVisible: "UNVERIFIED",
    duplicate: false,
    ...extra,
  };
  delete result.email;
  delete result.phone;
  return result;
}

function logNoticeError(result, key) {
  noticeErrors.push({
    key,
    code: result.code,
    status: result.status,
    attempts: result.attempts,
    channel: result.channel || null,
    eventType: result.eventType || null,
    orderNumber: result.orderNumber || null,
  });
}

function blockedNotice(key, fields) {
  const result = noticeResult({
    status: "BLOCKED_EXTERNAL",
    sent: false,
    queued: false,
    customerNotified: false,
    live: false,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
    ...fields,
  });
  noticeAttempts.set(key, result);
  logNoticeError(result, key);
  return result;
}

function prepareCustomerNotice(input = {}) {
  const channel = String(input.channel || "email").toLowerCase();
  const eventType = String(input.eventType || input.type || "");
  const customerId = input.customerId == null ? "" : String(input.customerId);
  const orderNumber = input.orderNumber ? String(input.orderNumber) : "";
  const key = input.idempotencyKey || `${channel}:${eventType}:${customerId}:${orderNumber}`;
  if (noticeAttempts.has(key) && input.action !== "retry") {
    const prior = noticeAttempts.get(key);
    return noticeResult({
      ...prior,
      code: "DUPLICATE_NOTIFICATION",
      duplicate: true,
      sent: false,
      queued: false,
      customerNotified: false,
      live: false,
      productionReady: false,
      salesOpen: false,
      egress: "DENY",
    });
  }
  const policy = EVENT_POLICIES[eventType];
  if (!policy) {
    return blockedNotice(key, {
      code: "unknown_event_type",
      channel,
      eventType,
      orderNumber: null,
      customerId: null,
      template: null,
    });
  }
  if (policy.kind !== "transactional") {
    return blockedNotice(key, {
      code: policy.kind === "operational" ? "operational_not_customer_notice" : "transactional_not_marketing",
      channel,
      eventType,
      orderNumber: null,
      customerId: null,
      template: null,
    });
  }
  const assertedCustomer = input.orderCustomerId == null ? customerId : String(input.orderCustomerId);
  const assertedOrder = input.orderNumberOnRecord == null ? orderNumber : String(input.orderNumberOnRecord);
  if (!customerId || !orderNumber || assertedCustomer !== customerId || assertedOrder !== orderNumber) {
    return blockedNotice(key, {
      code: "CUSTOMER_ORDER_MISMATCH",
      channel,
      eventType,
      orderNumber: null,
      customerId: null,
      template: null,
    });
  }
  const template = heldTemplate(input.locale || input.language, orderNumber);
  let verification;
  try {
    verification = require("./commerce/transactionalOrderVerify").verifyTransactionalOrder(input, policy, eventType);
  } catch {
    verification = { ok: false, reason: "repository_unavailable" };
  }
  if (!verification || verification.ok !== true) {
    return blockedNotice(key, {
      code: (verification && verification.reason) || "repository_unavailable",
      channel,
      eventType,
      orderNumber,
      customerId,
      template,
    });
  }
  const priorAttempts = noticeAttempts.get(key)?.attempts || 0;
  const hub = require("./notificationHub").deliverNotification({
    channel,
    kind: topicForEvent(eventType),
    idempotencyKey: `hub:${key}:${priorAttempts + 1}`,
    timeout: input.timeout === true,
    networkError: input.networkError === true,
    mock: input.mock === true || input.demo === true,
  });
  const result = noticeResult({
    code: hub.code,
    status: hub.status,
    channel,
    eventType,
    orderNumber,
    customerId,
    template,
    attempts: priorAttempts + 1,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
    live: false,
    sent: false,
    queued: false,
  });
  noticeAttempts.set(key, result);
  if (result.status === "FAILED" || result.code === "TIMEOUT" || result.code === "NETWORK_ERROR") logNoticeError(result, key);
  return result;
}

function retryCustomerNotice(key) {
  const prior = key ? noticeAttempts.get(key) : null;
  if (!prior) return noticeResult({ code: "RETRY_UNKNOWN", status: "UNKNOWN", template: null, attempts: 0 });
  const next = noticeResult({
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.code === "TIMEOUT" || prior.code === "NETWORK_ERROR" ? prior.code : "RETRY_NOT_SENT",
    status: prior.status === "FAILED" ? "FAILED" : prior.status,
    sent: false,
    queued: false,
    deliveryConfirmed: false,
    customerNotified: false,
    duplicate: false,
  });
  noticeAttempts.set(key, next);
  logNoticeError(next, key);
  return next;
}

function listNoticeErrors() {
  return noticeErrors.map((entry) => ({ ...entry }));
}

function handleAutomationEvent(event = {}) {
  const type = event.type;
  const payload = event.payload || {};
  const key = event.idempotencyKey || event.id || null;
  if (key && automationDecisions.has(key)) {
    const prior = automationDecisions.get(key);
    return { ...prior, duplicate: true, sent: false, queued: false, customerNotified: false, live: false, to: null };
  }
  const consent = canSend(payload, type);
  if (!consent.ok) {
    const blocked = {
      sent: false,
      queued: false,
      customerNotified: false,
      reason: consent.reason,
      status: "BLOCKED_EXTERNAL",
      code: consent.code || consent.reason,
      to: null,
      live: false,
      productionReady: false,
    };
    if (key) automationDecisions.set(key, blocked);
    return blocked;
  }
  const hub = require("./notificationHub").deliverNotification({
    channel: payload.channel || "email",
    kind: topicForEvent(type),
    idempotencyKey: event.idempotencyKey || event.id || null,
    mock: payload.mock === true || payload.demo === true,
    timeout: payload.timeout === true,
    networkError: payload.networkError === true,
  });
  const result = {
    sent: false,
    queued: false,
    customerNotified: false,
    status: hub.status,
    code: hub.code,
    duplicate: hub.duplicate === true,
    template: orderNumberHeld(payload),
    customerVisible: "UNVERIFIED",
    to: null,
    live: false,
    productionReady: false,
  };
  if (key) automationDecisions.set(key, result);
  return result;
}

function orderNumberHeld(payload) {
  if (!payload.orderNumber) return null;
  return heldTemplate(payload.language || payload.locale, payload.orderNumber);
}

function listNotifications(limit = 100) {
  return readQueue().slice().reverse().slice(0, limit);
}

module.exports = {
  handleAutomationEvent,
  renderTemplate,
  listNotifications,
  canSend,
  queueNotification,
  prepareCustomerNotice,
  retryCustomerNotice,
  listNoticeErrors,
  isolateNotificationQueue,
  releaseNotificationQueue,
  bindOrderRepository: (...args) => require("./commerce/transactionalOrderVerify").bindOrderRepository(...args),
  unbindOrderRepository: (...args) => require("./commerce/transactionalOrderVerify").unbindOrderRepository(...args),
  openIsolatedOrderFixture: (...args) => require("./commerce/transactionalOrderVerify").openIsolatedOrderFixture(...args),
  bindOperationalRepository: (...args) => require("./commerce/operationalNoticeVerify").bindOperationalRepository(...args),
  unbindOperationalRepository: (...args) => require("./commerce/operationalNoticeVerify").unbindOperationalRepository(...args),
  openIsolatedOperationalFixture: (...args) => require("./commerce/operationalNoticeVerify").openIsolatedOperationalFixture(...args),
  TEMPLATES,
  HELD_TEMPLATES,
  EVENT_POLICIES,
};
