import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const LOCALES = ["de", "en", "tr", "fr", "ar"] as const;
const FORBIDDEN = [
  "Die richtigen Teile für Ihr Fahrzeug",
  "Aracınız için doğru parçalar",
  "Breites Sortiment, zuverlässige Lieferanten, schnelle Lieferung.",
  "Schnelle Lieferung",
  "Einfache Rückgabe",
  "Sichere Zahlung",
];

const HERO_TITLE: Record<(typeof LOCALES)[number], string> = {
  de: "Entdecken Sie unser Sortiment",
  en: "Discover our range",
  tr: "Ürün yelpazemizi keşfedin",
  fr: "Découvrez notre assortiment",
  ar: "اكتشف مجموعتنا",
};

async function dismissConsent(page: import("@playwright/test").Page, locale = "de") {
  await page.addInitScript(
    ({ locale: code }) => {
      localStorage.setItem(
        "buzzard_consent_v1",
        JSON.stringify({ necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString() }),
      );
      localStorage.setItem("buzzard_locale", code);
      localStorage.setItem("buzzard_locale_manual", "1");
      localStorage.setItem("buzzard_market_country", "DE");
      localStorage.setItem("buzzard_market_country_manual", "1");
    },
    { locale },
  );
}

async function applyLocale(page: import("@playwright/test").Page, locale: string) {
  await dismissConsent(page, locale);
  await page.goto("/");
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
}

async function assertAiAboveBottomNav(page: import("@playwright/test").Page) {
  const collision = await page.evaluate(() => {
    const fab = document.querySelector(".ai-chat-fab");
    const nav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (!fab || !nav) return false;
    const a = fab.getBoundingClientRect();
    const b = nav.getBoundingClientRect();
    return !(a.bottom <= b.top + 2 || a.top >= b.bottom - 2 || a.right <= b.left + 2 || a.left >= b.right - 2);
  });
  expect(collision).toBe(false);
}

async function assertLabelsAreNotClipped(
  page: import("@playwright/test").Page,
  selector: string,
) {
  const clippedLabels = await page.locator(selector).evaluateAll((labels) =>
    labels
      .filter((label) => {
        const style = window.getComputedStyle(label);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .filter((label) => label.scrollHeight > label.clientHeight + 1 || label.scrollWidth > label.clientWidth + 1)
      .map((label) => label.textContent?.trim()),
  );
  expect(clippedLabels).toEqual([]);
}

async function assertLastCategoryClearsBottomNav(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const lastCategory = document.querySelector(".home-category-tile:last-child");
        const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
        if (!lastCategory || !bottomNav) return null;
        const categoryBox = lastCategory.getBoundingClientRect();
        const navBox = bottomNav.getBoundingClientRect();
        return {
          categoryBottom: categoryBox.bottom,
          navTop: navBox.top,
        };
      }),
    )
    .not.toBeNull();

  const clearance = await page.evaluate(() => {
    const lastCategory = document.querySelector(".home-category-tile:last-child");
    const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (!lastCategory || !bottomNav) return false;
    return lastCategory.getBoundingClientRect().bottom <= bottomNav.getBoundingClientRect().top;
  });
  expect(clearance).toBe(true);
}

async function assertNoForbiddenCopy(page: import("@playwright/test").Page) {
  const heroText = await page.locator(".home-hero-campaign").innerText();
  for (const phrase of FORBIDDEN) {
    expect(heroText).not.toContain(phrase);
  }
  const usp = page.locator(".usp-bar");
  if ((await usp.count()) > 0 && (await usp.first().isVisible())) {
    const uspText = await usp.first().innerText();
    expect(uspText).not.toContain("Schnelle Lieferung");
    expect(uspText).not.toContain("Einfache Rückgabe");
    expect(uspText).not.toContain("Sichere Zahlung");
  }
}

async function assertCanonicalHome(page: import("@playwright/test").Page, locale: (typeof LOCALES)[number]) {
  const hero = page.locator(".home-hero-campaign");
  await expect(hero.locator("h1")).toBeVisible();
  await expect(hero.locator("h1")).toHaveText(HERO_TITLE[locale]);
  await expect(page.locator(".buzzard-mobile-hero")).toHaveCount(0);
  await expect(page.locator(".buzzard-mobile-trust")).toHaveCount(0);
  await expect(page.locator(".home-category-tile")).toHaveCount(50);
  await expect(page.locator("html")).toHaveAttribute("data-buzzard-locale", locale);
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  await assertNoForbiddenCopy(page);
}

