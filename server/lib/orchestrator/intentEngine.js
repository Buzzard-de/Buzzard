const { INTENTS, RISK } = require("./constants");
const { detectPromptInjection } = require("./securityGuard");

const RULES = [
  { intent: INTENTS.SECURITY_EVENT, risk: RISK.CRITICAL, re: /prompt injection|security breach|credential/i },
  { intent: INTENTS.HUMAN_AGENT_REQUEST, risk: RISK.MEDIUM, re: /mensch|human|yetkili|insanla|bir insan|agent|kundenservice|destek|support|موظف/i },
  { intent: INTENTS.PHONE_CALL_REQUEST, risk: RISK.HIGH, re: /anrufen|call me|telefon|arama|outbound call/i },
  { intent: INTENTS.ORDER_CANCEL, risk: RISK.HIGH, re: /siparişimi iptal|bestellung.*(storn|abbrechen)|cancel (my )?order|إلغاء الطلب/i },
  { intent: INTENTS.REFUND_STATUS, risk: RISK.CRITICAL, re: /refund|rückerstatt|paramı iade|para iade|استرداد/i },
  { intent: INTENTS.RETURN_REQUEST, risk: RISK.HIGH, re: /rückgabe|return request|iade talep|إرجاع/i },
  { intent: INTENTS.ORDER_CREATE, risk: RISK.HIGH, re: /bestellen|place order|sipariş ver|checkout/i },
  { intent: INTENTS.ADD_TO_CART, risk: RISK.MEDIUM, re: /in den warenkorb|add to cart|sepete ekle/i },
  { intent: INTENTS.REMOVE_FROM_CART, risk: RISK.MEDIUM, re: /aus dem warenkorb|remove from cart|sepetten çıkar/i },
  { intent: INTENTS.ORDER_STATUS, risk: RISK.LOW, re: /bestellstatus|order status|sipariş durumu|wo ist meine bestellung/i },
  { intent: INTENTS.DELIVERY_STATUS, risk: RISK.LOW, re: /lieferung|tracking|kargo|sendung|شحن/i },
  { intent: INTENTS.PAYMENT_QUERY, risk: RISK.HIGH, re: /zahlung|payment|ödeme|paypal|stripe/i },
  { intent: INTENTS.ACCOUNT_QUERY, risk: RISK.HIGH, re: /passwort|password|konto|account security|şifre/i },
  { intent: INTENTS.PRICE_CHECK, risk: RISK.LOW, re: /preis|price|fiyat|kaç para|wie viel/i },
  { intent: INTENTS.STOCK_CHECK, risk: RISK.LOW, re: /lager|stock|bestand|stok|verfügbar/i },
  { intent: INTENTS.VEHICLE_LOOKUP, risk: RISK.LOW, re: /bmw|audi|mercedes|vw |volkswagen|fahrzeug|kfz|tecdoc|320d|vin /i },
  { intent: INTENTS.SUPPLIER_QUERY, risk: RISK.MEDIUM, re: /lieferant|supplier|tedarikçi/i },
  { intent: INTENTS.MARKETPLACE_QUERY, risk: RISK.MEDIUM, re: /marketplace|marktplatz|pazar yeri/i },
  { intent: INTENTS.CATEGORY_QUERY, risk: RISK.LOW, re: /kategorie|category|kategori/i },
  { intent: INTENTS.COMPLAINT, risk: RISK.HIGH, riskBoost: true, re: /beschwerde|complaint|şikayet|legal|anwalt/i },
  { intent: INTENTS.SEARCH_PRODUCT, risk: RISK.LOW, re: /finde|find |suche|search|arıyorum|fren|bremse|disk|ürün|produkt/i },
  { intent: INTENTS.PRODUCT_INFORMATION, risk: RISK.LOW, re: /was ist|details|oem|artikelnummer/i },
  { intent: INTENTS.CUSTOMER_SUPPORT, risk: RISK.LOW, re: /hilfe|help|nasıl|howto/i },
];

const HIGH_RISK_INTENTS = new Set([
  INTENTS.ORDER_CANCEL,
  INTENTS.ORDER_CREATE,
  INTENTS.RETURN_REQUEST,
  INTENTS.PAYMENT_QUERY,
  INTENTS.ACCOUNT_QUERY,
  INTENTS.PHONE_CALL_REQUEST,
  INTENTS.COMPLAINT,
]);

const CRITICAL_INTENTS = new Set([
  INTENTS.REFUND_STATUS,
  INTENTS.SECURITY_EVENT,
  INTENTS.APPROVAL_REQUIRED,
]);

function classifyIntent(message, { injectionDetected = false } = {}) {
  const text = String(message || "").trim();
  const injection = injectionDetected || detectPromptInjection(text).detected;
  if (injection) {
    return {
      intent: INTENTS.SECURITY_EVENT,
      confidence: 0.99,
      risk: RISK.CRITICAL,
      approval: "REQUIRED",
      untrusted: true,
    };
  }
  if (!text) {
    return { intent: INTENTS.GENERAL_QUERY, confidence: 0.2, risk: RISK.LOW, approval: "NONE" };
  }

  for (const rule of RULES) {
    if (rule.re.test(text)) {
      const risk = CRITICAL_INTENTS.has(rule.intent)
        ? RISK.CRITICAL
        : HIGH_RISK_INTENTS.has(rule.intent)
          ? RISK.HIGH
          : rule.risk;
      const approval = risk === RISK.CRITICAL || risk === RISK.HIGH ? "REQUIRED" : "NONE";
      const confidence = Math.min(0.97, 0.72 + text.length / 400);
      return { intent: rule.intent, confidence, risk, approval, untrusted: true };
    }
  }

  return {
    intent: INTENTS.GENERAL_QUERY,
    confidence: 0.45,
    risk: RISK.LOW,
    approval: "NONE",
    untrusted: true,
  };
}

function requiresHumanHandoff(classification) {
  if (!classification) return false;
  if (classification.intent === INTENTS.HUMAN_AGENT_REQUEST) return true;
  if (classification.intent === INTENTS.COMPLAINT) return true;
  if (classification.intent === INTENTS.SECURITY_EVENT) return true;
  if (classification.confidence < 0.4) return true;
  return false;
}

module.exports = {
  classifyIntent,
  requiresHumanHandoff,
  RULES,
};
