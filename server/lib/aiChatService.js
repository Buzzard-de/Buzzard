const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const productStore = require("./productStore");
const recommendationService = require("./recommendationService");

const dataDir = path.join(__dirname, "..", "data");
const ordersFile = path.join(dataDir, "orders.json");
const sessionsFile = path.join(dataDir, "ai-chat-sessions.json");

const RESPONSES = {
  greeting: {
    de: "Hallo! Ich bin der Buzzard KI-Assistent. Ich helfe bei Produkten, Bestellungen, Versand und Rückgaben. Wie kann ich Ihnen helfen?",
    en: "Hello! I'm the Buzzard AI assistant. I can help with products, orders, shipping, and returns. How can I help?",
    tr: "Merhaba! Ben Buzzard yapay zeka asistanıyım. Ürünler, siparişler, kargo ve iadeler konusunda yardımcı olabilirim.",
    ar: "مرحبًا! أنا مساعد Buzzard الذكي. يمكنني المساعدة في المنتجات والطلبات والشحن والإرجاع.",
  },
  escalation: {
    de: "Dazu kann ich leider keine sichere Antwort geben. Bitte kontaktieren Sie unseren Kundenservice unter service@buzzard24.de oder nutzen Sie das Kontaktformular.",
    en: "I cannot safely answer that. Please contact our support team at service@buzzard24.de or use the contact form.",
    tr: "Buna güvenli bir yanıt veremiyorum. Lütfen service@buzzard24.de adresinden destek ekibimizle iletişime geçin.",
    ar: "لا يمكنني الإجابة بأمان على ذلك. يرجى التواصل مع الدعم على service@buzzard24.de.",
  },
  orderNotFound: {
    de: "Ich konnte keine Bestellung mit diesen Angaben finden. Bitte prüfen Sie Bestellnummer und E-Mail.",
    en: "I could not find an order with those details. Please verify order number and email.",
    tr: "Bu bilgilerle sipariş bulunamadı. Lütfen sipariş numarasını ve e-postayı kontrol edin.",
    ar: "لم أجد طلبًا بهذه البيانات. يرجى التحقق من رقم الطلب والبريد الإلكتروني.",
  },
  returns: {
    de: "Rückgaben sind innerhalb von 30 Tagen möglich. Melden Sie eine Rückgabe in Ihrem Kundenkonto unter „Meine Bestellungen“.",
    en: "Returns are available within 30 days. Start a return from your account under My Orders.",
    tr: "30 gün içinde iade yapabilirsiniz. Hesabınızdan Siparişlerim bölümünden iade başlatın.",
    ar: "الإرجاع متاح خلال 30 يومًا. ابدأ الإرجاع من حسابك في قسم طلباتي.",
  },
  shipping: {
    de: "Standardversand dauert in der Regel 2–5 Werktage. Kostenloser Versand ab 79 €. Den Sendungsstatus sehen Sie in Ihrem Kundenkonto.",
    en: "Standard shipping usually takes 2–5 business days. Free shipping from €79. Track shipments in your account.",
    tr: "Standart kargo genellikle 2–5 iş günü sürer. 79 € üzeri ücretsiz kargo. Takip bilgisi hesabınızda.",
    ar: "الشحن القياسي عادة 2–5 أيام عمل. شحن مجاني من 79 €. تتبع الشحنات من حسابك.",
  },
  aiDisclaimer: {
    de: "Ich bin ein KI-Assistent, kein menschlicher Mitarbeiter.",
    en: "I am an AI assistant, not a human employee.",
    tr: "Ben bir yapay zeka asistanıyım, insan çalışan değilim.",
    ar: "أنا مساعد ذكاء اصطناعي ولست موظفًا بشريًا.",
  },
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function salesEnabled() {
  return process.env.NEXT_PUBLIC_SALES_ENABLED === "1" || process.env.BUZZARD_SALES_ENABLED === "1";
}

function resolveLocale(locale) {
  return ["de", "en", "tr", "ar"].includes(locale) ? locale : "de";
}

function readOrders() {
  if (!fs.existsSync(ordersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function readSessions() {
  ensureDataDir();
  if (!fs.existsSync(sessionsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(sessionsFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  ensureDataDir();
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions.slice(-500), null, 2), "utf8");
}

function getSession(sessionId) {
  return readSessions().find((s) => s.id === sessionId);
}

function saveSession(session) {
  const sessions = readSessions().filter((s) => s.id !== session.id);
  sessions.push(session);
  writeSessions(sessions);
}

function findOrder(orderNumber, email) {
  if (!orderNumber || !email) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  return readOrders().find(
    (o) => o.orderNumber === String(orderNumber).trim() && o.customer?.email === normalizedEmail
  );
}

function formatOrderStatus(order, locale) {
  const statusMap = {
    de: { paid: "Bezahlt", processing: "In Bearbeitung", shipped: "Versendet", delivered: "Zugestellt" },
    en: { paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered" },
    tr: { paid: "Ödendi", processing: "İşleniyor", shipped: "Kargoda", shipped_alt: "Gönderildi", delivered: "Teslim edildi" },
    ar: { paid: "مدفوع", processing: "قيد المعالجة", shipped: "تم الشحن", delivered: "تم التسليم" },
  };
  const labels = statusMap[locale] || statusMap.de;
  const status = order.status || "paid";
  const label = labels[status] || status;
  let text = `${order.orderNumber}: ${label}`;
  if (order.trackingNumber) {
    text += ` (${order.trackingCarrier || "Carrier"}: ${order.trackingNumber})`;
  }
  return text;
}

function detectIntent(message) {
  const text = String(message || "").toLowerCase();
  if (/bestell|order|sipariş|طلب/.test(text)) return "order";
  if (/versand|shipping|kargo|شحن/.test(text)) return "shipping";
  if (/rück|rückgabe|return|iade|إرجاع/.test(text)) return "returns";
  if (/produkt|product|ürün|منتج|suche|search|ara|بحث/.test(text)) return "product";
  if (/mensch|human|support|kontakt|contact|destek|دعم/.test(text)) return "escalation";
  if (/hallo|hello|merhaba|مرحب|hi\b/.test(text)) return "greeting";
  return "unknown";
}

function extractOrderQuery(message) {
  const orderMatch = message.match(/(?:BZ|BUZ|ORD|#)?[\-]?\d{4,}/i);
  const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return {
    orderNumber: orderMatch ? orderMatch[0].replace(/^#/, "") : null,
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
  };
}

function extractProductQuery(message) {
  const cleaned = String(message || "")
    .replace(/produkt|product|ürün|منتج|suche|search|find|zeig|show/gi, "")
    .trim();
  return cleaned.slice(0, 80);
}

function handleMessage(input) {
  const locale = resolveLocale(input.locale);
  const sessionId = input.sessionId || crypto.randomUUID();
  let session = getSession(sessionId) || {
    id: sessionId,
    locale,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  const userMessage = String(input.message || "").trim().slice(0, 2000);
  if (!userMessage) {
    return { ok: false, errorKey: "ai.chat.emptyMessage" };
  }

  session.messages.push({ role: "user", content: userMessage, at: new Date().toISOString() });
  const intent = detectIntent(userMessage);
  let reply = "";
  let escalate = false;
  let products = [];
  let order = null;

  switch (intent) {
    case "greeting":
      reply = RESPONSES.greeting[locale];
      break;
    case "shipping":
      reply = RESPONSES.shipping[locale];
      break;
    case "returns":
      reply = RESPONSES.returns[locale];
      break;
    case "order": {
      const { orderNumber, email } = extractOrderQuery(userMessage);
      const lookupEmail = email || input.customerEmail;
      if (orderNumber && lookupEmail) {
        order = findOrder(orderNumber, lookupEmail);
        if (order) {
          reply = formatOrderStatus(order, locale);
        } else {
          reply = RESPONSES.orderNotFound[locale];
          escalate = true;
        }
      } else {
        reply =
          locale === "de"
            ? "Bitte nennen Sie Ihre Bestellnummer und die E-Mail-Adresse der Bestellung."
            : locale === "tr"
              ? "Lütfen sipariş numaranızı ve sipariş e-postasını belirtin."
              : locale === "ar"
                ? "يرجى ذكر رقم الطلب والبريد الإلكتروني للطلب."
                : "Please provide your order number and the email used for the order.";
      }
      break;
    }
    case "product": {
      const query = extractProductQuery(userMessage) || input.productContext?.name;
      products = recommendationService.searchForRecommendations(query, 4);
      if (products.length) {
        const list = salesEnabled()
          ? products.map((p) => `${p.name} (${p.price?.toFixed(2)} €)`).join("; ")
          : products.map((p) => p.name).join("; ");
        reply =
          locale === "de"
            ? `Hier sind passende Produkte aus unserem Katalog: ${list}`
            : locale === "tr"
              ? `Katalogumuzdan eşleşen ürünler: ${list}`
              : locale === "ar"
                ? `منتجات مطابقة من كatalogنا: ${list}`
                : `Matching products from our catalog: ${list}`;
      } else {
        reply = RESPONSES.escalation[locale];
        escalate = true;
      }
      break;
    }
    case "escalation":
      reply = RESPONSES.escalation[locale];
      escalate = true;
      break;
    default:
      reply = RESPONSES.escalation[locale];
      escalate = true;
  }

  reply += `\n\n(${RESPONSES.aiDisclaimer[locale]})`;
  session.messages.push({ role: "assistant", content: reply, at: new Date().toISOString(), intent, escalate });
  session.updatedAt = new Date().toISOString();
  saveSession(session);

  return {
    ok: true,
    sessionId,
    reply,
    intent,
    escalate,
    products,
    order: order
      ? {
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber || null,
          trackingCarrier: order.trackingCarrier || null,
        }
      : null,
    rtl: locale === "ar",
  };
}

module.exports = {
  handleMessage,
  findOrder,
  RESPONSES,
};
