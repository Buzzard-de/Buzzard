const { inspectTree } = require("../../buzzardNative/core/specialists/categoryEngine");
const { PLATFORMS, resolveAlias } = require("./catalog");

const LANGUAGE = Object.freeze({
  DE: ["de"], AT: ["de"], CH: ["de", "fr", "it"], FR: ["fr"], NL: ["nl"], BE: ["nl", "fr"],
  PL: ["pl"], CZ: ["cs"], SK: ["sk"], HU: ["hu"], RO: ["ro"], BG: ["bg"], HR: ["hr"],
  SI: ["sl"], RS: ["sr"], IT: ["it"], ES: ["es"], PT: ["pt"], GR: ["el"], CY: ["el", "tr"],
  SE: ["sv"], DK: ["da"], NO: ["no"], FI: ["fi"], LT: ["lt"], LV: ["lv"], EE: ["et"],
  GB: ["en"], IE: ["en"],
});

const VERTICAL = Object.freeze({
  automotive: ["bz.01"],
  electronics: ["bz.12", "bz.13", "bz.14"],
  fashion: ["bz.17", "bz.18", "bz.19"],
  home: ["bz.05", "bz.06", "bz.07", "bz.08", "bz.09"],
  diy: ["bz.02", "bz.03", "bz.04"],
  sports: ["bz.30", "bz.31", "bz.49"],
  media: ["bz.34"],
  pets: ["bz.36", "bz.51"],
  beauty: ["bz.21", "bz.22"],
  music: ["bz.33"],
  industrial: ["bz.38", "bz.39"],
});

const REQUIRED_FIELDS = Object.freeze(["sku", "title"]);

