// Commercial integration boundaries (Buzzard v0.5).
// Replace adapter methods with official SDK/API calls after credentials are configured.
// Secrets must remain server-side only.

const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "https://buzzard24.de").replace(/\/$/, "");

async function createStripeCheckoutSession({ orderId, amount, currency = "EUR", successUrl, cancelUrl }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return {
      provider: "stripe",
      status: "adapter_ready",
      orderId,
      amount,
      currency,
      checkoutUrl: null,
      hint: "Set STRIPE_SECRET_KEY to create live checkout sessions",
    };
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append(
    "success_url",
    successUrl || `${PUBLIC_BASE}/checkout/success/?order=${encodeURIComponent(String(orderId))}`
  );
  params.append("cancel_url", cancelUrl || `${PUBLIC_BASE}/checkout/`);
  params.append("line_items[0][price_data][currency]", String(currency).toLowerCase());
  params.append("line_items[0][price_data][unit_amount]", String(Math.round(Number(amount) * 100)));
  params.append("line_items[0][price_data][product_data][name]", `Buzzard Bestellung ${orderId}`);
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[orderId]", String(orderId));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Stripe checkout session failed");
  }

  return {
    provider: "stripe",
    status: "configured",
    orderId,
    amount,
    currency,
    sessionId: data.id,
    checkoutUrl: data.url,
  };
}

async function createPayPalOrder({ orderId, amount, currency = "EUR" }) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      provider: "paypal",
      status: "adapter_ready",
      orderId,
      amount,
      currency,
      approvalUrl: null,
      hint: "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET",
    };
  }

  const base =
    process.env.PAYPAL_ENV === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || "PayPal auth failed");
  }

  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(orderId),
          amount: {
            currency_code: currency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: `${PUBLIC_BASE}/checkout/success/?order=${encodeURIComponent(String(orderId))}`,
        cancel_url: `${PUBLIC_BASE}/checkout/`,
      },
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData.message || "PayPal order creation failed");
  }

  const approvalUrl = (orderData.links || []).find((link) => link.rel === "approve")?.href || null;
  return {
    provider: "paypal",
    status: "configured",
    orderId,
    amount,
    currency,
    paypalOrderId: orderData.id,
    approvalUrl,
  };
}

const payments = {
  stripe: async ({ orderId, amount, currency, successUrl, cancelUrl }) => {
    if (process.env.STRIPE_SECRET_KEY) {
      return createStripeCheckoutSession({ orderId, amount, currency, successUrl, cancelUrl });
    }
    return {
      provider: "stripe",
      status: "adapter_ready",
      orderId,
      amount,
      currency,
      checkoutUrl: null,
    };
  },
  paypal: async ({ orderId, amount, currency }) => {
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      return createPayPalOrder({ orderId, amount, currency });
    }
    return {
      provider: "paypal",
      status: "adapter_ready",
      orderId,
      amount,
      currency,
      approvalUrl: null,
    };
  },
  klarna: async ({ orderId, amount, currency }) => ({
    provider: "klarna",
    status:
      process.env.KLARNA_USERNAME && process.env.KLARNA_PASSWORD ? "configured" : "adapter_ready",
    orderId,
    amount,
    currency,
  }),
};

const carriers = {
  dhl: async ({ orderNumber, countryCode, weightKg, address }) => ({
    provider: "DHL",
    status: process.env.DHL_API_KEY ? "configured" : "adapter_ready",
    orderNumber,
    countryCode,
    weightKg,
    address,
    trackingNumber: null,
    labelUrl: null,
  }),
  dpd: async ({ orderNumber, countryCode, weightKg, address }) => ({
    provider: "DPD",
    status: process.env.DPD_API_KEY ? "configured" : "adapter_ready",
    orderNumber,
    countryCode,
    weightKg,
    address,
    trackingNumber: null,
    labelUrl: null,
  }),
  gls: async ({ orderNumber, countryCode, weightKg, address }) => ({
    provider: "GLS",
    status: process.env.GLS_API_KEY ? "configured" : "adapter_ready",
    orderNumber,
    countryCode,
    weightKg,
    address,
    trackingNumber: null,
    labelUrl: null,
  }),
  ups: async ({ orderNumber, countryCode, weightKg, address }) => ({
    provider: "UPS",
    status:
      process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET ? "configured" : "adapter_ready",
    orderNumber,
    countryCode,
    weightKg,
    address,
    trackingNumber: null,
    labelUrl: null,
  }),
};

