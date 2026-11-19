const fs = require("fs");
const path = require("path");

const dataDir = require("./dataDir").resolveDataDir();
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

function readQueue() {
  ensureDataDir();
  if (!fs.existsSync(queueFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(queueFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  ensureDataDir();
  fs.writeFileSync(queueFile, JSON.stringify(queue.slice(-1000), null, 2), "utf8");
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

function resolveLocale(locale) {
  const supported = new Set(["de", "en", "tr", "ar"]);
  return supported.has(locale) ? locale : "de";
}

function renderTemplate(eventType, locale, payload) {
  const lang = resolveLocale(locale);
  const tpl = TEMPLATES[eventType]?.[lang] || TEMPLATES[eventType]?.de;
  if (!tpl) return { subject: eventType, body: JSON.stringify(payload) };
  return {
    subject: interpolate(tpl.subject, payload),
    body: interpolate(tpl.body, payload),
  };
}

function queueNotification(entry) {
  return {
    ...entry,
    queued: false,
    sent: false,
    executed: false,
    dryRun: true,
    providerCalled: false,
    status: "held",
  };
}

function dispatchEmail() {
  const { callProvider } = require("./notificationAdmission");
  const provider = callProvider();
  return { channel: "email", status: "held", smtp: false, demo: false, ...provider, providerCalled: false };
}

function handleAutomationEvent(event, options = {}) {
  const { decideNotification } = require("./notificationAdmission");
  const payload = event?.payload || {};
  const decision = decideNotification({
    eventType: event?.type,
    channel: options.channel || payload.channel || "email",
    consent: options.consent,
    transaction: options.transaction,
    operational: options.operational,
    approval: options.approval,
    jobId: options.jobId,
    aiInitiated: options.aiInitiated,
  });
  const locale = resolveLocale(payload.language || payload.locale || "de");
  const rendered = decision.ok ? renderTemplate(event.type, locale, payload) : null;
  return {
    ...decision,
    sent: false,
    providerCalled: false,
    dispatch: dispatchEmail(),
    template: rendered?.subject || null,
  };
}

function retryNotification(notice, options = {}) {
  const { retryNotification: retry } = require("./notificationAdmission");
  return retry(notice, options);
}

function scheduleNotification(notice, options = {}) {
  const { scheduleNotification: schedule } = require("./notificationAdmission");
  return schedule(notice, options);
}

function listNotifications(limit = 100) {
  return readQueue().slice().reverse().slice(0, limit);
}

module.exports = {
  handleAutomationEvent,
  retryNotification,
  scheduleNotification,
  renderTemplate,
  listNotifications,
  queueNotification,
  dispatchEmail,
  TEMPLATES,
};
