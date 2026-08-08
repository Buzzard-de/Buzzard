const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getSession, extractToken } = require("../lib/customerAuth");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(__dirname, "..", "data");
const ordersFile = path.join(dataDir, "orders.json");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");

const FREE_SHIPPING_THRESHOLD = 79;
const STANDARD_SHIPPING = 5.99;
const SHIPPING_METHODS = {
  standard: { baseCost: STANDARD_SHIPPING, freeEligible: true },
  express: { baseCost: 12.99, freeEligible: false },
};

const COUPONS = {
  BUZZARD10: { type: "percent", value: 10, minSubtotal: 30 },
  WELCOME5: { type: "fixed", value: 5, minSubtotal: 25 },
};

const VALID_PAYMENTS = new Set(["paypal", "stripe", "klarna", "sepa"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let productIndex = null;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function loadProducts() {
  if (productIndex) return productIndex;
  const raw = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  productIndex = new Map();
  for (const product of raw.products || []) {
    if (product.status === "active") productIndex.set(product.id, product);
  }
  return productIndex;
}

function readOrders() {
  ensureDataDir();
  if (!fs.existsSync(ordersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  ensureDataDir();
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
}

function normalizeText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function validateCoupon(code, subtotal) {
  const normalized = normalizeText(code, 32).toUpperCase();
  if (!normalized) return { valid: false, discount: 0 };
  const coupon = COUPONS[normalized];
  if (!coupon) return { valid: false, discount: 0 };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return { valid: false, discount: 0 };
  const discount =
    coupon.type === "percent"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);
  return { valid: true, discount, normalizedCode: normalized };
}

function resolveLine(productId, variantIds, qty) {
  const products = loadProducts();
  const product = products.get(productId);
  if (!product) return null;

  const selected = (product.variants || []).filter((v) => variantIds.includes(v.id));
  const variantPrice = selected.find((v) => v.price && v.price.amount)?.price?.amount;
  const unitPrice = variantPrice ?? product.price.amount;
  const sku = selected.find((v) => v.sku)?.sku || product.sku;
  const stock = selected.find((v) => typeof v.stock === "number")?.stock ?? product.stock;
  if (stock < qty || product.stock_status === "out_of_stock") return null;

  const variantLabel = selected.map((v) => `${v.label}: ${v.value}`).join(", ");
  const lineTotal = Math.round(unitPrice * qty * 100) / 100;
  const vatRate = product.vat_rate;
  const vatAmount = Math.round((lineTotal - lineTotal / (1 + vatRate / 100)) * 100) / 100;

  return {
    productId: product.id,
    name: product.name,
    sku,
    variantIds,
    variantLabel,
    qty,
    unitPrice,
    lineTotal,
    vatRate,
    vatAmount,
    imageKey: product.attributes?.image_key,
  };
}

function calculateQuote(lines, shippingMethodId, couponCode) {
  const resolved = [];
  for (const line of lines) {
    const priced = resolveLine(line.productId, line.variantIds || [], line.qty);
    if (!priced) return null;
    resolved.push(priced);
  }

  const subtotal = resolved.reduce((sum, line) => sum + line.lineTotal, 0);
  const coupon = validateCoupon(couponCode, subtotal);
  const discount = coupon.valid ? coupon.discount : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const method = SHIPPING_METHODS[shippingMethodId] || SHIPPING_METHODS.standard;
  let shipping = method.baseCost;
  if (method.freeEligible && discountedSubtotal >= FREE_SHIPPING_THRESHOLD) shipping = 0;
  const vatAmount = Math.round(resolved.reduce((sum, line) => sum + line.vatAmount, 0) * 100) / 100;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;

  return {
    currency: "EUR",
    lines: resolved,
    subtotal,
    shipping,
    discount,
    vatAmount,
    total,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal),
    shippingMethodId,
    couponCode: coupon.valid ? coupon.normalizedCode : undefined,
  };
}

function nextOrderNumber(existing) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `BZ-${today}-`;
  const todayOrders = existing.filter((o) => String(o.orderNumber || "").startsWith(prefix));
  const seq = String(todayOrders.length + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

function sanitizePublicOrder(order) {
  const clone = { ...order };
  delete clone.internalId;
  return clone;
}

function validateAddress(address) {
  if (!address) return false;
  const required = ["firstName", "lastName", "street", "zip", "city", "country"];
  return required.every((key) => normalizeText(address[key]));
}

function validatePayload(body) {
  if (!body || !Array.isArray(body.lines) || body.lines.length === 0) return "invalid_lines";
  if (!body.customer || !validateAddress(body.shippingAddress)) return "invalid_address";
  if (!body.billingSameAsShipping && !validateAddress(body.billingAddress)) return "invalid_billing";
  if (!VALID_PAYMENTS.has(body.paymentProvider)) return "invalid_payment";
  if (!body.acceptTerms || !body.acceptPrivacy) return "invalid_legal";
  if (!EMAIL_REGEX.test(normalizeText(body.customer.email, 254).toLowerCase())) return "invalid_email";
  return null;
}

module.exports = {
  register(app) {
    ensureDataDir();

    app.post("/api/checkout/quote", (req, res) => {
      const { lines, shippingMethodId = "standard", couponCode } = req.body || {};
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, errorKey: "checkout.errorRequired" });
      }
      const quote = calculateQuote(lines, shippingMethodId, couponCode);
      if (!quote) {
        return res.status(400).json({ success: false, errorKey: "checkout.stockError" });
      }
      return res.json({
        success: true,
        quote: {
          subtotal: quote.subtotal,
          shipping: quote.shipping,
          discount: quote.discount,
          vatAmount: quote.vatAmount,
          total: quote.total,
          freeShippingRemaining: quote.freeShippingRemaining,
          currency: quote.currency,
        },
      });
    });

    app.post("/api/orders", (req, res) => {
      const body = req.body || {};
      const validationError = validatePayload(body);
      if (validationError) {
        return res.status(400).json({ success: false, errorKey: "checkout.errorRequired" });
      }

      const quote = calculateQuote(body.lines, body.shippingMethodId || "standard", body.couponCode);
      if (!quote) {
        return res.status(400).json({ success: false, errorKey: "checkout.stockError" });
      }

      const orders = readOrders();
      const orderNumber = nextOrderNumber(orders);
      const now = new Date().toISOString();
      const customerSession = getSession(extractToken(req));

      const order = {
        id: crypto.randomUUID(),
        orderNumber,
        customerId: customerSession?.customerId || null,
        status: "paid",
        createdAt: now,
        customer: {
          email: normalizeText(body.customer.email, 254).toLowerCase(),
          firstName: normalizeText(body.customer.firstName, 100),
          lastName: normalizeText(body.customer.lastName, 100),
          phone: normalizeText(body.customer.phone, 40),
          guest: body.customer.guest !== false,
        },
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingSameAsShipping ? body.shippingAddress : body.billingAddress,
        shippingMethodId: body.shippingMethodId || "standard",
        paymentProvider: body.paymentProvider,
        paymentStatus: "paid",
        paymentTransactionId: `${String(body.paymentProvider).toUpperCase()}-${orderNumber}`,
        lines: quote.lines,
        subtotal: quote.subtotal,
        shipping: quote.shipping,
        discount: quote.discount,
        vatAmount: quote.vatAmount,
        total: quote.total,
        currency: quote.currency,
        couponCode: quote.couponCode,
        trackingNumber: null,
        trackingCarrier: null,
      };

      orders.push(order);
      writeOrders(orders);

      return res.status(201).json({ success: true, order: sanitizePublicOrder(order) });
    });

    app.get("/api/orders/:orderNumber", (req, res) => {
      const orderNumber = decodeURIComponent(req.params.orderNumber || "");
      const order = readOrders().find((o) => o.orderNumber === orderNumber);
      if (!order) {
        return res.status(404).json({ success: false, errorKey: "checkout.orderNotFound" });
      }
      return res.json({ success: true, order: sanitizePublicOrder(order) });
    });
  },
};
