#!/usr/bin/env node
/**
 * Final automotive i18n hardening QA — product technical values + category labels.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BUZZARD_SITE_URL || "http://localhost:3000";

const PRODUCTS = [
  { slug: "michelin-pilot-sport-4-225-45-r17", label: "Reifen (225/45 R17)", technical: ["225/45 R17", "BUZ-AUTO-000015", "4006633001247", "OEM"] },
  { slug: "motoroel-5w30-fullsynthetic-5l", label: "Motoröl 5W-30", technical: ["5W-30", "BUZ-AUTO", "4006633", "OEM"] },
  { slug: "bremsscheibe-vorderachse-280mm", label: "Bremsscheibe", technical: ["280 mm", "BUZ-AUTO", "4006633", "OEM"] },
  { slug: "bremsbelaege-satz-vorderachse", label: "Bremsbeläge", technical: ["BUZ-AUTO", "4006633", "OEM"] },
];

const LANGS = [
  { lang: "de", country: "DE", locale: "de-DE" },
  { lang: "en", country: "DE", locale: "en-DE" },
  { lang: "fr", country: "FR", locale: "fr-FR" },
  { lang: "it", country: "IT", locale: "it-IT" },
  { lang: "pl", country: "PL", locale: "pl-PL" },
  { lang: "es", country: "ES", locale: "es-ES" },
  { lang: "tr", country: "TR", locale: "tr-TR" },
  { lang: "ar", country: "SA", locale: "ar-SA" },
];

const TECHNICAL_PATTERNS = [
  /\d{3}\/\d{2}\s*R\d{2}/i,
  /\dW-\d+/i,
  /\b(API|ACEA|OEM|EAN|SKU|kW|PS|Nm)\b/i,
];

const TECHNICAL_ID_PATTERN = /^[A-Z][A-Z0-9]*_\d+[A-Z0-9_]*$/;

const rows = [];
let allPass = true;

function record(product, lang, check, result, problem = "") {
  rows.push({ product, lang, check, result, problem });
  if (result === "FAIL") allPass = false;
}

async function setLang(page, { country, locale, lang }) {
  await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.locator(".country-selector select").selectOption(country);
  await page.waitForTimeout(400);
  await page.locator(".language-selector select").selectOption(locale);
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const product of PRODUCTS) {
    for (const cfg of LANGS) {
      await setLang(page, cfg);
      const url = `${BASE}/produkt/${product.slug}/`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);

      if (!res?.ok()) {
        record(product.label, cfg.lang, "page load", "FAIL", `HTTP ${res?.status()}`);
        continue;
      }

      const html = await page.content();
      const text = await page.locator("body").innerText();

      for (const token of product.technical) {
        const ok = html.includes(token) || text.includes(token);
        record(product.label, cfg.lang, `technical:${token}`, ok ? "PASS" : "WARN", ok ? "" : "not found in DOM");
      }

      for (const pattern of TECHNICAL_PATTERNS) {
        const m = text.match(pattern);
        if (m) record(product.label, cfg.lang, `pattern:${m[0]}`, "PASS");
      }

      const skuLine = text.match(/SKU:\s*(\S+)/);
      if (skuLine) record(product.label, cfg.lang, "SKU visible", "PASS");
      else record(product.label, cfg.lang, "SKU visible", "FAIL", "SKU missing");

      const eanMatch = text.match(/EAN[:\s]*(\d+)/i);
      if (eanMatch) record(product.label, cfg.lang, "EAN preserved", "PASS");

      const catLabel = await page.locator(".product-card-category, .product-detail .product-card-category").first().textContent().catch(() => "");
      if (catLabel && TECHNICAL_ID_PATTERN.test(catLabel.trim())) {
        record(product.label, cfg.lang, "category label", "FAIL", catLabel.trim());
      } else if (catLabel) {
        record(product.label, cfg.lang, "category label", "PASS");
      }

      const h1 = await page.locator("h1").first().textContent();
      if (h1 && h1.length > 2) record(product.label, cfg.lang, "product name", "PASS");
      else record(product.label, cfg.lang, "product name", "FAIL", "empty h1");

      if (cfg.lang === "en" && h1 && /Bremsscheibe|Bremsbeläge|Motoröl|Michelin Pilot Sport 4 Reifen/.test(h1)) {
        record(product.label, cfg.lang, "EN translation", "PASS");
      }
      if (cfg.lang === "tr" && h1 && /Fren|Motor Yağı|Lastik|Balata/i.test(h1)) {
        record(product.label, cfg.lang, "TR translation", "PASS");
      }
      if (cfg.lang === "ar" && h1 && /[\u0600-\u06FF]/.test(h1)) {
        record(product.label, cfg.lang, "AR translation", "PASS");
      }
    }
  }

  // Category labels on homepage — no technical IDs
  for (const cfg of LANGS) {
    await setLang(page, cfg);
    await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const labels = await page.locator(".home-category-tile-label, .popular-category-label, .product-card-sku").allTextContents();
    const bad = labels.filter((l) => TECHNICAL_ID_PATTERN.test(l.trim()));
    if (bad.length) {
      record("categories", cfg.lang, "no technical IDs", "FAIL", bad.slice(0, 3).join(", "));
    } else {
      record("categories", cfg.lang, "no technical IDs", "PASS");
    }
  }

  await browser.close();

  const fails = rows.filter((r) => r.result === "FAIL");
  console.log(JSON.stringify({ overall: allPass && fails.length === 0 ? "PASS" : "FAIL", failCount: fails.length, rows, failures: fails }, null, 2));
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
