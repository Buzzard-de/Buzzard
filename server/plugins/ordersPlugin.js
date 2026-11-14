const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { verifyPaymentIntent } = require("../lib/paymentVerification");
const {
  createRateLimiter,
  createDuplicateGuard,
  getClientIp,
  isSafeId,
  normalizeText,
} = require("../lib/security");
const { logSecurityEvent } = require("../lib/securityLog");
const { calculateShipping } = require("../lib/shippingEngine");
const fulfillmentStore = require("../lib/fulfillmentStore");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(__dirname, "..", "data");
const ordersFile = path.join(dataDir, "orders.json");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");

const VALID_PAYMENTS = new Set(["paypal", "stripe", "klarna", "sepa"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orderRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 10, keyPrefix: "orders:" });
const duplicateGuard = createDuplicateGuard(60_000);

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

function validateCouponForOrder() {
  return {
    valid: false,
    discount: null,
    status: "BLOCKED",
    commercial: false,
    callerFlagIgnored: true,
    code: "COUPON_UNVERIFIED",
  };
}

function resolveLine(productId, variantIds, qty) {
  if (!isSafeId(productId)) return null;
  const products = loadProducts();
  const product = products.get(productId);
  if (!product) return null;

  const safeVariantIds = (variantIds || []).filter((id) => isSafeId(id));
  const selected = (product.variants || []).filter((v) => safeVariantIds.includes(v.id));
  const variantPrice = selected.find((v) => v.price && v.price.amount)?.price?.amount;
  const unitPrice = variantPrice ?? product.price.amount;
  const sku = selected.find((v) => v.sku)?.sku || product.sku;
  const stock = selected.find((v) => typeof v.stock === "number")?.stock ?? product.stock;
  const safeQty = Math.min(Math.max(Number(qty) || 0, 1), 99);
  if (stock < safeQty || product.stock_status === "out_of_stock") return null;

  const variantLabel = selected.map((v) => `${v.label}: ${v.value}`).join(", ");
  const lineTotal = Math.round(unitPrice * safeQty * 100) / 100;
  const vatRate = product.vat_rate;
  const vatAmount = Math.round((lineTotal - lineTotal / (1 + vatRate / 100)) * 100) / 100;

  return {
    productId: product.id,
    name: product.name,
    sku,
    supplierId: product.supplier_id || "SUP-INTERNAL-001",
    shippingClass: product.shipping?.class || "standard",
    variantIds: safeVariantIds,
    variantLabel,
    qty: safeQty,
    unitPrice,
    lineTotal,
    vatRate,
    vatAmount,
    imageKey: product.attributes?.image_key,
  };
}

function attachShipments(order) {
  const clone = sanitizePublicOrder(order);
  clone.shipments = fulfillmentStore
    .listShipmentsForOrder(order.orderNumber)
    .map(fulfillmentStore.sanitizeShipment);
  const tracked = clone.shipments.find((s) => s.trackingNumber);
  if (tracked) {
    clone.trackingNumber = tracked.trackingNumber;
    clone.trackingCarrier = tracked.carrier;
  }
  return clone;
}

