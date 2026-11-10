/**
 * Black-and-gold storefront pages over the isolated catalog.
 * Sales stay closed. Missing translations are marked, not replaced.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { openCatalog } = require("./isolatedCatalog");

const CHROME = {
  de: { sales: "Verkauf geschlossen", search: "Suche", categories: "Kategorien", empty: "Keine Treffer", error: "Nicht verfügbar", price: "Preis", shipping: "Versand", stock: "Verfügbarkeit" },
  en: { sales: "Sales closed", search: "Search", categories: "Categories", empty: "No results", error: "Unavailable", price: "Price", shipping: "Shipping", stock: "Availability" },
  tr: { sales: "Satış kapalı", search: "Arama", categories: "Kategoriler", empty: "Sonuç yok", error: "Kullanılamıyor", price: "Fiyat", shipping: "Gönderim", stock: "Stok durumu" },
  ar: { sales: "المبيعات مغلقة", search: "بحث", categories: "الفئات", empty: "لا توجد نتائج", error: "غير متاح", price: "السعر", shipping: "الشحن", stock: "التوفر" },
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chrome(locale) {
  if (CHROME[locale]) return { strings: CHROME[locale], untranslated: [] };
  return { strings: CHROME.de, untranslated: Object.keys(CHROME.de), sourceLocale: "de" };
}

function page({ locale = "de", title, body, untranslated = [] }) {
  const ui = chrome(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const missing = [...ui.untranslated, ...untranslated];
  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --bg:#0b0b0b; --gold:#c9a227; --ink:#f6f1e7; --muted:#b7b1a4; --line:rgba(201,162,39,.45); }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font-family:Georgia,"Times New Roman",serif; }
a { color:var(--gold); text-decoration:none; }
header, main { width:min(1120px, calc(100% - 32px)); margin:0 auto; }
header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 0; border-bottom:1px solid var(--line); }
.logo { height:48px; width:auto; }
.banner, .card, .placeholder { border:1px solid var(--line); }
.banner { padding:10px 14px; color:var(--gold); letter-spacing:.08em; text-transform:uppercase; font-size:12px; }
nav { display:flex; flex-wrap:wrap; gap:12px; padding:16px 0; }
.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.card, .placeholder, .empty, .error { padding:16px; }
.placeholder { min-height:140px; display:grid; place-items:center; color:var(--gold); }
.skeleton { height:12px; background:linear-gradient(90deg,#161616,#2a2416,#161616); }
.missing { color:var(--gold); font-size:12px; }
form { display:flex; gap:8px; }
input, button, select { background:#111; color:var(--ink); border:1px solid var(--line); padding:8px 10px; font:inherit; }
button { color:var(--gold); }
@media (max-width:1024px) { .grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:640px) { header, form { display:block; } .grid { grid-template-columns:1fr; } .logo { height:36px; } }
</style>
</head>
<body>
<header>
  <a href="/?lang=${escapeHtml(locale)}"><img class="logo" src="/logo/logo.png" alt="Buzzard"></a>
  <form action="/search" method="get">
    <label for="q">${escapeHtml(ui.strings.search)}</label>
    <input id="q" name="q" type="search">
    <input type="hidden" name="lang" value="${escapeHtml(locale)}">
    <button type="submit">${escapeHtml(ui.strings.search)}</button>
  </form>
</header>
<main>
  <p class="banner">${escapeHtml(ui.strings.sales)}</p>
  ${missing.length ? `<p class="missing">MISSING_TRANSLATION ${escapeHtml(missing.join(" "))}</p>` : ""}
  <div class="skeleton" data-state="loading" hidden></div>
  <div data-state="ready">${body}</div>
</main>
</body>
</html>`;
}

function cards(items) {
  if (!items.length) return `<section class="empty" data-state="empty">EMPTY</section>`;
  return `<section class="grid">${items
    .map(
      (item) => `<article class="card">
        <div class="placeholder">PLACEHOLDER — no product photograph</div>
        <h2>${item.title ? escapeHtml(item.title) : "MISSING_TRANSLATION"}</h2>
        <p>${escapeHtml(item.sku)} · ${escapeHtml(item.brand)}</p>
        <p>${escapeHtml(item.category && item.category.name ? item.category.name : "UNKNOWN")}</p>
        <p>PRICE ${escapeHtml(item.price)} · SHIPPING ${escapeHtml(item.shipping)} · STOCK ${escapeHtml(item.availability)}</p>
        <a href="/product/${escapeHtml(item.id)}">${escapeHtml(item.sku)}</a>
      </article>`
    )
    .join("")}</section>`;
}

function render(catalog, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const locale = url.searchParams.get("lang") || "de";
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "category" && parts[1]) {
    const result = catalog.search({ category: parts[1], locale, actor: "render", measure: false });
    if (!result.ok && result.code === "RETIRED_CATEGORY") {
      return page({ locale, title: "Buzzard", body: `<section class="error" data-state="error">RETIRED_CATEGORY</section>` });
    }
    const nav = catalog.categories();
    const current = nav.items.find((item) => item.code === parts[1]);
    return page({
      locale,
      title: current ? current.name : "Buzzard",
      untranslated: locale === "de" ? [] : ["category.name"],
      body: `<h1>${escapeHtml(current ? current.name : "UNKNOWN")}</h1>${cards(result.items || [])}`,
    });
  }
  if (parts[0] === "search") {
    const result = catalog.search({
      q: url.searchParams.get("q") || "",
      locale,
      actor: "render",
      measure: false,
      sort: url.searchParams.get("sort") || "name",
    });
    return page({
      locale,
      title: "Buzzard",
      body: result.ok ? cards(result.items) : `<section class="error" data-state="error">${escapeHtml(result.code)}</section>`,
      untranslated: [],
    });
  }
  if (parts[0] === "product" && parts[1]) {
    const result = catalog.detail(parts[1], { locale });
    if (!result.ok) {
      return page({ locale, title: "Buzzard", body: `<section class="error" data-state="error">${escapeHtml(result.code)}</section>` });
    }
    const product = result.product;
    const variants = product.variants
      .map((variant) => `<li>${escapeHtml(variant.sku)} · PRICE ${escapeHtml(variant.price)} · STOCK ${escapeHtml(variant.availability)}</li>`)
      .join("");
    const related = product.related
      .map((item) => `<li><a href="/product/${escapeHtml(item.id)}">${escapeHtml(item.sku)}</a></li>`)
      .join("");
    return page({
      locale,
      title: product.title || "Buzzard",
      untranslated: product.untranslated,
      body: `<article class="card">
        <div class="placeholder">PLACEHOLDER — no product photograph</div>
        <h1>${product.title ? escapeHtml(product.title) : "MISSING_TRANSLATION"}</h1>
        <p>${product.description ? escapeHtml(product.description) : "MISSING_TRANSLATION"}</p>
        <p>${escapeHtml(product.sku)} · ${escapeHtml(product.brand)} · ${escapeHtml(product.manufacturer)}</p>
        <p>PRICE UNKNOWN · SHIPPING UNKNOWN · STOCK UNKNOWN · RETURNS UNKNOWN</p>
        <p data-quote="${escapeHtml(result.quote.code)}">QUOTE ${escapeHtml(result.quote.code)}</p>
        <h2>Variants</h2><ul>${variants || "<li>UNKNOWN</li>"}</ul>
        <h2>Related</h2><ul>${related || "<li>UNKNOWN</li>"}</ul>
        <p>ORDER DISABLED</p>
      </article>`,
    });
  }
  const nav = catalog.categories();
  const links = nav.items
    .filter((item) => item.navigable)
    .slice(0, 12)
    .map((item) => `<a href="/category/${escapeHtml(item.code)}?lang=${escapeHtml(locale)}">${escapeHtml(item.name)}</a>`)
    .join("");
  const listed = catalog.search({ locale, actor: "render", measure: false });
  return page({
    locale,
    title: "Buzzard",
    untranslated: locale === "de" ? [] : ["category.name"],
    body: `<nav aria-label="${escapeHtml(chrome(locale).strings.categories)}">${links}</nav>${cards(listed.items || [])}`,
  });
}

function startPreview({ dbPath, port = 0 } = {}) {
  const catalog = openCatalog(dbPath);
  const logo = path.join(process.cwd(), "public/logo/logo.png");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/logo/logo.png") {
      if (!fs.existsSync(logo)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("MISSING_LOGO");
        return;
      }
      res.writeHead(200, { "content-type": "image/png" });
      fs.createReadStream(logo).pipe(res);
      return;
    }
    const html = render(catalog, req.url);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-buzzard-sales": "closed", "cache-control": "no-store" });
    res.end(html);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        catalog,
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((done) => {
            if (typeof server.closeAllConnections === "function") server.closeAllConnections();
            server.close(() => {
              catalog.close();
              done();
            });
          }),
      });
    });
  });
}

module.exports = { render, startPreview, escapeHtml, CHROME };