const GROUPS = Object.freeze({
  general: ["Amazon", "eBay", "Kaufland Global Marketplace", "Allegro", "bol", "Cdiscount", "OTTO", "eMAG", "Skroutz", "Alza", "Galaxus", "Ricardo", "Fruugo", "Rakuten France", "Carrefour Marketplace", "Empik", "Worten", "CDON", "Fnac Darty", "MediaMarkt Marketplace", "Conrad Marketplace", "Etsy", "Temu", "SHEIN Marketplace", "TikTok Shop", "Alibaba.com", "AliExpress", "Wish", "OnBuy", "Miravia", "Erli", "Pepita", "Ananas", "Shopflix", "Public.gr", "Kaup24", "Pigu.lt", "220.lv", "Varle.lt", "1a platformları", "Shöpping.at", "Universal.at", "XXXLutz", "Manor", "Migros", "Coop", "Brack.ch", "Coolblue", "Wehkamp", "Blokker", "HEMA", "Media Expert", "RTV Euro AGD", "Datart", "Nay.sk", "Altex", "Flanco", "Technopolis", "eKupi", "Mimovrste", "Merkur", "Gigatron", "El Corte Inglés", "Continente", "Plaisio", "Stephanis", "Electroline", "Åhléns", "Bilka", "Matas", "Prisma", "Verkkokauppa.com", "Gigantti", "Elgiganten", "Elkjøp", "Komplett", "Very", "Argos", "Littlewoods Ireland", "Brown Thomas"],
  automotive: ["eBay Motors", "Daparto", "Oscaro", "Motointegrator", "Autodoc", "Amazon Automotive", "Allegro Automotive", "Kaufland Automotive", "Cdiscount Automotive", "bol Automotive", "ManoMano", "Conrad"],
  electronics: ["MediaMarkt Marketplace", "Saturn", "Alza", "Galaxus", "Digitec", "PcComponentes", "Morele.net", "Conrad", "ePRICE", "Unieuro", "MediaWorld", "Boulanger", "Rue du Commerce", "Ubaldi", "Pixmania", "MacWay", "PCDIGA", "Proshop", "Verkkokauppa.com", "Gigantti", "Elgiganten", "Elkjøp", "Komplett", "Brack.ch", "Datart", "Nay.sk", "Ozone.bg", "Technopolis", "CEL.ro", "Flanco", "Altex", "RD Electronics", "Stephanis", "Electroline", "Bax Music", "Thomann"],
  fashion: ["Zalando", "ABOUT YOU", "Spartoo", "La Redoute", "Modivo", "Fashion Days", "Vinted", "Depop", "ASOS Marketplace", "Boozt", "Limango", "Veepee", "Privalia", "eCipele", "Ochsner Sport", "Brown Thomas", "Very", "Universal.at", "OTTO Fashion", "Empik Fashion", "Etsy"],
  home: ["OTTO", "Wayfair", "Home24", "XXXLutz", "VidaXL", "La Redoute", "Wehkamp", "Leen Bakker", "Blokker", "HEMA", "Manor", "Migros", "Coop", "Carrefour", "El Corte Inglés", "Worten", "Universal.at", "Limango", "Leroy Merlin", "Hornbach", "Bauhaus", "OBI", "Brico", "Praxis", "Conforama", "Maisons du Monde"],
  diy: ["ManoMano", "Leroy Merlin", "OBI", "Hornbach", "Bauhaus", "Brico", "Praxis", "B&Q Marketplace", "Screwfix", "Castorama", "Toolstation", "Conrad", "VidaXL", "Home24", "Merkur", "Pigu", "Kaufland", "Amazon", "eBay"],
  sports: ["Decathlon Marketplace", "Sportano", "Tradeinn", "Ochsner Sport", "Zalando Sports", "Boozt", "Amazon Sports", "eBay Sports", "Allegro Sports", "Galaxus Sports", "Skroutz Sports", "Ricardo Sports", "Fyndiq", "XXL"],
  media: ["Fnac", "Darty", "Empik", "Thalia", "IBS", "bol", "Amazon", "eBay", "Rakuten France", "Etsy"],
  pets: ["Zooplus", "Bitiba", "Fressnapf", "Amazon Pet", "eBay Pet", "Kaufland Pet", "Allegro Pet", "bol Pet", "eMAG Pet", "Skroutz Pet", "Galaxus Pet"],
  beauty: ["Douglas Marketplace", "Notino", "Sephora", "Flaconi", "Lookfantastic", "Zalando Beauty", "Amazon Beauty", "eBay Beauty", "Cdiscount Beauty", "bol Beauty", "Skroutz Beauty", "eMAG Beauty", "Carrefour Beauty", "Veepee Beauty"],
  recommerce: ["Back Market", "Refurbed", "Vinted", "eBay", "Ricardo", "Kleinanzeigen", "Leboncoin", "Marktplaats", "2dehands", "OLX", "Wallapop", "Subito", "Tradera", "FINN", "Tori.fi", "Osta.ee", "Njuškalo", "Bolha", "KupujemProdajem", "Limundo", "Vatera", "willhaben", "Adverts.ie", "DoneDeal", "Depop", "Etsy"],
  music: ["Reverb", "Thomann", "Bax Music", "Amazon", "eBay", "Allegro", "Galaxus", "Conrad", "Fnac", "Musikhaus platformları"],
  industrial: ["Alibaba.com", "Amazon Business", "Conrad", "Kaufland", "eBay", "ManoMano", "Alza", "Galaxus", "Morele.net", "Brack.ch", "RS Components", "Würth", "Toolstation", "Distrelec"],
  comparison: ["Heureka", "Ceneo", "Pazaruvaj", "KuantoKusta", "BestPrice", "Idealo", "Google Shopping", "Marktplaats", "Amazon ürün keşfi", "Skroutz fiyat karşılaştırma", "Kelkoo", "PriceRunner"],
  classified: ["Kleinanzeigen", "Leboncoin", "Marktplaats", "2dehands", "willhaben", "OLX", "Wallapop", "Subito", "Njuškalo", "Bolha", "KupujemProdajem", "Limundo", "Vatera", "FINN", "Tori.fi", "Osta.ee", "Tradera", "DBA", "Bazaraki", "Adverts.ie", "DoneDeal"],
});