async function calculateTax({ countryCode, netAmount, shipping = 0 }) {
  return calculateTaxSync(countryCode, netAmount, shipping);
}

function calculateTaxSync(countryCode, netAmount, shipping = 0) {
  if (process.env.TAX_PROVIDER_API_KEY && process.env.TAX_PROVIDER_URL) {
    return {
      countryCode,
      rate: null,
      tax: null,
      source: "provider_required",
      status: "tax_provider_configured",
    };
  }

  const indicativeRates = {
    DE: 0.19,
    FR: 0.2,
    NL: 0.21,
    PL: 0.23,
    ES: 0.21,
    IT: 0.22,
    GB: 0.2,
    CH: 0.081,
    TR: 0.2,
  };
  const rate = indicativeRates[countryCode] ?? 0.19;
  const taxable = Number(netAmount || 0) + Number(shipping || 0);
  return {
    countryCode,
    rate,
    tax: Number((taxable * rate).toFixed(2)),
    source: "placeholder",
  };
}

async function getExchangeRate({ from = "EUR", to = "EUR" }) {
  if (from === to) return { from, to, rate: 1, source: "internal" };
  if (process.env.FX_PROVIDER_URL) {
    return { from, to, rate: null, source: "provider_configured" };
  }
  return { from, to, rate: null, source: "provider_required" };
}

async function importSupplierFeed({ supplier, format, payload }) {
  return {
    supplier,
    format,
    payloadSize: payload ? JSON.stringify(payload).length : 0,
    status: process.env.SUPPLIER_API_KEY ? "configured" : "adapter_ready",
    importedProducts: 0,
    warning: "Supplier credentials and field mapping required",
  };
}

async function checkTecDocCompatibility({ vehicle, productSku }) {
  return {
    productSku,
    vehicle,
    compatible: null,
    status: process.env.TECDOC_API_KEY ? "configured" : "license_and_api_required",
  };
}

async function forwardDropshipOrder({ supplier, order }) {
  return {
    supplier,
    orderNumber: order?.orderNumber,
    status: process.env.SUPPLIER_API_KEY ? "configured" : "adapter_ready",
    supplierOrderId: null,
  };
}

function getIntegrationStatus() {
  return {
    version: "0.5.1",
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    payments: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      klarna: Boolean(process.env.KLARNA_USERNAME && process.env.KLARNA_PASSWORD),
    },
    carriers: {
      dhl: Boolean(process.env.DHL_API_KEY),
      dpd: Boolean(process.env.DPD_API_KEY),
      gls: Boolean(process.env.GLS_API_KEY),
      ups: Boolean(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET),
    },
    tax: Boolean(process.env.TAX_PROVIDER_API_KEY),
    fx: Boolean(process.env.FX_PROVIDER_URL),
    supplier: Boolean(process.env.SUPPLIER_API_KEY),
    tecdoc: Boolean(process.env.TECDOC_API_KEY),
    webhooks: {
      note: "Signed provider webhooks required before production",
      stripe: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
  };
}

module.exports = {
  payments,
  carriers,
  calculateTax,
  calculateTaxSync,
  getExchangeRate,
  importSupplierFeed,
  checkTecDocCompatibility,
  forwardDropshipOrder,
  getIntegrationStatus,
  createStripeCheckoutSession,
  createPayPalOrder,
};
