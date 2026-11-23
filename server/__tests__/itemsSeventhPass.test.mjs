import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { db } = require("../lib/db");
const catalogSeo = require("../lib/catalogSeo");
const advancedSearch = require("../lib/advancedSearch");
const pimCatalog = require("../lib/pimCatalog");
const productCatalogPim = require("../lib/productCatalogPim");
const { syncCatalogProducts } = require("../lib/catalogProductSync");
const { updateSeo } = require("../lib/pim/seoService");
const { open, run } = require("../lib/buzzardNative/engines/digitalHumanAdapter");
const { capturePayment } = require("../lib/commerce/paymentService");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");
const tecdoc = require("../lib/adapters/tecdocAdapter");

const human = { actorId: "seventh@example.invalid", actorType: "HUMAN" };
const ai = { actorId: "mira", actorType: "AI" };

describe("seventh pass projection gate", () => {
  it("refuses catalog, search, and old PIM writes that skip the actor", () => {
    const sku = `gate7-${Date.now()}`;
    const beforeProducts = db.prepare("SELECT COUNT(*) n FROM products").get().n;
    const beforeSearch = db.prepare("SELECT COUNT(*) n FROM srch_products").get().n;
    const beforePim = db.prepare("SELECT COUNT(*) n FROM pim_products").get().n;
    const beforeCore = db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n;

    expect(catalogSeo.createProduct({ sku, name: "Ungated" }).code).toBe("ACTOR_REQUIRED");
    expect(catalogSeo.createCategory({ name: "Ungated cat" }).code).toBe("ACTOR_REQUIRED");
    expect(catalogSeo.bulkUpdatePrices(0.2).code).toBe("ACTOR_REQUIRED");
    expect(advancedSearch.createProduct({ sku, title: "Ungated search" }).code).toBe("ACTOR_REQUIRED");
    expect(advancedSearch.upsertSynonym({ term: "pad" }).code).toBe("ACTOR_REQUIRED");
    expect(pimCatalog.createProduct({ sku, title: "Ungated pim" }).code).toBe("ACTOR_REQUIRED");
    expect(productCatalogPim.createProduct({ sku: `${sku}-30` }).code).toBe("ACTOR_REQUIRED");
    expect(productCatalogPim.createCategory({ name: "Ungated pim30" }).code).toBe("ACTOR_REQUIRED");
    expect(syncCatalogProducts().code).toBe("ACTOR_REQUIRED");
    expect(syncCatalogProducts().synced).toBe(0);

    expect(db.prepare("SELECT COUNT(*) n FROM products").get().n).toBe(beforeProducts);
    expect(db.prepare("SELECT COUNT(*) n FROM srch_products").get().n).toBe(beforeSearch);
    expect(db.prepare("SELECT COUNT(*) n FROM pim_products").get().n).toBe(beforePim);
    expect(db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n).toBe(beforeCore);
  });

  it("refuses an AI writer and allows a named human to index one canonical row", () => {
    const sku = `gate7h-${Date.now()}`;
    expect(advancedSearch.createProduct({ sku, title: "AI index" }, ai).code).toBe("AI_WRITE_DENIED");
    expect(db.prepare("SELECT COUNT(*) n FROM srch_products WHERE sku = ?").get(sku).n).toBe(0);

    const created = advancedSearch.createProduct({ sku, title: "Human index", price: 4, stock: 1 }, human);
    expect(created.created).toBe(true);
    expect(created.canonicalProductId).toMatch(/^pim_prod_/);
    expect(db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE sku = ?").get(sku).n).toBe(1);
    expect(db.prepare("SELECT COUNT(*) n FROM srch_products WHERE sku = ?").get(sku).n).toBe(1);

    const again = advancedSearch.createProduct({ sku, title: "Human index" }, human);
    expect(again.created).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE sku = ?").get(sku).n).toBe(1);
  });

  it("keeps SEO metadata, payment, supplier orders, and TecDoc closed", () => {
    expect(() => updateSeo("missing-product", { slug: "x" })).toThrow(/ACTOR_REQUIRED/);
    expect(capturePayment().code).toBe("ACTOR_REQUIRED");
    expect(capturePayment({ actorId: human.actorId }).code).toBe("PAYMENT_NOT_LIVE");
    expect(new InterCarsAdapter().placeOrder({ actorId: human.actorId }).code).toBe("LIVE_ORDER_FORBIDDEN");
    expect(tecdoc.liveRequirements().accountVerified).toBe(false);
  });

  it("shares one digital body and does not invent providers", () => {
    const names = ["sinan", "esat", "dogu", "mira", "leon", "amelia", "adrian"];
    const opened = names.map((name) => open(name));
    expect(new Set(opened.map((row) => row.engine))).toEqual(new Set(["digital_body"]));
    expect(new Set(opened.map((row) => row.agentId)).size).toBe(names.length);
    expect(opened.every((row) => row.rendered === false)).toBe(true);
    expect(run("tts", "mira").code).toBe("PROVIDER_ABSENT");
    expect(run("speech_in", "leon").ran).toBe(false);
    expect(run("wardrobe", "amelia").fake).toBe(false);
  });
});
