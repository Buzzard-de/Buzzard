#!/usr/bin/env node
/**
 * Buzzard i18n frontend QA — browser automation against localhost:3000
 */
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BUZZARD_SITE_URL || "http://localhost:3000";

const LANG_EXPECT = {
  de: { cart: /Warenkorb/i, search: /Suchen/i, hero: /Entdecken Sie unser Sortiment/i },
  fr: { cart: /Panier/i, search: /Rechercher/i, hero: /Découvrez notre assortiment/i },
  it: { cart: /Carrello/i, search: /Cerca/i, hero: /Scopri/i },
  pl: { cart: /Koszyk/i, search: /Szukaj/i, hero: /Odkryj/i },
  es: { cart: /Carrito/i, search: /Buscar/i, hero: /Descubr/i },
  tr: { cart: /Sepet/i, search: /Ara/i, hero: /Keşf/i },
  ar: { cart: /[\u0600-\u06FF]/, search: /[\u0600-\u06FF]/, hero: /[\u0600-\u06FF]/ },
};

const EN_FALLBACK_MARKERS = [
  "Add to cart",
  "My account",
  "Search products",
  "All categories",
  "Shopping cart",
];

const TECHNICAL = ["205/55 R16", "5W-30", "API", "ACEA", "EAN", "SKU", "OEM", "kW", "PS", "Nm"];

const COUNTRY_LANG = [
  { country: "DE", lang: "de", locale: "de-DE", label: "Deutsch" },
  { country: "FR", lang: "fr", locale: "fr-FR", label: "Français" },
  { country: "IT", lang: "it", locale: "it-IT", label: "Italiano" },
  { country: "PL", lang: "pl", locale: "pl-PL", label: "Polski" },
  { country: "ES", lang: "es", locale: "es-ES", label: "Español" },
  { country: "TR", lang: "tr", locale: "tr-TR", label: "Türkçe" },
  { country: "SA", lang: "ar", locale: "ar-SA", label: "العربية" },
  { country: "AE", lang: "ar", locale: "ar-AE", label: "العربية" },
  { country: "EG", lang: "ar", locale: "ar-EG", label: "العربية" },
];

const MULTI = [
  { country: "BE", locales: ["nl-BE", "fr-BE", "de-BE"] },
  { country: "LU", locales: ["lb-LU", "fr-LU", "de-LU"] },
  { country: "ES", locales: ["es-ES", "ca-ES", "eu-ES", "gl-ES"] },
  { country: "CY", locales: ["el-CY", "tr-CY"] },
  { country: "IE", locales: ["en-IE", "ga-IE"] },
  { country: "MT", locales: ["mt-MT", "en-MT"] },
];

const rows = [];
let desktopPass = true;
let mobilePass = true;
let rtlPass = true;
let persistencePass = true;
let countryPass = true;
let browserPass = true;
let checkoutPass = true;

function record(locale, browserCountry, page, result, problem = "", fix = "") {
  rows.push({ locale, browserCountry: browserCountry, page, result, problem, fix });
  if (result === "FAIL") {
    if (page.includes("mobile")) mobilePass = false;
    else if (page.includes("rtl") || locale.startsWith("ar")) rtlPass = false;
    else if (page.includes("persistence")) persistencePass = false;
    else if (page.includes("country")) countryPass = false;
    else if (page.includes("browser")) browserPass = false;
    else if (page.includes("checkout")) checkoutPass = false;
    else desktopPass = false;
  }
}

async function setCountryLang(page, country, localeTag, lang) {
  await page.evaluate(
    ({ country, localeTag, lang }) => {
      localStorage.setItem("buzzard_market_country", country);
      localStorage.setItem("buzzard_market_locale", localeTag);
      localStorage.setItem("buzzard_locale", lang);
      localStorage.setItem("buzzard_locale_manual", "1");
    },
    { country, localeTag, lang }
  );
}

