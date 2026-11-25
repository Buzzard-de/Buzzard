const { createHash } = require("node:crypto");
const { PLATFORMS, resolveAlias } = require("./catalog");
const { FAMILIES } = require("./families");
const { createClient, vintedSignature } = require("./client");
const { priceFromEngines, stockFromEngine } = require("./pricingGate");
const { startReturn } = require("../../logistics/v5/returnsEngine");

const LANGUAGE = Object.freeze({
  DE: "de-DE", AT: "de-AT", FR: "fr-FR", ES: "es-ES", IT: "it-IT",
  BE: "fr-BE", NL: "nl-NL", GB: "en-GB", PT: "pt-PT",
});

function blocked(code, extra = {}) {
  return { ok: false, code, live: false, network: false, productionReady: false, ...extra };
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readSecret(env, prefix, suffix) {
  if (!prefix) return "";
  return String(env[`${prefix}_${suffix}`] || "");
}

function credentials(platform, env) {
  const prefix = platform.envPrefix;
  const apiKey = readSecret(env, prefix, "API_KEY");
  const apiSecret = readSecret(env, prefix, "API_SECRET");
  const sellerId = readSecret(env, prefix, "SELLER_ID");
  const baseUrl = readSecret(env, prefix, "BASE_URL");
  const accessToken = readSecret(env, prefix, "ACCESS_TOKEN");
  const enabled = readSecret(env, prefix, "ENABLED") === "1";
  const configured = Boolean(apiKey || apiSecret || accessToken || sellerId);
  return { apiKey, apiSecret, sellerId, baseUrl, accessToken, enabled, configured };
}

function publicCredentials(creds) {
  return {
    apiKey: creds.apiKey ? "set" : "missing",
    apiSecret: creds.apiSecret ? "set" : "missing",
    sellerId: creds.sellerId ? "set" : "missing",
    accessToken: creds.accessToken ? "set" : "missing",
    baseUrl: creds.baseUrl || null,
    enabled: creds.enabled,
  };
}

function countryOf(platform, input) {
  const country = input.country || platform.countries[0];
  if (!platform.countries.includes(country)) return { ok: false, code: "COUNTRY_NOT_SUPPORTED" };
  return { ok: true, country, currency: platform.channels.find((row) => row.country === country)?.currency || null };
}

function fill(path, input) {
  return path
    .replace("{orderId}", encodeURIComponent(input.orderId || ""))
    .replace("{shopId}", encodeURIComponent(input.shopId || ""))
    .replace("{listingId}", encodeURIComponent(input.listingId || ""))
    .replace("{orderReference}", encodeURIComponent(input.orderReference || ""));
}

function mapOrder(platform, family, raw) {
  const externalOrderId = raw.order_id || raw.order_reference || raw.receipt_id || raw.id || raw.code;
  if (externalOrderId == null || externalOrderId === "") return blocked("ORDER_ID_MISSING");
  const remoteStatus = raw.order_state || raw.status || null;
  const table = family.orderStatus || {};
  let buzzardStatus = table[remoteStatus] || "UNKNOWN";
  if (platform.family === "etsy") {
    if (raw.was_shipped === true) buzzardStatus = "SHIPPED";
    else if (raw.is_paid === true) buzzardStatus = "PAID";
  }
  return {
    ok: true,
    externalOrderId: String(externalOrderId),
    platformId: platform.id,
    remoteStatus,
    buzzardStatus,
    lines: raw.order_lines || raw.lines || raw.transactions || [],
    currency: raw.currency_iso_code || raw.currency || null,
    persisted: false,
    orderCreated: false,
    customerWritten: false,
    live: false,
    network: false,
  };
}

function createEuropeAdapter(platformId, { env = process.env, transport = null, now, sleep, limits } = {}) {
  const platform = typeof platformId === "string" && !PLATFORMS.some((row) => row.id === platformId)
    ? resolveAlias(platformId)
    : PLATFORMS.find((row) => row.id === platformId);
  if (!platform) return { ok: false, code: "PLATFORM_UNKNOWN", live: false, network: false };
  const family = FAMILIES[platform.family];
  const creds = credentials(platform, env);
  const logs = [];
  const seenOrders = new Set();
  const client = createClient({
    transport,
    now,
    sleep,
    logs,
    limits: limits || family.limits || {},
  });

  function health() {
    return {
      id: platform.id,
      officialName: platform.officialName,
      kind: platform.kind,
      sellerAccepted: platform.sellerAccepted,
      status: platform.status,
      family: platform.family,
      countries: platform.countries,
      channels: platform.channels,
      source: platform.source,
      notes: platform.notes,
      credentials: publicCredentials(creds),
      operations: Object.keys(family.operations || {}),
      unsupported: family.unsupported || {},
      live: false,
      network: false,
      productionReady: false,
      salesEnabled: false,
    };
  }

  function requireReady(input) {
    if (env.EUROPE_MARKETPLACE_LIVE === "1") return blocked("LIVE_CALLS_FORBIDDEN");
    if (platform.family === "existing") return blocked("EXISTING_CONNECTOR_UNTOUCHED");
    if (platform.family === "closed") {
      const code = {
        SELLER_ACCESS_REQUIRED: "SELLER_ACCESS_REQUIRED",
        RESEARCH_REQUIRED: "ENDPOINT_NOT_VERIFIED",
        NO_OFFICIAL_API: "NO_OFFICIAL_API",
        NOT_ELIGIBLE: "NOT_ELIGIBLE",
      }[platform.status] || "ENDPOINT_NOT_VERIFIED";
      return blocked(code, { status: platform.status, source: platform.source });
    }
    if (platform.family === "fileExchange") return blocked("FILE_EXCHANGE_ONLY", { source: platform.source });
    const country = countryOf(platform, input);
    if (!country.ok) return blocked(country.code);
    if (!creds.configured) return blocked("CREDENTIALS_MISSING");
    if (!creds.enabled) return blocked("CONNECTOR_DISABLED");
    if (platform.family === "mirakl" && !creds.apiKey) return blocked("CREDENTIALS_MISSING");
    if (platform.family === "mirakl" && !creds.baseUrl) return blocked("BASE_URL_REQUIRED");
    if (platform.family === "etsy" && (!creds.apiKey || !creds.apiSecret)) return blocked("CREDENTIALS_MISSING");
    if (platform.family === "backmarket" && !creds.sellerId) return blocked("USER_AGENT_REQUIRED");
    if (platform.family === "vinted" && !creds.accessToken) return blocked("CREDENTIALS_MISSING");
    return { ok: true, country };
  }

  async function dispatch(operation, input, request) {
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    const sent = await client.send({
      ...request,
      group: request.group || operation,
      idempotencyKey: request.idempotencyKey || digest([platform.id, operation, request.path, request.body || null]),
    });
    return { ...sent, platformId: platform.id, country: ready.country.country, live: false, network: false };
  }

  function hostFor(operation) {
    const spec = family.operations[operation];
    if (spec.baseUrl) return spec.baseUrl;
    if (creds.baseUrl) return creds.baseUrl.replace(/\/$/, "");
    if (family.baseUrl) return family.baseUrl;
    if (family.hosts) {
      const mode = readSecret(env, platform.envPrefix, "ENV") === "production" ? "production" : "stage";
      return family.hosts[mode];
    }
    return null;
  }

  async function pricedOffer(input) {
    const price = priceFromEngines(input);
    if (!price.ok) return price;
    const stock = stockFromEngine(input);
    if (!stock.ok) return stock;
    return { ok: true, price, stock };
  }

  async function updateOffer(input = {}) {
    if (platform.family === "existing" || platform.family === "closed" || platform.family === "fileExchange") {
      return requireReady(input);
    }
    if (family.unsupported && family.unsupported.updateOffer) return blocked(family.unsupported.updateOffer);
    if (platform.family !== "mirakl") return blocked("OFFER_PATH_NOT_AVAILABLE");
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    const priced = await pricedOffer(input);
    if (!priced.ok) return { ...priced, live: false, network: false };
    const sku = String(input.sku || "").trim();
    const productId = String(input.productId || input.ean || "").trim();
    if (!sku || !productId) return blocked("PRODUCT_IDENTITY_MISSING");
    if (!input.stateCode) return blocked("OFFER_STATE_REQUIRED");
    const base = hostFor("updateOffer");
    if (!base) return blocked("BASE_URL_REQUIRED");
    const body = {
      offers: [{
        shop_sku: sku,
        product_id: productId,
        product_id_type: input.productIdType || "EAN",
        price: priced.price.salePrice,
        quantity: priced.stock.quantity,
        state_code: input.stateCode,
        update_delete: "update",
        description: input.description || undefined,
      }],
    };
    return dispatch("updateOffer", input, {
      method: "POST",
      path: "/api/offers",
      url: `${base}/api/offers`,
      body,
      headers: { Authorization: creds.apiKey, "Content-Type": "application/json" },
      group: "offers",
    });
  }

  async function importProducts(input = {}) {
    if (!family.operations.importProducts) return blocked(family.unsupported?.createProduct || "PRODUCT_CREATE_PATH_NOT_CAPTURED");
    if (!input.operatorFile) return blocked("OPERATOR_CATEGORY_TEMPLATE_REQUIRED");
    const base = hostFor("importProducts");
    if (!base) return blocked("BASE_URL_REQUIRED");
    return dispatch("importProducts", input, {
      method: "POST",
      path: "/api/products/imports",
      url: `${base}/api/products/imports`,
      contentType: "multipart/form-data",
      body: { file: input.operatorFile },
      headers: { Authorization: creds.apiKey },
      group: "products",
    });
  }

  async function createEtsyListing(input = {}) {
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    if (!input.shopId || !input.taxonomyId || !input.whoMade || !input.whenMade || !input.title || !input.description) {
      return blocked("LISTING_FIELDS_REQUIRED");
    }
    const price = priceFromEngines(input);
    if (!price.ok) return { ...price, live: false, network: false };
    const stock = stockFromEngine(input);
    if (!stock.ok) return { ...stock, live: false, network: false };
    const path = `/v3/application/shops/${encodeURIComponent(input.shopId)}/listings`;
    const body = {
      quantity: stock.quantity,
      title: input.title,
      description: input.description,
      price: price.salePrice,
      who_made: input.whoMade,
      when_made: input.whenMade,
      taxonomy_id: input.taxonomyId,
      type: input.listingType || "physical",
    };
    return dispatch("createListing", input, {
      method: "POST",
      path,
      url: `https://api.etsy.com${path}`,
      body,
      headers: { "x-api-key": `${creds.apiKey}:${creds.apiSecret}`, "Content-Type": "application/json" },
      group: "write",
    });
  }

  async function createVintedItems(input = {}) {
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length < 1 || items.length > 100) return blocked("BATCH_SIZE_INVALID");
    const mapped = [];
    for (const item of items) {
      const price = priceFromEngines({ ...input, ...item, country: input.country });
      if (!price.ok) return { ...price, live: false, network: false };
      if (!item.brand || !item.catalogId || !item.title || !item.description || !item.packageSizeId || !Array.isArray(item.photoUrls) || item.photoUrls.length < 1) {
        return blocked("CATEGORY_MAPPING_REQUIRED");
      }
      mapped.push({
        brand: item.brand,
        catalog_id: item.catalogId,
        currency: ready.country.currency,
        description: item.description,
        package_size_id: item.packageSizeId,
        photo_urls: item.photoUrls,
        price: price.salePrice,
        title: item.title,
        item_reference: item.itemReference || item.sku,
        is_draft: true,
      });
    }
    const path = "/api/v1/items";
    const rawBody = JSON.stringify({ items: mapped });
    const token = creds.accessToken.split(",");
    if (token.length !== 2 || !token[0] || !token[1]) return blocked("ACCESS_TOKEN_INVALID");
    const timestamp = Math.floor((now ? now() : Date.now()) / 1000);
    const signature = vintedSignature({
      timestamp,
      method: "POST",
      path,
      accessKey: token[0],
      rawBody,
      signingKey: token[1],
    });
    const base = hostFor("createItems");
    return dispatch("createItems", input, {
      method: "POST",
      path,
      url: `${base}${path}`,
      body: rawBody,
      headers: {
        "X-Vpi-Access-Key": token[0],
        "X-Vpi-Hmac-Sha256": signature,
        "Content-Type": "application/json",
      },
      group: "write",
    });
  }

  async function readOrders(input = {}) {
    if (platform.family === "existing" || platform.family === "closed" || platform.family === "fileExchange") {
      return requireReady(input);
    }
    const spec = family.operations.readOrders;
    if (!spec) return blocked(family.unsupported?.readOrders || "ORDER_READ_PATH_NOT_CAPTURED");
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    if (platform.family === "refurbed") {
      if (!creds.baseUrl) return blocked("SANDBOX_HOST_REQUIRED");
      if (creds.baseUrl.includes("api.refurbed.com")) return blocked("PRODUCTION_HOST_BLOCKED");
      return dispatch("readOrders", input, {
        protocol: "grpc",
        method: "POST",
        path: "/refb.merchant.v1.OrderService/ListOrders",
        url: creds.baseUrl,
        body: { service: "OrderService", methodName: "ListOrders" },
        headers: { Authorization: `Plain ${creds.apiKey}` },
        group: "orders",
      });
    }
    if (platform.family === "alza" && !creds.baseUrl) return blocked("BASE_URL_REQUIRED");
    const path = fill(spec.path, input);
    const base = hostFor("readOrders");
    if (!base) return blocked("BASE_URL_REQUIRED");
    return dispatch("readOrders", input, {
      method: spec.method,
      path,
      url: `${base}${path}`,
      headers: authHeaders(input),
      group: "orders",
    });
  }

  function authHeaders(input) {
    if (platform.family === "mirakl") return { Authorization: creds.apiKey };
    if (platform.family === "etsy") return { "x-api-key": `${creds.apiKey}:${creds.apiSecret}` };
    if (platform.family === "backmarket") {
      return {
        Authorization: `Basic ${creds.apiKey}`,
        "Accept-Language": LANGUAGE[input.country] || LANGUAGE[platform.countries[0]] || "fr-FR",
        "User-Agent": creds.sellerId,
      };
    }
    if (platform.family === "manomano") return { "x-api-key": creds.apiKey };
    if (platform.family === "shoepping") return { Authorization: `Basic ${creds.apiKey}` };
    if (platform.family === "alza") return { Authorization: `Bearer ${creds.apiKey}` };
    return {};
  }

  function ingestOrder(raw = {}) {
    if (platform.family === "existing" || platform.family === "closed" || platform.family === "fileExchange") {
      return requireReady({});
    }
    const draft = mapOrder(platform, family, raw);
    if (!draft.ok) return draft;
    const key = `${platform.id}:${draft.externalOrderId}`;
    if (seenOrders.has(key)) return blocked("DUPLICATE_ORDER", { externalOrderId: draft.externalOrderId, persisted: false, orderCreated: false });
    seenOrders.add(key);
    return draft;
  }

  function ingestReturn(raw = {}) {
    const draft = ingestOrder(raw);
    if (!draft.ok) return draft;
    const started = startReturn({ shipmentId: draft.externalOrderId });
    return { ...draft, return: started, refundIssued: false, labelIssued: false };
  }

  async function ship(input = {}) {
    const operation = platform.family === "mirakl" ? "updateTracking" : platform.family === "manomano" ? "createShipment" : platform.family === "vinted" ? "readShipment" : platform.family === "shoepping" ? "updateOrder" : null;
    if (!operation || !family.operations[operation]) return blocked(family.unsupported?.updateTracking || "TRACKING_PATH_NOT_CAPTURED");
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    if (platform.family === "vinted") {
      return blocked("PLATFORM_LABEL_NOT_CREATED", { path: "/api/v1/orders/{orderId}/shipment", labelIssued: false });
    }
    const spec = family.operations[operation];
    const path = fill(spec.path, input);
    let body;
    if (platform.family === "mirakl") {
      if (!input.orderId || !input.carrierCode || !input.trackingNumber) return blocked("TRACKING_FIELDS_MISSING");
      body = { carrier_code: input.carrierCode, tracking_number: input.trackingNumber };
    } else if (platform.family === "manomano") {
      if (!input.orderReference || !input.trackingNumber || !input.carrier || input.sellerContractId == null || !Array.isArray(input.products) || input.products.length === 0) {
        return blocked("TRACKING_FIELDS_MISSING");
      }
      body = [{
        carrier: input.carrier,
        order_reference: input.orderReference,
        seller_contract_id: input.sellerContractId,
        tracking_number: input.trackingNumber,
        tracking_url: input.trackingUrl,
        products: input.products,
      }];
    } else if (!input.operatorXml) {
      return blocked("SHOEPPING_UPDATE_BODY_IS_XML");
    } else {
      body = input.operatorXml;
    }
    const base = hostFor(operation);
    return dispatch(operation, input, {
      method: spec.method,
      path,
      url: `${base}${path}`,
      body,
      headers: { ...authHeaders(input), "Content-Type": "application/json" },
      group: "offers",
    });
  }

  async function cancel(input = {}) {
    if (!family.operations.cancelOrder && !family.operations.refuseOrders) {
      return blocked(family.unsupported?.cancelOrder || "NOT_IN_CAPTURED_DOC");
    }
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    const operation = family.operations.cancelOrder ? "cancelOrder" : "refuseOrders";
    const spec = family.operations[operation];
    const path = fill(spec.path, input);
    const base = hostFor(operation);
    return dispatch(operation, input, {
      method: spec.method,
      path,
      url: `${base}${path}`,
      body: platform.family === "mirakl" ? "" : input.body || {},
      headers: { ...authHeaders(input), "Content-Length": platform.family === "mirakl" ? "0" : undefined },
      group: "offers",
    });
  }

  async function refund(input = {}) {
    if (!family.operations.refund) return blocked(family.unsupported?.refund || "NOT_IN_CAPTURED_DOC");
    const ready = requireReady(input);
    if (!ready.ok) return ready;
    const local = ingestReturn({ ...input, order_id: input.orderId, order_reference: input.orderReference });
    if (!local.ok && local.code !== "DUPLICATE_ORDER") return local;
    const spec = family.operations.refund;
    const path = fill(spec.path, input);
    const base = hostFor("refund");
    if (platform.family === "mirakl" && (!Array.isArray(input.refunds) || input.refunds.length === 0)) {
      return blocked("REFUND_FIELDS_MISSING");
    }
    if (platform.family !== "mirakl" && !input.body) return blocked("REFUND_FIELDS_MISSING");
    const sent = await dispatch("refund", input, {
      method: spec.method,
      path,
      url: `${base}${path}`,
      body: platform.family === "mirakl" ? { refunds: input.refunds } : input.body,
      headers: { ...authHeaders(input), "Content-Type": "application/json" },
      group: "offers",
    });
    return { ...sent, refundIssued: false, labelIssued: false, return: local.return || startReturn({ shipmentId: input.orderId || "UNKNOWN" }) };
  }

  return {
    ok: true,
    id: platform.id,
    health,
    logs: () => logs.slice(),
    updateOffer,
    importProducts,
    createEtsyListing,
    createVintedItems,
    readOrders,
    ingestOrder,
    ingestReturn,
    ship,
    cancel,
    refund,
  };
}

function listEuropePlatforms() {
  return PLATFORMS.map((platform) => createEuropeAdapter(platform.id).health());
}

module.exports = { createEuropeAdapter, listEuropePlatforms, resolveAlias };
