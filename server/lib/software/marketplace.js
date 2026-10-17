/**
 * Marketplace connector classification. Draft listings only. No live publish.
 */

const crypto = require("crypto");
const { CONNECTOR_STATUS } = require("./constants");
const { marketplaceDraft } = require("../pusat/integrations");
const { MARKETPLACE_CHANNELS } = require("./marketplaceChannels");

const CONNECTORS = Object.freeze(
  MARKETPLACE_CHANNELS.map((channel) => ({
    ...channel,
    status: channel.status === "mock_connector" ? CONNECTOR_STATUS.MOCK : CONNECTOR_STATUS.DRAFT,
  }))
);

const CHANNEL_REQUIRED_FIELDS = Object.freeze({
  amazon: ["sku", "price", "category"],
  ebay: ["sku", "price"],
  google_shopping: ["sku", "price"],
  tiktok_shop: ["sku", "price"],
  kaufland: ["sku", "price"],
  allegro: ["sku", "price"],
  bol: ["sku", "price"],
  cdiscount: ["sku", "price"],
  otto: ["sku", "price"],
  emag: ["sku", "price"],
  skroutz: ["sku", "price"],
});

function hashDraft(input) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        channel: input.channel || input.marketplace || "amazon",
        sku: String(input.sku || "").trim(),
        price: input.price == null ? null : Number(input.price),
        category: input.category || null,
        market: input.market || null,
      })
    )
    .digest("hex");
}

function classifyConnectors() {
  return CONNECTORS.map((c) => ({
    ...c,
    adapterExists: Boolean(c.existingModule),
    classificationOnly: !c.existingModule,
    live: false,
    published: false,
    credentialsConfigured: false,
    liveVerified: false,
    blocked: true,
    listingId: null,
    safeInterface: true,
    vendorContractDocumented: Boolean(c.existingModule),
    liveEndpoint: null,
    note: c.existingModule
      ? "No live marketplace credentials in this environment. Publish remains BLOCKED."
      : "Classification-only. Safe draft/publish-block interface exists. Vendor API contract is undocumented and not invented. Publish remains BLOCKED.",
  }));
}

function classify(id) {
  return classifyConnectors().find((c) => c.id === id) || {
    id,
    status: CONNECTOR_STATUS.NONE,
    adapterExists: false,
    classificationOnly: true,
    safeInterface: true,
    live: false,
    blocked: true,
    published: false,
    listingId: null,
  };
}

function requiredFields(channelId) {
  return CHANNEL_REQUIRED_FIELDS[channelId] || ["sku", "price"];
}

function validateDraftInput(input, channel) {
  const missing = [];
  for (const field of requiredFields(channel.id)) {
    const value = input[field];
    if (value == null || value === "") missing.push(field);
  }
  if (input.price != null && (!Number.isFinite(Number(input.price)) || Number(input.price) < 0)) {
    return { ok: false, reason: "PRICE_INVALID", missing };
  }
  if (input.currency != null && String(input.currency).trim() && String(input.currency).trim().toUpperCase() !== "EUR") {
    return { ok: false, reason: "CURRENCY_UNSUPPORTED", missing };
  }
  if (missing.length) {
    return { ok: false, reason: "MARKETPLACE_FIELDS_REQUIRED", missing };
  }
  return { ok: true, missing: [] };
}

function persistDraft(db, row) {
  if (!db) return row;
  const existing = db.prepare("SELECT * FROM software_marketplace_drafts WHERE input_hash = ?").get(row.input_hash);
  if (existing) return { ...existing, duplicate: true };
  db.prepare(
    `INSERT INTO software_marketplace_drafts(
      id, channel, sku, status, input_hash, published, listing_id, details_json
    ) VALUES(?,?,?,?,?,0,NULL,?)`
  ).run(row.id, row.channel, row.sku, row.status, row.input_hash, row.details_json);
  return { ...row, duplicate: false };
}