test.describe("homepage viewports", () => {
  test("portrait 390x844 German — one canonical hero, 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalHome(page, "de");
    await expect(page.locator(".buzzard-mobile-vehicle")).toHaveCount(0);
    await expect(page.locator(".mobile-home-category-rail")).toBeVisible();
    await expect(page.locator(".mobile-home-category-rail-link")).toHaveCount(10);
    await expect(page.locator(".mobile-home-category-rail a").first()).toHaveAttribute("href", /\/kategorie\//);
    await assertLabelsAreNotClipped(page, ".mobile-home-category-rail-link > span:last-child");
    await assertLabelsAreNotClipped(page, ".home-category-tile-label");
    await expect(page.locator(".mobile-home-locale-market .language-selector select option")).toHaveCount(30);
    await expect(page.locator(".mobile-home-locale-market .country-selector select option")).toHaveCount(35);
    await expect(page.locator("#buzzard-mobile-search-input")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-header-link[href='/konto/']")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-header-link[href='/warenkorb/']")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await expect(page.locator(".buzzard-mobile-bottom-nav")).toBeVisible();
    await assertLastCategoryClearsBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-de-portrait.png", fullPage: false });
    await page.locator(".buzzard-mobile-header-btn").first().click();
    await expect(page.locator(".mega-menu-locale-market .language-selector select option")).toHaveCount(30);
    await expect(page.locator(".mega-menu-locale-market .country-selector select option")).toHaveCount(35);
  });

  test("narrow 320px homepage collapses the category rail to the accessible menu", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile320);
    await page.goto("/");
    await expect(page.locator(".mobile-home-category-rail")).toBeHidden();
    await expect(page.locator(".home-hero-campaign")).toBeVisible();
    await expect(page.locator(".home-category-grid")).toHaveCSS("grid-template-columns", /.+ .+/);
    await assertLabelsAreNotClipped(page, ".home-category-tile-label");
    await assertLastCategoryClearsBottomNav(page);
    await page.locator(".buzzard-mobile-header-btn").first().click();
    await expect(page.locator(".mega-menu-overlay")).toBeVisible();
    await expect(page.locator(".home-sidebar.embedded .home-sidebar-item")).toHaveCount(50);
    await assertNoHorizontalOverflow(page);
  });

  test("mobile homepage search submits to the working product search route", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    const search = page.locator("#buzzard-mobile-search-input");
    await search.fill("textil");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/products\/\?q=textil$/);
  });

  test("portrait 393x852 German — same canonical content", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile393);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalHome(page, "de");
    const mobileLanguage = page.locator(".mobile-home-locale-market .language-selector select");
    const mobileMarket = page.locator(".mobile-home-locale-market .country-selector select");
    await expect(mobileMarket).toHaveValue("DE");
    await mobileLanguage.selectOption("tr");
    await expect(mobileMarket).toHaveValue("DE");
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.tr);
    await assertNoHorizontalOverflow(page);
  });

  test("landscape 844x390 German — phone layout, same hero", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalHome(page, "de");
    await expect(page.locator(".home-fullscreen")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-de-landscape.png", fullPage: false });
  });

  test("tablet 768x1024 is not the phone chrome", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body.buzzard-phone-storefront")).toHaveCount(0);
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.de);
    await expect(page.locator(".home-category-tile")).toHaveCount(50);
  });

  test("desktop 1440x900 shares the same hero and 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.desktop1440);
    await page.goto("/");
    await assertCanonicalHome(page, "de");
    await expect(page.locator(".vehicle-select-btn")).toBeVisible();
    const languageSelect = page.locator(".site-header .language-selector select");
    const marketSelect = page.locator(".site-header .country-selector select");
    await expect(languageSelect.locator("option")).toHaveCount(30);
    await expect(marketSelect.locator("option")).toHaveCount(35);
    const marketBefore = await marketSelect.inputValue();
    await languageSelect.selectOption("tr");
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.tr);
    await expect(marketSelect).toHaveValue(marketBefore);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/homepage-de-desktop.png", fullPage: false });
  });

  test("arabic landscape 844x390 — RTL phone layout", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await applyLocale(page, "ar");
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.ar, { timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("data-buzzard-locale", "ar");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-ar-landscape.png", fullPage: false });
  });

  for (const locale of LOCALES) {
    test(`portrait ${locale} homepage loads without overflow or legacy automotive hero`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile390);
      await applyLocale(page, locale);
      await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE[locale], { timeout: 20_000 });
      await assertCanonicalHome(page, locale);
      await assertNoHorizontalOverflow(page);
      if (locale === "tr" || locale === "fr" || locale === "ar") {
        await page.screenshot({ path: `test-results/homepage-${locale}-portrait.png`, fullPage: false });
      }
    });
  }
});
