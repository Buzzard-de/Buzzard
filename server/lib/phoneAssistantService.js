const aiChatService = require("./aiChatService");

function verifyOrderAccess({ orderNumber, email, postalCode }) {
  if (!orderNumber || !email) {
    return { ok: false, errorKey: "ai.phone.missingVerification" };
  }
  const order = aiChatService.findOrder(orderNumber, email);
  if (!order) {
    return { ok: false, errorKey: "ai.phone.orderNotFound" };
  }
  if (postalCode) {
    const orderPostal = order.shippingAddress?.postalCode || order.shippingAddress?.zip;
    if (orderPostal && String(orderPostal).trim() !== String(postalCode).trim()) {
      return { ok: false, errorKey: "ai.phone.verificationFailed" };
    }
  }
  return {
    ok: true,
    verified: true,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber || null,
    trackingCarrier: order.trackingCarrier || null,
  };
}

function getVerifiedOrderStatus({ orderNumber, email, postalCode, locale = "de" }) {
  const verification = verifyOrderAccess({ orderNumber, email, postalCode });
  if (!verification.ok) return verification;

  const labels = {
    de: {
      paid: "Bezahlt",
      processing: "In Bearbeitung",
      shipped: "Versendet",
      delivered: "Zugestellt",
    },
    en: {
      paid: "Paid",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
    },
    tr: {
      paid: "Ödendi",
      processing: "İşleniyor",
      shipped: "Kargoda",
      delivered: "Teslim edildi",
    },
    ar: {
      paid: "مدفوع",
      processing: "قيد المعالجة",
      shipped: "تم الشحن",
      delivered: "تم التسليم",
    },
  };

  const lang = labels[locale] || labels.de;
  const statusLabel = lang[verification.status] || verification.status;

  return {
    ok: true,
    verified: true,
    orderNumber: verification.orderNumber,
    status: verification.status,
    statusLabel,
    trackingNumber: verification.trackingNumber,
    trackingCarrier: verification.trackingCarrier,
    message:
      locale === "de"
        ? `Bestellung ${verification.orderNumber}: ${statusLabel}`
        : locale === "tr"
          ? `Sipariş ${verification.orderNumber}: ${statusLabel}`
          : locale === "ar"
            ? `الطلب ${verification.orderNumber}: ${statusLabel}`
            : `Order ${verification.orderNumber}: ${statusLabel}`,
    escalate: false,
  };
}

function routeToHumanSupport(locale = "de") {
  const messages = {
    de: "Dieses Software-Interface verbindet keinen Telefonanruf. Schreiben Sie an service@buzzard24.de.",
    en: "This software does not place or transfer a phone call. Email service@buzzard24.de.",
    tr: "Bu yazılım telefon görüşmesi başlatmaz veya aktarmaz. service@buzzard24.de adresine yazın.",
    ar: "هذا البرنامج لا يبدأ مكالمة هاتفية. راسل service@buzzard24.de.",
  };
  return {
    ok: true,
    routed: true,
    live: false,
    callStarted: false,
    callTransferred: false,
    reason: "ESCALATE_CALL_BLOCKED",
    message: messages[locale] || messages.de,
    contact: "service@buzzard24.de",
  };
}

function startCall() {
  return {
    ok: false,
    live: false,
    callStarted: false,
    sid: null,
    reason: "CALL_START_BLOCKED",
    note: "JSON phone assistant never places a Twilio or SIP call.",
  };
}

function inboundWebhook() {
  return {
    ok: false,
    live: false,
    answered: false,
    mediaOpen: false,
    reason: "TWILIO_INBOUND_BLOCKED",
  };
}

function digitalHumanSession() {
  return {
    ok: false,
    live: false,
    videoOpen: false,
    avatarOpen: false,
    reason: "DIGITAL_HUMAN_LIVE_BLOCKED",
  };
}

function confirmLiveAssistant() {
  return {
    ok: false,
    live: false,
    liveVerified: false,
    callStarted: false,
    reason: "LIVE_PHONE_NOT_CONFIGURED",
  };
}

module.exports = {
  verifyOrderAccess,
  getVerifiedOrderStatus,
  routeToHumanSupport,
  startCall,
  inboundWebhook,
  digitalHumanSession,
  confirmLiveAssistant,
};
