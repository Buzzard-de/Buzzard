import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { translate } from "../lib/i18n/translations";
import catalog from "../lib/categories/translations/catalog-locale.json";
import countryNames from "../lib/market/country-names.json";

const LOCALES = [
  "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
  "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
  "eu", "gl", "sv", "ga",
] as const;

const out = process.env.BUZZARD_E2E_RUN_ROOT || "/tmp";

test("homepage in each of the 30 locales", async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(path.join(out, "locales"), { recursive: true });
  const rows: Record<string, unknown>[] = [];

  for (const code of LOCALES) {
    const consoleEvents: { type: string; text: string }[] = [];
    const onConsole = (msg: { type: () => string; text: () => string }) => {
      consoleEvents.push({ type: msg.type(), text: msg.text() });
    };
    page.on("console", onConsole);
    const onPageError = (err: Error) => consoleEvents.push({ type: "pageerror", text: err.message });
    page.on("pageerror", onPageError);
    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/${code}/`, { waitUntil: "domcontentloaded" });
      const expectedPlaceholder = translate(code, "header.searchPlaceholder");
      const expectedHome = translate(code, "nav.home");
      const expectedCategories = translate(code, "nav.allCategories");
      await page.waitForFunction(
        ([expectedLang, expectedDir]) =>
          document.documentElement.lang === expectedLang && document.documentElement.dir === expectedDir,
        [code, code === "ar" ? "rtl" : "ltr"] as const,
        { timeout: 20_000 }
      );
      await page.locator(".home-sidebar-item span").first().waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      const mainLabel = catalog.mains["cat-01"][code];
      const expectedMenu = await page.evaluate((label) => {
        const lang = document.documentElement.lang;
        const tag = lang === "tr" ? "tr-TR" : lang === "en" ? "en-US" : lang === "de" ? "de-DE" : lang === "pt" ? "pt-PT" : lang;
        return `01. ${label.toLocaleUpperCase(tag)}`;
      }, mainLabel);
      const snap = await page.evaluate(() => {
        const search = document.querySelector<HTMLInputElement>('input[type="search"]');
        const nav = document.querySelector("nav")?.innerText || "";
        const category = document.querySelector(".home-sidebar-item span")?.textContent || "";
        return {
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          placeholder: search?.placeholder || "",
          searchVisible: Boolean(search && search.getClientRects().length),
          nav,
          category,
        };
      });
      await page.screenshot({ path: path.join(out, "locales", `${code}-desktop.png`) });
      await page.locator(".home-sidebar-item").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, "locales", `${code}-categories.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.setViewportSize({ width: 375, height: 812 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const headerBox = await page.locator(".site-header").boundingBox();
      await page.screenshot({ path: path.join(out, "locales", `${code}-mobile.png`) });
      await page.setViewportSize({ width: 1280, height: 720 });
      const search = page.locator('input[type="search"]');
      await search.fill("sku");
      const typed = await search.inputValue();
      await search.fill("");
      await page.locator(".home-sidebar-item").first().hover();
      const panelVisible = await page.locator(".mega-panel").isVisible().catch(() => false);
      const panelText = (await page.locator(".mega-panel").innerText().catch(() => "")) || "";
      const women = catalog.textile["cat-01-01"][code];
      const dress = catalog.textile["cat-01-01-01"][code];
      const selectedCountry = await page.locator(".country-selector select").inputValue();
      const expectedCountry = countryNames.names[selectedCountry]?.[code] || "";
      const shownCountry = (await page.locator(".country-selector select option:checked").innerText().catch(() => "")) || "";
      const mixedTurkish = code !== "tr" && panelText.includes("Elbise");
      const mixedGerman = code !== "de" && panelText.includes("Damenbekleidung");
      const errors = consoleEvents.filter((event) => event.type === "error" || event.type === "pageerror");
      rows.push({
        code,
        lang: snap.lang,
        dir: snap.dir,
        expectedDir: code === "ar" ? "rtl" : "ltr",
        placeholder: snap.placeholder,
        expectedPlaceholder,
        placeholderOk: snap.placeholder === expectedPlaceholder,
        homeOk: snap.nav.includes(expectedHome),
        categoriesOk: snap.nav.includes(expectedCategories),
        category: snap.category,
        expectedMenu,
        categoryOk: snap.category === expectedMenu,
        women,
        dress,
        panelHasWomen: panelText.includes(women),
        panelHasDress: panelText.includes(dress),
        mixedTurkish,
        mixedGerman,
        selectedCountry,
        expectedCountry,
        shownCountry,
        countryOk: Boolean(expectedCountry) && shownCountry.includes(expectedCountry),
        searchVisible: snap.searchVisible,
        typed,
        panelVisible,
        headerBox,
        hydrationError: errors.some((event) => /hydrat/i.test(event.text)),
        consoleErrors: errors.map((event) => event.text.slice(0, 4000)),
      });
    } catch (error) {
      rows.push({ code, failed: String(error).slice(0, 500), consoleErrors: consoleEvents });
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }

  fs.writeFileSync(path.join(out, "locales.json"), JSON.stringify(rows, null, 2));
  const bad = rows.filter((row) => {
    const box = row.headerBox as { x?: number; width?: number } | undefined;
    const headerOnScreen = Boolean(box && (box.width || 0) > 100 && (box.x || 0) < 375 && (box.x || 0) + (box.width || 0) > 0);
    return row.failed || row.placeholderOk === false || row.homeOk === false || row.dir !== row.expectedDir || row.lang !== row.code || row.searchVisible === false || row.typed !== "sku" || row.panelVisible === false || row.categoryOk === false || row.panelHasWomen === false || row.panelHasDress === false || row.mixedTurkish === true || row.mixedGerman === true || row.countryOk === false || row.hydrationError === true || !headerOnScreen;
  });
  expect(bad.map((row) => row.code)).toEqual([]);
});