function draftListing(input = {}, db = null) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  if (input.forceError) {
    const classified = classifyMarketplaceError(input.forceError);
    return {
      ok: false,
      live: false,
      published: false,
      listingId: null,
      error: input.forceError,
      retryable: classified.retryable,
      errorClass: classified.code,
      channel: channel.id,
      adapterExists: channel.adapterExists,
    };
  }

  const validation = validateDraftInput(input, channel);
  if (!validation.ok) {
    return {
      ok: false,
      live: false,
      published: false,
      listingId: null,
      reason: validation.reason,
      missing: validation.missing,
      channel: channel.id,
      adapterExists: channel.adapterExists,
      classificationOnly: channel.classificationOnly,
    };
  }

  const draft = marketplaceDraft({
    channel: channel.id,
    sku: input.sku,
    category: input.category,
    price: input.price,
    stock: input.stock,
  });
  const inputHash = hashDraft(input);
  const persisted = persistDraft(db, {
    id: `smd_${crypto.randomBytes(8).toString("hex")}`,
    channel: channel.id,
    sku: String(input.sku || "").trim(),
    status: "DRAFT",
    input_hash: inputHash,
    details_json: JSON.stringify({
      price: input.price == null ? null : Number(input.price),
      category: input.category || null,
      market: input.market || null,
      inventedListingId: false,
    }),
  });

  return {
    ...draft,
    ok: true,
    connector: channel,
    published: false,
    live: false,
    listingId: null,
    inventedListingId: false,
    duplicate: Boolean(persisted.duplicate),
    draftId: persisted.id,
    adapterExists: channel.adapterExists,
    classificationOnly: channel.classificationOnly,
  };
}

function mapCategory(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  const source = String(input.sourceCategory || input.category || "").trim();
  if (!source) {
    return {
      ok: false,
      mapped: false,
      published: false,
      live: false,
      invented: false,
      channel: channel.id,
      reason: "CATEGORY_REQUIRED",
    };
  }
  return {
    ok: true,
    mapped: false,
    published: false,
    live: false,
    invented: false,
    channel: channel.id,
    sourceCategory: source,
    marketplaceCategoryId: null,
    note: "No vendor category map is invented. Unmapped source categories stay unpublished.",
  };
}

function transformListing(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  const validation = validateDraftInput(input, channel);
  if (!validation.ok) {
    return {
      ok: false,
      live: false,
      published: false,
      listingId: null,
      reason: validation.reason,
      missing: validation.missing,
      channel: channel.id,
    };
  }
  return {
    ok: true,
    live: false,
    published: false,
    listingId: null,
    channel: channel.id,
    payload: {
      sku: String(input.sku).trim(),
      price: Number(input.price),
      category: input.category || null,
      currency: "EUR",
    },
    categoryMap: mapCategory({ channel: channel.id, sourceCategory: input.category }),
    note: "Local listing transform only. Not submitted to a marketplace.",
  };
}

function publishListing(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  return {
    ok: false,
    published: false,
    live: false,
    listingId: null,
    inventedListingId: false,
    write: false,
    reason: "PUBLISH_BLOCKED",
    channel: channel.id,
    adapterExists: channel.adapterExists,
    classificationOnly: channel.classificationOnly,
    safeInterface: true,
    note: "Publish is never executed from this adapter. A draft is not a listing.",
  };
}

function createSafeAdapter(channelId) {
  const channel = classify(channelId);
  return {
    id: channel.id,
    name: channel.name,
    adapterExists: channel.adapterExists,
    classificationOnly: channel.classificationOnly,
    safeInterface: true,
    vendorContractDocumented: Boolean(channel.existingModule || channel.vendorContractDocumented),
    liveEndpoint: null,
    requiredFields: requiredFields(channel.id),
    validate(input = {}) {
      return validateDraftInput(input, channel);
    },
    draft(input = {}, db = null) {
      return draftListing({ ...input, channel: channel.id }, db);
    },
    transform(input = {}) {
      return transformListing({ ...input, channel: channel.id });
    },
    publish(input = {}) {
      return publishListing({ ...input, channel: channel.id });
    },
    importOrder(input = {}) {
      return importChannelOrder({ ...input, channel: channel.id });
    },
    syncStatus(input = {}) {
      return syncChannelStatus({ ...input, channel: channel.id });
    },
  };
}

