import { createHmac, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createEuropeAdapter, listEuropePlatforms } = require("../lib/marketplace/europe/adapter");
const { vintedSignature } = require("../lib/marketplace/europe/client");
const { PLATFORMS } = require("../lib/marketplace/europe/catalog");

const NAMES = `
Amazon, eBay, Kaufland Global Marketplace, Allegro, bol, Cdiscount, OTTO, eMAG, Skroutz, Alza, Galaxus, PcComponentes, Empik, Worten, CDON, Fnac Darty, MediaMarkt Marketplace, ManoMano, Decathlon Marketplace, Zalando, Morele.net, Ricardo, Etsy, Back Market, Fruugo, Rakuten France, Carrefour Marketplace, Leroy Merlin Marketplace, La Redoute, ABOUT YOU, Spartoo, Vinted, Temu, SHEIN Marketplace, TikTok Shop, Conrad Marketplace, Reverb, Wish, Alibaba.com, AliExpress,
OTTO, Kaufland, MediaMarkt Marketplace, Saturn, Zalando, ABOUT YOU, Galaxus Deutschland, Conrad, Limango, Hood.de, Avocadostore, Douglas Marketplace, Hornbach, Bauhaus, OBI, Etsy, Kleinanzeigen,
Amazon.at, willhaben, Shöpping.at, Universal.at, XXXLutz, MediaMarkt Österreich, Kaufland, Alza, eBay.at,
Galaxus, Digitec, Ricardo, Manor, Migros, Coop, Brack.ch, Ochsner Sport, Zalando Schweiz,
Cdiscount, Fnac, Darty, Rakuten France, ManoMano, La Redoute, Leroy Merlin, Carrefour, Boulanger, Rue du Commerce, Ubaldi, Pixmania, MacWay, Veepee, Leboncoin, Spartoo, Decathlon, Back Market, Vinted, Etsy,
bol, Amazon.nl, Coolblue, Wehkamp, Blokker, VidaXL, Marktplaats, Praxis, Leen Bakker, HEMA, Zalando, Vinted,
bol, Amazon.com.be, Coolblue, 2dehands, MediaMarkt, Vanden Borre, Krëfel, Carrefour Belgium, Brico, Fnac Belgium, Zalando,
Allegro, Empik, Morele.net, OLX Polska, Amazon.pl, Media Expert, RTV Euro AGD, Erli, Ceneo, Kaufland.pl, Decathlon, Modivo,
Alza, Mall.cz, Allegro.cz, Heureka, Aukro, Datart, Rohlik, Kaufland.cz,
Alza.sk, Mall.sk, Heureka.sk, Allegro.sk, Kaufland.sk, Nay.sk,
eMAG.hu, Allegro.hu, Alza.hu, Pepita, Vatera, MediaMarkt, Extreme Digital,
eMAG, OLX.ro, Altex, Flanco, Fashion Days, Elefant, CEL.ro,
eMAG.bg, Ozone.bg, Technopolis, OLX.bg, Fashion Days, Pazaruvaj,
Njuškalo, Mall.hr, eKupi, Sancta Domenica,
Mimovrste, Bolha, eCipele, Merkur,
KupujemProdajem, Ananas, Limundo, Gigatron,
Amazon.it, eBay.it, ePRICE, Unieuro, MediaWorld, ManoMano, Leroy Merlin, Decathlon, Zalando, Subito, IBS, La Redoute, Vinted, Etsy,
Amazon.es, PcComponentes, El Corte Inglés, Worten, MediaMarkt, Carrefour, Leroy Merlin, ManoMano, Miravia, Tradeinn, Privalia, Wallapop, Vinted, Decathlon, Zalando,
Worten, Fnac Portugal, Amazon.es üzerinden sınır ötesi satış, KuantoKusta, OLX Portugal, PCDIGA, Continente, Decathlon, Vinted,
Skroutz, Public.gr, BestPrice, Plaisio, Shopflix, Vendora,
Bazaraki, Public Cyprus, Stephanis, Electroline, Skroutz,
CDON, Amazon.se, Elgiganten, Boozt, Fyndiq, Tradera, Åhléns,
CDON, Boozt, Elgiganten, Matas, Bilka, Proshop, DBA,
FINN, CDON, Elkjøp, Komplett, Boozt, Zalando,
CDON, Verkkokauppa.com, Gigantti, Tori.fi, Prisma, Zalando,
Pigu.lt, Varle.lt, 1a.lt,
220.lv, 1a.lv, RD Electronics,
Kaup24, Hansapost, Osta.ee, 1a.ee,
Amazon UK, eBay UK, OnBuy, Etsy, ASOS Marketplace, Fruugo, ManoMano UK, Wayfair UK, B&Q Marketplace, Argos, TikTok Shop UK, Vinted UK, Depop, Back Market, Very, Dunelm, Screwfix,
Adverts.ie, DoneDeal, Brown Thomas, Littlewoods Ireland,
eBay Motors, Daparto, Oscaro, Motointegrator,
MediaMarkt, Saturn, Morele.net, PcComponentes, Alza, Galaxus, Conrad,
ManoMano, Leroy Merlin, OBI, Hornbach, Bauhaus, Brico,
Zalando, ABOUT YOU, Spartoo, La Redoute, Modivo, Vinted,
Decathlon, Sportano, Tradeinn, Ochsner Sport,
OTTO, Wayfair, XXXLutz, Home24, VidaXL,
Fnac, Empik, Thalia, IBS, bol,
Back Market, Refurbed,
Zooplus, Bitiba, Fressnapf,
Reverb, Thomann, Bax Music
`.split(/[,\n]/).map((name) => name.trim()).filter(Boolean);

