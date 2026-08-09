// Commercial integration boundaries (Buzzard v0.5).
// Replace adapter methods with official SDK/API calls after credentials are configured.
// Secrets must remain server-side only.

const payments = {
  stripe: async ({ orderId, amount, currency }) => ({
    provider: "stripe",
    status: process.env.STRIPE_SECRET_KEY ? "configured" : "adapter_ready",
    orderId,
    amount,
    currency,
  }),
  paypal: async ({ orderId, amount, currency }) => ({
    provider: "paypal",
    status:
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "configured" : "adapter_ready",
    orderId,
    amount,
    currency,
  }),
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
    version: "0.5.0",
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
      configured: false,
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
};