function listSafeAdapters() {
  return CONNECTORS.map((connector) => createSafeAdapter(connector.id));
}

function importChannelOrder(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  return {
    ok: false,
    imported: false,
    live: false,
    channel: channel.id,
    reason: "ORDER_IMPORT_BLOCKED",
    adapterExists: channel.adapterExists,
    note: "Channel order import is a safe interface only. No live marketplace account is used.",
  };
}

function syncChannelStatus(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  return {
    ok: false,
    synced: false,
    live: false,
    channel: channel.id,
    reason: "STATUS_SYNC_BLOCKED",
    adapterExists: channel.adapterExists,
  };
}

const CHANNEL_AUTH_ENV = Object.freeze({
  amazon: ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET"],
  ebay: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],
  google_shopping: ["GOOGLE_MERCHANT_ID"],
  tiktok_shop: ["TIKTOK_SHOP_APP_KEY"],
  kaufland: ["KAUFLAND_CLIENT_KEY"],
  allegro: ["ALLEGRO_CLIENT_ID"],
  bol: ["BOL_CLIENT_ID"],
  cdiscount: ["CDISCOUNT_API_KEY"],
  otto: ["OTTO_CLIENT_ID"],
  emag: ["EMAG_API_KEY"],
  skroutz: ["SKROUTZ_API_KEY"],
});

function validateAuthConfig(channelId, env = process.env) {
  const channel = classify(channelId);
  const names = CHANNEL_AUTH_ENV[channel.id] || [`${String(channel.id).toUpperCase()}_API_KEY`];
  const requiredEnv = names.map((name) => ({ name, present: Boolean(env[name]) }));
  return {
    channel: channel.id,
    requiredEnv,
    credentialsPresent: requiredEnv.every((row) => row.present),
    configured: requiredEnv.every((row) => row.present),
    authTested: false,
    live: false,
    liveVerified: false,
    secretsIncluded: false,
    note: "Presence-only check. No live marketplace authentication is performed.",
  };
}

function classifyMarketplaceError(error) {
  const message = String(error?.message || error || "");
  if (/429|rate.?limit/i.test(message)) {
    return { code: "RATE_LIMIT", retryable: true, live: false, published: false };
  }
  if (/timeout|temporar|503|502|ECONNRESET/i.test(message)) {
    return { code: "TRANSIENT", retryable: true, live: false, published: false };
  }
  if (/401|403|unauthor|forbidden|auth/i.test(message)) {
    return { code: "AUTH", retryable: false, live: false, published: false };
  }
  return { code: "UNKNOWN", retryable: false, live: false, published: false };
}

function dryRunListing(input = {}, db = null) {
  return {
    ...draftListing(input, db),
    dryRun: true,
    published: false,
    live: false,
  };
}

function health() {
  const connectors = classifyConnectors();
  return {
    codeReady: true,
    liveReady: false,
    liveVerified: false,
    connectors,
    anyLive: false,
    adaptersPresent: connectors.filter((c) => c.adapterExists).length,
    classificationOnly: connectors.filter((c) => c.classificationOnly).length,
    safeInterfaces: connectors.filter((c) => c.safeInterface).length,
    anyPublished: false,
  };
}

module.exports = {
  CONNECTORS,
  CHANNEL_REQUIRED_FIELDS,
  classifyConnectors,
  classify,
  requiredFields,
  validateDraftInput,
  draftListing,
  transformListing,
  mapCategory,
  dryRunListing,
  validateAuthConfig,
  classifyMarketplaceError,
  CHANNEL_AUTH_ENV,
  publishListing,
  createSafeAdapter,
  listSafeAdapters,
  importChannelOrder,
  syncChannelStatus,
  health,
};