const FACETS = Object.freeze([
  ["Amazon Automotive", "amazon", "bz.01"],
  ["Allegro Automotive", "allegro", "bz.01"],
  ["Kaufland Automotive", "kaufland", "bz.01"],
  ["Cdiscount Automotive", "cdiscount", "bz.01"],
  ["bol Automotive", "bol", "bz.01"],
  ["eBay Motors", "ebay", "bz.01"],
  ["OTTO Fashion", "otto", "bz.17"],
  ["Empik Fashion", "empik", "bz.17"],
  ["Zalando Sports", "zalando", "bz.30"],
  ["Amazon Sports", "amazon", "bz.30"],
  ["eBay Sports", "ebay", "bz.30"],
  ["Allegro Sports", "allegro", "bz.30"],
  ["Galaxus Sports", "galaxus", "bz.30"],
  ["Skroutz Sports", "skroutz", "bz.30"],
  ["Ricardo Sports", "ricardo", "bz.30"],
  ["Amazon Pet", "amazon", "bz.36"],
  ["eBay Pet", "ebay", "bz.36"],
  ["Kaufland Pet", "kaufland", "bz.36"],
  ["Allegro Pet", "allegro", "bz.36"],
  ["bol Pet", "bol", "bz.36"],
  ["eMAG Pet", "emag", "bz.36"],
  ["Skroutz Pet", "skroutz", "bz.36"],
  ["Galaxus Pet", "galaxus", "bz.36"],
  ["Zalando Beauty", "zalando", "bz.21"],
  ["Amazon Beauty", "amazon", "bz.21"],
  ["eBay Beauty", "ebay", "bz.21"],
  ["Cdiscount Beauty", "cdiscount", "bz.21"],
  ["bol Beauty", "bol", "bz.21"],
  ["Skroutz Beauty", "skroutz", "bz.21"],
  ["eMAG Beauty", "emag", "bz.21"],
  ["Carrefour Beauty", "carrefour", "bz.21"],
  ["Veepee Beauty", "veepee", "bz.21"],
  ["Amazon Business", "amazon", "bz.38"],
  ["Amazon ürün keşfi", "amazon", null],
  ["Skroutz fiyat karşılaştırma", "skroutz", null],
]);

const facetByName = new Map(FACETS.map((row) => [row[0].toLowerCase(), { id: row[1], buzzardCategory: row[2] }]));

function regionFor(country) {
  if (country === "GB") return "GB";
  if (country === "CH") return "CH";
  if (country === "IE") return "IE";
  if (country === "NO") return "EEA";
  return "EU";
}

function tree() {
  return inspectTree({ actorId: "category_ai" });
}

function allCodes() {
  const loaded = tree();
  if (!loaded.ok) return loaded;
  return { ok: true, codes: loaded.codes.filter((code) => !loaded.retired.includes(code)), retired: loaded.retired };
}

function resolveTarget(name) {
  const facet = facetByName.get(String(name || "").trim().toLowerCase());
  if (facet) {
    const platform = PLATFORMS.find((row) => row.id === facet.id);
    return platform ? { platform, facet } : null;
  }
  const platform = resolveAlias(name);
  return platform ? { platform, facet: null } : null;
}

function buildLinks() {
  const loaded = allCodes();
  if (!loaded.ok) return loaded;
  const membership = new Map();
  const missing = [];
  for (const [group, names] of Object.entries(GROUPS)) {
    for (const name of names) {
      const target = resolveTarget(name);
      if (!target) {
        missing.push(name);
        continue;
      }
      if (!membership.has(target.platform.id)) membership.set(target.platform.id, new Set());
      membership.get(target.platform.id).add(group);
    }
  }
  const links = new Map();
  for (const platform of PLATFORMS) {
    const groups = [...(membership.get(platform.id) || [])];
    const codes = new Set();
    if (groups.includes("general") || groups.includes("comparison") || groups.includes("classified") || groups.includes("recommerce")) {
      for (const code of loaded.codes) codes.add(code);
    }
    for (const group of groups) {
      for (const code of VERTICAL[group] || []) codes.add(code);
    }
    links.set(platform.id, {
      id: platform.id,
      officialName: platform.officialName,
      kind: platform.kind,
      status: platform.status,
      groups,
      codes: [...codes].sort(),
      countries: platform.countries,
      channels: platform.channels.map((channel) => ({
        country: channel.country,
        currency: channel.currency,
        languages: LANGUAGE[channel.country] || [],
        region: regionFor(channel.country),
      })),
    });
  }
  return { ok: missing.length === 0, missing, links, codes: loaded.codes };
}