function calculateQuote(lines, shippingMethodId, couponCode, country) {
  const { isSalesEnabled } = require("../lib/salesMode");
  if (!isSalesEnabled()) {
    return {
      errorKey: "SALES_CLOSED",
      code: "SALES_CLOSED",
      discount: null,
      total: null,
      taxBase: null,
      vatAmount: null,
      commercialEligibility: "BLOCKED",
      couponApplied: false,
      couponStatus: couponCode ? "BLOCKED" : "UNKNOWN",
      orderCreated: false,
      invented: false,
    };
  }
  const resolved = [];
  for (const line of lines) {
    const priced = resolveLine(line.productId, line.variantIds || [], line.qty);
    if (!priced) return null;
    resolved.push(priced);
  }

  const subtotal = resolved.reduce((sum, line) => sum + line.lineTotal, 0);
  validateCouponForOrder();
  const discount = null;
  const discountedSubtotal = subtotal;
  const products = loadProducts();
  const shippingResult = calculateShipping({
    lines: resolved.map((line) => ({
      productId: line.productId,
      qty: line.qty,
      shippingClass: line.shippingClass,
    })),
    methodId: shippingMethodId,
    country,
    subtotal: discountedSubtotal,
    productsById: products,
  });
  if (!shippingResult.ok || shippingResult.commercialEligibility !== "ELIGIBLE" || shippingResult.shipping == null) {
    return {
      errorKey: "SHIPPING_RATE_UNVERIFIED",
      shipping: null,
      commercialEligibility: "BLOCKED",
      total: null,
      invented: false,
    };
  }
  const shipping = shippingResult.shipping;
  const vatAmount = Math.round(resolved.reduce((sum, line) => sum + line.vatAmount, 0) * 100) / 100;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;

  return {
    currency: "EUR",
    lines: resolved,
    subtotal,
    shipping,
    discount,
    couponApplied: false,
    couponStatus: couponCode ? "BLOCKED" : "UNKNOWN",
    vatAmount,
    total,
    freeShippingRemaining: shippingResult.freeShippingRemaining ?? 0,
    shippingMethodId,
    couponCode: null,
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
  delete clone.paymentTransactionId;
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
  if (body.clientPaymentStatus && body.clientPaymentStatus !== "pending") return "invalid_payment_state";
  return null;
}

function buildDuplicateKey(body, quote) {
  const email = normalizeText(body.customer.email, 254).toLowerCase();
  const lineKey = quote.lines.map((line) => `${line.productId}:${line.qty}`).join("|");
  return `${email}:${quote.total}:${lineKey}`;
}

module.exports = {
  register(app) {
    ensureDataDir();

    app.post("/api/checkout/quote", (req, res) => {
      const { lines, shippingMethodId = "standard", couponCode, country } = req.body || {};
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, errorKey: "checkout.errorRequired" });
      }
      const quote = calculateQuote(lines, shippingMethodId, couponCode, country);
      if (!quote) {
        return res.status(400).json({ success: false, errorKey: "checkout.stockError" });
      }
      if (quote.errorKey) {
        return res.status(400).json({ success: false, errorKey: quote.errorKey });
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

    app.post("/api/orders", async (req, res) => {
      const { requireSalesEnabled } = require("../lib/salesMode");
      if (!requireSalesEnabled(req, res)) return;

      if (process.env.BUZZARD_DB_ENABLED !== "0") {
        const body = req.body || {};
        const isGuestCheckout = Array.isArray(body.lines) && body.lines.length > 0;
        if (!isGuestCheckout) {
          const { extractToken, verifyToken } = require("../lib/dbAuth");
          const token = extractToken(req);
          if (token) {
            try {
              const user = verifyToken(token);
              const { createOrderFromCartWithPayment } = require("../lib/dbOrders");
              const result = await createOrderFromCartWithPayment(user.sub, {
                countryCode: String(body.countryCode || body.shippingAddress?.country || "DE").toUpperCase(),
                currency: body.currency || "EUR",
                shippingAddress: body.shippingAddress || {},
              });
              if (result.error) {
                return res.status(result.status || 400).json({ success: false, error: result.error });
              }
              return res.status(201).json({
                success: true,
                id: result.orderId,
                orderId: result.orderId,
                orderNumber: result.orderNumber,
                subtotal: result.subtotal,
                shipping: result.shipping,
                tax: result.tax,
                total: result.total,
                status: result.status,
                payment: result.payment,
              });
            } catch {
              return res.status(401).json({ success: false, errorKey: "account.auth.required" });
            }
          }
        }
      }

      if (orderRateLimit(req, { key: getClientIp(req) })) {
        return res.status(429).json({ success: false, errorKey: "security.rateLimited" });
      }

      const body = req.body || {};
      const validationError = validatePayload(body);
      if (validationError) {
        return res.status(400).json({ success: false, errorKey: "checkout.errorRequired" });
      }

      const country = body.shippingAddress?.country
        ? String(body.shippingAddress.country).toUpperCase()
        : undefined;
      const quote = calculateQuote(
        body.lines,
        body.shippingMethodId || "standard",
        body.couponCode,
        country
      );
      if (!quote) {
        return res.status(400).json({ success: false, errorKey: "checkout.stockError" });
      }
      if (quote.errorKey) {
        return res.status(400).json({ success: false, errorKey: quote.errorKey });
      }

      const duplicateKey = buildDuplicateKey(body, quote);
      if (duplicateGuard(duplicateKey)) {
        return res.status(409).json({ success: false, errorKey: "checkout.duplicateOrder" });
      }

      const orders = readOrders();
      const orderNumber = nextOrderNumber(orders);
      const payment = verifyPaymentIntent({
        provider: body.paymentProvider,
        orderNumber,
        amount: quote.total,
        currency: quote.currency,
      });
      if (!payment.ok || payment.demo === true || payment.live !== true || payment.captured !== true) {
        logSecurityEvent({
          type: "payment_verification_failed",
          success: false,
          ip: getClientIp(req),
          path: "/api/orders",
          detail: { provider: body.paymentProvider, orderNumber },
        });
        return res.status(402).json({ success: false, errorKey: payment.errorKey });
      }

      return res.status(409).json({
        success: false,
        errorKey: "PAYMENT_UNVERIFIED",
        code: "PAYMENT_UNVERIFIED",
        orderCreated: false,
      });
    });

    app.get("/api/orders/:orderNumber", (req, res) => {
      const orderNumber = decodeURIComponent(req.params.orderNumber || "");
      const order = readOrders().find((o) => o.orderNumber === orderNumber);
      if (!order) {
        return res.status(404).json({ success: false, errorKey: "checkout.orderNotFound" });
      }
      return res.json({ success: true, order: attachShipments(order) });
    });
  },
};
