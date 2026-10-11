/**
 * Marketplace connector classification. Draft listings only. No live publish.
 */

const crypto = require("crypto");
const { CONNECTOR_STATUS } = require("./constants");
const { marketplaceDraft } = require("../pusat/integrations");

const CONNECTORS = Object.freeze([
  { id: "amazon", name: "Amazon", status: CONNECTOR_STATUS.MOCK, existingModule: "marketplaceHub + pusat.integrations" },
  { id: "ebay", name: "eBay", status: CONNECTOR_STATUS.MOCK, existingModule: "marketplaceHub" },
  { id: "google_shopping", name: "Google Shopping", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceHub" },
  { id: "tiktok_shop", name: "TikTok Shop", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceHub" },
  { id: "kaufland", name: "Kaufland", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceV35" },
  { id: "allegro", name: "Allegro", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceV35" },
  { id: "bol", name: "bol.com", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "cdiscount", name: "Cdiscount", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "otto", name: "OTTO", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "emag", name: "eMAG", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "skroutz", name: "Skroutz", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
]);

const CHANNEL_REQUIRED_FIELDS = Object.freeze({
  amazon: ["sku", "price", "category"],
  ebay: ["sku", "price"],
  google_shopping: ["sku", "price"],
  tiktok_shop: ["sku", "price"],
  kaufland: ["sku", "price"],
  allegro: ["sku", "price"],
  bol: ["sku"],
  cdiscount: ["sku"],
  otto: ["sku"],
  emag: ["sku"],
  skroutz: ["sku"],
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
    note: c.existingModule
      ? "No live marketplace credentials in this environment. Publish remains BLOCKED."
      : "Classification-only. Dedicated adapter does not exist. Publish remains BLOCKED.",
  }));
}

function classify(id) {
  return classifyConnectors().find((c) => c.id === id) || {
    id,
    status: CONNECTOR_STATUS.NONE,
    adapterExists: false,
    classificationOnly: true,
    live: false,
    blocked: true,
    published: false,
    listingId: null,
  };
}

function requiredFields(channelId) {
  return CHANNEL_REQUIRED_FIELDS[channelId] || ["sku"];
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
    return {
      ok: false,
      live: false,
      published: false,
      listingId: null,
      error: input.forceError,
      retryable: input.retryable === true,
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
  health,
};
