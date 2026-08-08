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
    de: "Ich verbinde Sie mit unserem Kundenservice. Bitte warten Sie oder rufen Sie während der Geschäftszeiten an.",
    en: "Routing you to human support. Please hold or call during business hours.",
    tr: "Sizi insan desteğine yönlendiriyorum. Lütfen bekleyin veya mesai saatlerinde arayın.",
    ar: "سأحولك إلى الدعم البشري. يرجى الانتظار أو الاتصال خلال ساعات العمل.",
  };
  return {
    ok: true,
    routed: true,
    message: messages[locale] || messages.de,
    contact: "service@buzzard24.de",
  };
}

module.exports = {
  verifyOrderAccess,
  getVerifiedOrderStatus,
  routeToHumanSupport,
};