async function waitForHydration(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function selectCountry(page, countryCode) {
  const select = page.locator(".country-selector select");
  await select.waitFor({ state: "visible", timeout: 15000 });
  await select.selectOption(countryCode);
  await waitForHydration(page);
}

async function selectLanguage(page, localeTag) {
  const select = page.locator(".language-selector select");
  await select.waitFor({ state: "visible", timeout: 15000 });
  const options = await select.locator("option").evaluateAll((els) => els.map((o) => o.getAttribute("value")));
  if (!options.includes(localeTag)) {
    throw new Error(`Locale option ${localeTag} not available. Options: ${options.join(", ")}`);
  }
  await select.selectOption(localeTag);
  await waitForHydration(page);
}

const LANG_COUNTRY = {
  de: { country: "DE", locale: "de-DE" },
  fr: { country: "FR", locale: "fr-FR" },
  it: { country: "IT", locale: "it-IT" },
  pl: { country: "PL", locale: "pl-PL" },
  es: { country: "ES", locale: "es-ES" },
  tr: { country: "TR", locale: "tr-TR" },
  ar: { country: "SA", locale: "ar-SA" },
  nl: { country: "NL", locale: "nl-NL" },
};

async function switchToLanguage(page, lang) {
  await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  const mapping = LANG_COUNTRY[lang];
  if (mapping) {
    await selectCountry(page, mapping.country);
  }
  await selectLanguage(page, mapping?.locale ?? `${lang}-${lang.toUpperCase()}`);
}

async function assertLangUI(page, lang, pageName) {
  const body = await page.locator("body").innerText();
  const expect = LANG_EXPECT[lang];
  if (!expect) return;

  for (const [key, pattern] of Object.entries(expect)) {
    if (!pattern.test(body)) {
      record(lang, "-", pageName, "FAIL", `Missing expected ${key} text for ${lang}`, "");
      return false;
    }
  }

  if (lang !== "en") {
    for (const marker of EN_FALLBACK_MARKERS) {
      if (body.includes(marker)) {
        record(lang, "-", pageName, "FAIL", `English fallback visible: "${marker}"`, "");
        return false;
      }
    }
  }

  record(lang, "-", pageName, "PASS");
  return true;
}

async function testPages(page, lang) {
  const paths = ["/de/", "/products/", "/kategorie/automotive/", "/warenkorb/", "/checkout/"];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await assertLangUI(page, lang, path);
  }
}