function saveEnv() {
  return Object.fromEntries(Object.keys(process.env).filter((key) => key.startsWith("EUROPE_")).map((key) => [key, process.env[key]]));
}

function restoreEnv(saved) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("EUROPE_")) delete process.env[key];
  }
  Object.assign(process.env, saved);
}

function useEnv(values) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("EUROPE_")) delete process.env[key];
  }
  Object.assign(process.env, values);
}

function costs(overrides = {}) {
  return {
    supplierCost: 10,
    shipping: 1,
    marketplaceCommission: 1,
    vat: 1,
    returnReserve: 0.2,
    paymentFees: 0.3,
    ...overrides,
  };
}

function offer(overrides = {}) {
  return {
    country: "DE",
    sku: "BZ-1",
    productId: "4006381333931",
    stateCode: "NEW",
    quantity: 4,
    updatedAt: Date.now(),
    description: "Front disc",
    costs: costs(),
    ...overrides,
  };
}

describe("europe marketplace adapters", () => {
  let saved;
  afterEach(() => restoreEnv(saved));

  it("covers every named platform once", () => {
    saved = saveEnv();
    const missing = NAMES.filter((name) => !createEuropeAdapter(name).health);
    expect(missing).toEqual([]);
    expect(new Set(NAMES).size).toBeGreaterThan(120);
    expect(PLATFORMS.every((row) => row.live !== true)).toBe(true);
    expect(listEuropePlatforms().every((row) => row.live === false && row.network === false && row.productionReady === false)).toBe(true);
  });

  it("does not call transport without credentials or when live calls are forced", async () => {
    saved = saveEnv();
    useEnv({});
    let calls = 0;
    const adapter = createEuropeAdapter("mediamarkt", { transport: async () => { calls += 1; return { status: 200, body: {} }; } });
    const missing = await adapter.updateOffer(offer());
    expect(missing.code).toBe("CREDENTIALS_MISSING");
    useEnv({
      EUROPE_MARKETPLACE_LIVE: "1",
      EUROPE_MEDIAMARKT_API_KEY: randomBytes(8).toString("hex"),
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    });
    const forced = await createEuropeAdapter("mediamarkt", { transport: async () => { calls += 1; return { status: 200, body: {} }; } }).updateOffer(offer());
    expect(forced.code).toBe("LIVE_CALLS_FORBIDDEN");
    expect(calls).toBe(0);
  });

  it("maps a Mirakl offer from the pricing and stock engines and hides the key", async () => {
    saved = saveEnv();
    const apiKey = randomBytes(12).toString("hex");
    useEnv({
      EUROPE_MEDIAMARKT_API_KEY: apiKey,
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    });
    const seen = [];
    const adapter = createEuropeAdapter("mediamarkt", {
      limits: { offers: 10 },
      transport: async (request) => {
        seen.push(request);
        return { status: 201, body: { import_id: 9 } };
      },
    });
    const result = await adapter.updateOffer(offer());
    expect(result.ok).toBe(true);
    expect(result.live).toBe(false);
    expect(seen[0].path).toBe("/api/offers");
    expect(seen[0].url).toBe("https://merchant.example.test/api/offers");
    expect(seen[0].body.offers[0].shop_sku).toBe("BZ-1");
    expect(seen[0].body.offers[0].quantity).toBe(4);
    expect(seen[0].body.offers[0].price).toBeGreaterThan(0);
    expect(seen[0].body.offers[0].state_code).toBe("NEW");
    const again = await adapter.updateOffer(offer());
    expect(again.duplicate).toBe(true);
    expect(seen).toHaveLength(1);
    expect(JSON.stringify(adapter.logs())).not.toContain(apiKey);
    expect(adapter.health().credentials.apiKey).toBe("set");
  });

  it("blocks an unverified price and stale stock before transport", async () => {
    saved = saveEnv();
    useEnv({
      EUROPE_MEDIAMARKT_API_KEY: randomBytes(8).toString("hex"),
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    });
    let calls = 0;
    const adapter = createEuropeAdapter("mediamarkt", { transport: async () => { calls += 1; return { status: 200, body: {} }; } });
    const price = await adapter.updateOffer(offer({ costs: costs({ marketplaceCommission: undefined }) }));
    expect(price.code).toBe("PRICING_NOT_VERIFIED");
    const stale = await adapter.updateOffer(offer({ updatedAt: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(stale.code).toBe("STALE_STOCK");
    expect(calls).toBe(0);
  });

  it("maps an order and rejects the same id", () => {
    saved = saveEnv();
    const adapter = createEuropeAdapter("conrad");
    const first = adapter.ingestOrder({ order_id: "DE-1", order_state: "WAITING_ACCEPTANCE", order_lines: [{ offer_sku: "BZ-1" }] });
    expect(first.buzzardStatus).toBe("PENDING");
    expect(first.persisted).toBe(false);
    expect(first.orderCreated).toBe(false);
    expect(adapter.ingestOrder({ order_id: "DE-1", order_state: "WAITING_ACCEPTANCE" }).code).toBe("DUPLICATE_ORDER");
    const returned = adapter.ingestReturn({ order_id: "DE-2", order_state: "SHIPPED" });
    expect(returned.return.live).toBe(false);
    expect(returned.return.labelIssued).toBe(false);
  });

  it("retries 503 and does not retry 401", async () => {
    saved = saveEnv();
    useEnv({
      EUROPE_MEDIAMARKT_API_KEY: randomBytes(8).toString("hex"),
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    });
    let failures = 0;
    const retried = createEuropeAdapter("mediamarkt", {
      sleep: async () => {},
      transport: async () => {
        failures += 1;
        if (failures < 3) return { status: 503, body: {} };
        return { status: 201, body: { import_id: 3 } };
      },
    });
    const ok = await retried.updateOffer(offer());
    expect(ok.ok).toBe(true);
    expect(ok.attempts).toBe(3);
    let authCalls = 0;
    const denied = createEuropeAdapter("mediamarkt", {
      transport: async () => {
        authCalls += 1;
        return { status: 401, body: {} };
      },
    });
    const auth = await denied.updateOffer(offer({ sku: "BZ-2", productId: "4006381333932" }));
    expect(auth.code).toBe("AUTHENTICATION_FAILED");
    expect(authCalls).toBe(1);
  });

  it("stops at the local Mirakl offer limit", async () => {
    saved = saveEnv();
    useEnv({
      EUROPE_MEDIAMARKT_API_KEY: randomBytes(8).toString("hex"),
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    });
    let calls = 0;
    const adapter = createEuropeAdapter("mediamarkt", {
      limits: { offers: 1 },
      transport: async () => {
        calls += 1;
        return { status: 201, body: { import_id: calls } };
      },
    });
    expect((await adapter.updateOffer(offer())).ok).toBe(true);
    expect((await adapter.updateOffer(offer({ sku: "BZ-2", productId: "4006381333932" }))).code).toBe("RATE_LIMITED");
    expect(calls).toBe(1);
  });

  it("keeps an Etsy listing on the official v3 path and rejects a missing taxonomy", async () => {
    saved = saveEnv();
    useEnv({
      EUROPE_ETSY_API_KEY: randomBytes(8).toString("hex"),
      EUROPE_ETSY_API_SECRET: randomBytes(8).toString("hex"),
      EUROPE_ETSY_ENABLED: "1",
    });
    const seen = [];
    const adapter = createEuropeAdapter("etsy", {
      transport: async (request) => {
        seen.push(request);
        return { status: 201, body: { listing_id: 5 } };
      },
    });
    const missing = await adapter.createEtsyListing({ country: "DE", shopId: "10", title: "Disc", description: "Front disc", quantity: 2, updatedAt: Date.now(), costs: costs() });
    expect(missing.code).toBe("LISTING_FIELDS_REQUIRED");
    const created = await adapter.createEtsyListing({
      country: "DE",
      shopId: "10",
      title: "Brake disc",
      description: "Front disc for a passenger car",
      quantity: 2,
      updatedAt: Date.now(),
      costs: costs(),
      taxonomyId: 7,
      whoMade: "someone_else",
      whenMade: "2020_2026",
    });
    expect(created.ok).toBe(true);
    expect(seen[0].path).toBe("/v3/application/shops/10/listings");
    expect(seen[0].body.taxonomy_id).toBe(7);
    expect(seen).toHaveLength(1);
  });

  it("builds the documented Vinted HMAC payload", () => {
    saved = saveEnv();
    const body = '{ "event_types": ["CREATE_ITEM_SUCCESS"], "url": "https://example.com" }';
    const header = vintedSignature({
      timestamp: 1704067200,
      method: "POST",
      path: "/api/v1/webhooks",
      accessKey: "foo",
      rawBody: body,
      signingKey: "bar",
    });
    const payload = `1704067200.POST./api/v1/webhooks.foo.${body}`;
    const expected = createHmac("sha256", "bar").update(payload).digest("hex");
    expect(header).toBe(`t=1704067200,v1=${expected}`);
  });

  it("refuses existing connectors, file exchange, and closed platforms without transport", async () => {
    saved = saveEnv();
    let calls = 0;
    const transport = async () => { calls += 1; return { status: 200, body: {} }; };
    expect((await createEuropeAdapter("amazon", { transport }).updateOffer(offer())).code).toBe("EXISTING_CONNECTOR_UNTOUCHED");
    expect((await createEuropeAdapter("galaxus", { transport }).readOrders({ country: "CH" })).code).toBe("FILE_EXCHANGE_ONLY");
    expect((await createEuropeAdapter("zalando", { transport }).readOrders({ country: "DE" })).code).toBe("SELLER_ACCESS_REQUIRED");
    expect((await createEuropeAdapter("kleinanzeigen", { transport }).updateOffer(offer())).code).toBe("NO_OFFICIAL_API");
    expect((await createEuropeAdapter("mediamarkt", { transport }).updateOffer(offer({ country: "NO" }))).code).toBe("COUNTRY_NOT_SUPPORTED");
    expect(calls).toBe(0);
  });
});
