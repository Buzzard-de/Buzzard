const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getSession, extractToken } = require("../lib/customerAuth");
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
const fulfillmentPipeline = require("../lib/fulfillmentPipeline");
const fulfillmentStore = require("../lib/fulfillmentStore");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(__dirname, "..", "data");
const ordersFile = path.join(dataDir, "orders.json");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");

const COUPONS = {
  BUZZARD10: { type: "percent", value: 10, minSubtotal: 30 },
  WELCOME5: { type: "fixed", value: 5, minSubtotal: 25 },
};

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

function calculateQuote(lines, shippingMethodId, couponCode, country = "DE") {
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
  if (shippingResult.errorKey) return { errorKey: shippingResult.errorKey };
  const shipping = shippingResult.shipping ?? 0;
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
    freeShippingRemaining: shippingResult.freeShippingRemaining ?? 0,
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
      const { lines, shippingMethodId = "standard", couponCode, country = "DE" } = req.body || {};
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

      const country = String(body.shippingAddress?.country || "DE").toUpperCase();
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
      const now = new Date().toISOString();
      const customerSession = getSession(extractToken(req));

      const payment = verifyPaymentIntent({
        provider: body.paymentProvider,
        orderNumber,
        amount: quote.total,
        currency: quote.currency,
      });
      if (!payment.ok) {
        logSecurityEvent({
          type: "payment_verification_failed",
          success: false,
          ip: getClientIp(req),
          path: "/api/orders",
          detail: { provider: body.paymentProvider, orderNumber },
        });
        return res.status(402).json({ success: false, errorKey: payment.errorKey });
      }

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
          guest: body.customer.guest !== false && !customerSession,
        },
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingSameAsShipping ? body.shippingAddress : body.billingAddress,
        shippingMethodId: body.shippingMethodId || "standard",
        paymentProvider: body.paymentProvider,
        paymentStatus: "paid",
        paymentTransactionId: payment.transactionId,
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

      fulfillmentPipeline.createFulfillmentsForOrder(order, loadProducts());
      const shipments = fulfillmentStore.listShipmentsForOrder(orderNumber);
      const tracked = shipments.find((s) => s.trackingNumber);
      const orderIdx = orders.length - 1;
      orders[orderIdx].status = shipments.some((s) => s.status !== "pending") ? "processing" : "paid";
      if (tracked) {
        orders[orderIdx].trackingNumber = tracked.trackingNumber;
        orders[orderIdx].trackingCarrier = tracked.carrier;
      }
      writeOrders(orders);
      order.status = orders[orderIdx].status;
      order.trackingNumber = orders[orderIdx].trackingNumber;
      order.trackingCarrier = orders[orderIdx].trackingCarrier;

      logSecurityEvent({
        type: "order_created",
        success: true,
        ip: getClientIp(req),
        userId: customerSession?.customerId || null,
        path: "/api/orders",
        detail: { orderNumber, total: quote.total, demoPayment: Boolean(payment.demo) },
      });

      try {
        const automationEngine = require("../lib/automationEngine");
        const automationPayload = {
          orderNumber,
          email: order.customer.email,
          customerId: order.customerId,
          language: body.language || "de",
          marketingConsent: body.marketingConsent !== false,
          total: quote.total,
        };
        automationEngine.emit("new_order", automationPayload, { idempotencyKey: orderNumber });
        automationEngine.emit("payment_confirmed", automationPayload, { idempotencyKey: `pay:${orderNumber}` });
      } catch {
        /* automation is non-blocking */
      }

      return res.status(201).json({ success: true, order: attachShipments(order) });
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