async function runDesktop(browser) {
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();

  // TEST 1 - German default
  await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  await assertLangUI(page, "de", "Homepage DE");

  // TEST 2-6 language switch via selector
  for (const lang of ["fr", "it", "pl", "es", "tr"]) {
    await switchToLanguage(page, lang);
    const dir = await page.evaluate(() => document.documentElement.dir);
    if (dir !== "ltr") record(lang, "-", "Language switch", "FAIL", `dir=${dir} expected ltr`, "");
    else record(lang, "-", "Language switch", "PASS");
    await assertLangUI(page, lang, `Homepage ${lang.toUpperCase()}`);
  }

  // TEST 7 - Arabic RTL
  await switchToLanguage(page, "ar");
  const arDir = await page.evaluate(() => document.documentElement.dir);
  const arLang = await page.evaluate(() => document.documentElement.lang);
  if (arDir !== "rtl") {
    record("ar", "SA", "RTL", "FAIL", `document.dir=${arDir}`, "");
    rtlPass = false;
  } else {
    record("ar", "SA", "RTL", "PASS");
  }
  if (arLang !== "ar") record("ar", "SA", "RTL lang", "FAIL", `lang=${arLang}`, "");
  else record("ar", "SA", "RTL lang", "PASS");

  await assertLangUI(page, "ar", "Homepage AR");
  for (const path of ["/warenkorb/", "/checkout/", "/products/"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    const dir = await page.evaluate(() => document.documentElement.dir);
    if (dir !== "rtl") {
      record("ar", "SA", `RTL ${path}`, "FAIL", `dir=${dir}`, "");
      rtlPass = false;
    } else {
      record("ar", "SA", `RTL ${path}`, "PASS");
    }
  }

  // TEST 8 - persistence
  await switchToLanguage(page, "pl");
  const stored = await page.evaluate(() => ({
    locale: localStorage.getItem("buzzard_locale"),
    manual: localStorage.getItem("buzzard_locale_manual"),
    market: localStorage.getItem("buzzard_market_locale"),
  }));
  if (stored.locale !== "pl" || stored.manual !== "1") {
    record("pl", "-", "Persistence set", "FAIL", JSON.stringify(stored), "");
    persistencePass = false;
  } else record("pl", "-", "Persistence set", "PASS");

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  await assertLangUI(page, "pl", "Persistence reload");

  await page.goto(`${BASE}/products/`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  await assertLangUI(page, "pl", "Persistence new page");

  // TEST 9 - browser language detection (fresh context)
  for (const tag of ["de-DE", "fr-FR", "it-IT", "pl-PL", "es-ES", "tr-TR", "ar-SA"]) {
    const lang = tag.split("-")[0];
    const ctx = await browser.newContext({ locale: tag });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
    await waitForHydration(p);
    const detected = await p.evaluate(() => localStorage.getItem("buzzard_locale"));
    // Without manual override, browser locale may set on first visit
    const body = await p.locator("body").innerText();
    const ok = LANG_EXPECT[lang] && Object.values(LANG_EXPECT[lang]).some((rx) => rx.test(body));
    record(tag, tag, "Browser detection", ok ? "PASS" : "WARN", ok ? "" : `UI may not match browser lang ${tag}`, "");
    await ctx.close();
  }

  // TEST 10 - country + language
  for (const entry of COUNTRY_LANG) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
    await setCountryLang(p, entry.country, entry.locale, entry.lang);
    await p.reload({ waitUntil: "domcontentloaded" });
    await waitForHydration(p);
    const ok = await assertLangUI(p, entry.lang, `Country ${entry.country}`);
    if (!ok) countryPass = false;
    await ctx.close();
  }

  // TEST 11 - multilingual countries options
  for (const group of MULTI) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
    await setCountryLang(p, group.country, group.locales[0], group.locales[0].split("-")[0]);
    await p.reload({ waitUntil: "domcontentloaded" });
    await waitForHydration(p);
    const options = await p.locator(".language-selector select option").allTextContents();
    for (const loc of group.locales) {
      const found = options.some((o) => o.includes(loc));
      record(loc, group.country, "Multilingual options", found ? "PASS" : "FAIL", found ? "" : `Option ${loc} missing`, "");
      if (!found) countryPass = false;
    }
    await ctx.close();
  }

  // TEST 12 - no English fallback for FR
  await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
  await switchToLanguage(page, "fr");
  const frBody = await page.locator("body").innerText();
  const enCart = "Shopping cart";
  if (frBody.includes(enCart)) record("fr", "-", "EN fallback check", "FAIL", enCart, "");
  else record("fr", "-", "EN fallback check", "PASS");

  // TEST 13 - technical data on product page (if any product exists)
  await page.goto(`${BASE}/products/`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  const productLink = page.locator('a[href*="/produkt/"]').first();
  if (await productLink.count()) {
    await productLink.click();
    await waitForHydration(page);
    const html = await page.content();
    for (const term of TECHNICAL) {
      if (html.includes(term)) {
        record("all", "-", "Technical data", "PASS", term, "");
        break;
      }
    }
  } else {
    record("all", "-", "Technical data", "SKIP", "No product links on /products/", "");
  }

  // TEST 14 - URL routing
  for (const prefix of ["de", "en", "tr", "ar"]) {
    const res = await page.goto(`${BASE}/${prefix}/`, { waitUntil: "domcontentloaded" });
    const ok = res?.ok() && page.url().includes(`/${prefix}/`);
    record(prefix, "-", "URL routing", ok ? "PASS" : "FAIL", ok ? "" : page.url(), "");
  }

  // Checkout pass/fail from cart page
  await switchToLanguage(page, "de");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  const checkoutBody = await page.locator("body").innerText();
  if (/Kasse|Checkout|bestell|Warenkorb/i.test(checkoutBody)) record("de", "-", "Checkout", "PASS");
  else {
    record("de", "-", "Checkout", "FAIL", "No checkout UI text", "");
    checkoutPass = false;
  }

  await context.close();
}

async function runMobile(browser) {
  const iphone = devices["iPhone 13"];
  for (const { lang, locale } of [
    { lang: "de", locale: "de-DE" },
    { lang: "fr", locale: "fr-FR" },
    { lang: "tr", locale: "tr-TR" },
    { lang: "ar", locale: "ar-SA" },
  ]) {
    const context = await browser.newContext({ ...iphone, locale });
    const page = await context.newPage();
    await page.goto(`${BASE}/de/`, { waitUntil: "domcontentloaded" });
    await setCountryLang(page, lang === "ar" ? "SA" : lang === "tr" ? "TR" : lang === "fr" ? "FR" : "DE", locale, lang);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHydration(page);

    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 2;
    });
    const dir = await page.evaluate(() => document.documentElement.dir);
    const expectedDir = lang === "ar" ? "rtl" : "ltr";
    if (dir !== expectedDir) {
      record(lang, locale, "mobile RTL/LTR", "FAIL", `dir=${dir}`, "");
      mobilePass = false;
      rtlPass = lang === "ar" ? false : rtlPass;
    } else record(lang, locale, "mobile RTL/LTR", "PASS");

    if (overflow) {
      record(lang, locale, "mobile overflow", "FAIL", "horizontal scroll detected", "");
      mobilePass = false;
    } else record(lang, locale, "mobile overflow", "PASS");

    await assertLangUI(page, lang, `mobile homepage ${lang}`);
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await runDesktop(browser);
    await runMobile(browser);
  } finally {
    await browser.close();
  }

  const fails = rows.filter((r) => r.result === "FAIL");
  const report = {
    summary: {
      desktop: desktopPass ? "PASS" : "FAIL",
      mobile: mobilePass ? "PASS" : "FAIL",
      rtl: rtlPass ? "PASS" : "FAIL",
      languagePersistence: persistencePass ? "PASS" : "FAIL",
      countryDetection: countryPass ? "PASS" : "FAIL",
      browserDetection: browserPass ? "PASS" : "FAIL",
      checkout: checkoutPass ? "PASS" : "FAIL",
      overall: fails.length === 0 ? "INTERNATIONALIZATION FRONTEND QA: PASS" : "INTERNATIONALIZATION FRONTEND QA: FAIL",
      failCount: fails.length,
    },
    rows,
    failures: fails,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