function decisionFor(platform) {
  if (platform.kind === "classified" || platform.status === "NO_OFFICIAL_API") {
    return { catalogListing: false, code: "CLASSIFIED_CHANNEL", productApi: false, orderApi: false };
  }
  if (platform.kind === "comparison") {
    return { catalogListing: false, code: "COMPARISON_CHANNEL", productApi: false, orderApi: false };
  }
  if (platform.status === "NOT_ELIGIBLE" || platform.sellerAccepted === "no") {
    return { catalogListing: false, code: "RETAILER_NOT_A_MARKETPLACE", productApi: false, orderApi: false };
  }
  if (!["EXISTING_UNTOUCHED", "ADAPTER_IMPLEMENTED", "PARTIAL_API_SUPPORT"].includes(platform.status) || platform.kind !== "marketplace") {
    return { catalogListing: false, code: "API_NOT_VERIFIED", productApi: false, orderApi: false };
  }
  return { catalogListing: true, code: "MARKETPLACE_CATEGORY_REQUIRED", productApi: false, orderApi: false };
}

function planListing(input = {}) {
  const loaded = allCodes();
  if (!loaded.ok) return { ok: false, code: loaded.code || "CATEGORY_TREE_UNAVAILABLE", publish: false, live: false, network: false };
  const code = input.buzzardCategory;
  if (!code || !loaded.codes.includes(code)) {
    return { ok: false, code: loaded.retired.includes(code) ? "CATEGORY_RETIRED" : "CATEGORY_NOT_FOUND", publish: false, live: false, network: false };
  }
  const target = resolveTarget(input.platform);
  if (!target) return { ok: false, code: "PLATFORM_UNKNOWN", publish: false, live: false, network: false };
  const built = buildLinks();
  const link = built.links.get(target.platform.id);
  if (!link.codes.includes(code)) {
    return { ok: false, code: "CATEGORY_NOT_ELIGIBLE", publish: false, live: false, network: false, platformId: target.platform.id };
  }
  if (!input.country) return { ok: false, code: "COUNTRY_REQUIRED", publish: false, live: false, network: false };
  const channel = link.channels.find((row) => row.country === input.country);
  if (!channel) return { ok: false, code: "COUNTRY_NOT_SUPPORTED", publish: false, live: false, network: false };
  const decision = decisionFor(target.platform);
  const base = {
    platformId: target.platform.id,
    buzzardCategory: code,
    facet: target.facet,
    country: channel.country,
    currency: channel.currency,
    languages: channel.languages,
    region: channel.region,
    marketplaceCategoryId: input.marketplaceCategoryId || null,
    marketplaceAttributes: Array.isArray(input.marketplaceAttributes) ? input.marketplaceAttributes : [],
    productApi: false,
    orderApi: false,
    publish: false,
    live: false,
    network: false,
    productionReady: false,
  };
  if (!decision.catalogListing) return { ok: false, ...base, code: decision.code };
  if (link.groups.includes("recommerce") && !link.groups.includes("general") && !["used", "refurbished"].includes(input.condition)) {
    return { ok: false, ...base, code: "CONDITION_REQUIRED" };
  }
  if (!input.marketplaceCategoryId) return { ok: false, ...base, code: "MARKETPLACE_CATEGORY_UNMAPPED" };
  const missing = REQUIRED_FIELDS.filter((field) => input.attributes?.[field] == null || input.attributes[field] === "");
  if (missing.length) return { ok: false, ...base, code: "ATTRIBUTES_INCOMPLETE", missing };
  if (input.marketplaceAttributesConfirmed !== true) {
    return { ok: false, ...base, code: "MARKETPLACE_ATTRIBUTES_UNCONFIRMED" };
  }
  return { ok: true, ready: true, ...base, code: "LIVE_PUBLISH_CLOSED" };
}

function routesFor(input = {}) {
  const built = buildLinks();
  if (!built.ok) return built;
  const code = input.buzzardCategory;
  return {
    ok: true,
    buzzardCategory: code,
    routes: [...built.links.values()]
      .filter((link) => link.codes.includes(code))
      .map((link) => {
        const platform = PLATFORMS.find((row) => row.id === link.id);
        return {
          id: link.id,
          officialName: link.officialName,
          kind: link.kind,
          groups: link.groups,
          decision: decisionFor(platform).code,
          publish: false,
          live: false,
        };
      }),
  };
}

module.exports = {
  LANGUAGE,
  VERTICAL,
  GROUPS,
  FACETS,
  resolveTarget,
  buildLinks,
  planListing,
  routesFor,
  decisionFor,
};
