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

async function assertLocaleControlsAreReadable(page: import("@playwright/test").Page) {
  const issues = await page.locator(".mobile-home-locale-control").evaluateAll((controls) =>
    controls.flatMap((control) => {
      const label = control.querySelector(".mobile-home-locale-label");
      const selector = control.querySelector(".language-selector, .country-selector");
      const select = control.querySelector("select");
      if (!label || !selector || !select) return ["missing control element"];

      const controlBox = control.getBoundingClientRect();
      const labelBox = label.getBoundingClientRect();
      const selectorBox = selector.getBoundingClientRect();
      const selectStyle = window.getComputedStyle(select);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) context.font = selectStyle.font;
      const selectedText = select.options[select.selectedIndex]?.text ?? "";
      const selectedTextWidth = context?.measureText(selectedText).width ?? 0;
      const availableTextWidth =
        select.clientWidth -
        Number.parseFloat(selectStyle.paddingInlineStart) -
        Number.parseFloat(selectStyle.paddingInlineEnd) -
        14;
      const overlap = !(
        labelBox.bottom <= selectorBox.top ||
        labelBox.top >= selectorBox.bottom ||
        labelBox.right <= selectorBox.left ||
        labelBox.left >= selectorBox.right
      );
      const contained =
        labelBox.left >= controlBox.left - 1 &&
        labelBox.right <= controlBox.right + 1 &&
        selectorBox.left >= controlBox.left - 1 &&
        selectorBox.right <= controlBox.right + 1;

      return [
        ...(overlap ? [`${label.textContent?.trim()}: label overlaps selected value`] : []),
        ...(!contained ? [`${label.textContent?.trim()}: content exceeds control`] : []),
        ...(select.getBoundingClientRect().width < 90 ? [`${label.textContent?.trim()}: selected value is too narrow`] : []),
        ...(selectedTextWidth > availableTextWidth
          ? [`${label.textContent?.trim()}: "${selectedText}" is clipped`]
          : []),
      ];
    }),
  );
  expect(issues).toEqual([]);
}

async function assertHeroActionsLayout(
  page: import("@playwright/test").Page,
  layout: "row" | "column",
) {
  const buttons = page.locator(".home-hero-actions .home-hero-btn");
  await expect(buttons).toHaveCount(2);
  await assertLabelsAreNotClipped(page, ".home-hero-actions .home-hero-btn");
  const boxes = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
  expect(Math.abs(boxes[0].top - boxes[1].top) <= 2).toBe(layout === "row");
  expect(boxes[0].bottom <= boxes[1].top || boxes[0].right <= boxes[1].left).toBe(true);
}

async function assertLastCategoryClearsBottomNav(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const categories = [...document.querySelectorAll(".home-category-tile")];
        const finalRow = categories.slice(-2);
        const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
        if (finalRow.length !== 2 || !bottomNav) return null;
        const navBox = bottomNav.getBoundingClientRect();
        return {
          categoryBottom: Math.max(...finalRow.map((category) => category.getBoundingClientRect().bottom)),
          navTop: navBox.top,
        };
      }),
    )
    .not.toBeNull();

  const clearance = await page.evaluate(() => {
    const categories = [...document.querySelectorAll(".home-category-tile")];
    const finalRow = categories.slice(-2);
    const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (finalRow.length !== 2 || !bottomNav) return -1;
    const finalRowBottom = Math.max(...finalRow.map((category) => category.getBoundingClientRect().bottom));
    return bottomNav.getBoundingClientRect().top - finalRowBottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(32);
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

  for (const locale of ["de", "tr"] as const) {
    for (const width of [320, 390] as const) {
      test(`${locale} locale and market controls remain readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await applyLocale(page, locale);
        await expect(page.locator(".mobile-home-locale-market .language-selector select")).toHaveValue(locale);
        await expect(page.locator(".mobile-home-locale-market .country-selector select")).toHaveValue("DE");
        await assertLocaleControlsAreReadable(page);
        await expect(page.locator(".mobile-home-locale-value").nth(0)).toHaveText(locale === "de" ? "Deutsch" : "Türkçe");
        await expect(page.locator(".mobile-home-locale-value").nth(1)).toContainText("Deutschland");
        await assertLabelsAreNotClipped(page, ".mobile-home-locale-value");
        await assertHeroActionsLayout(page, width === 320 ? "column" : "row");
        await assertNoHorizontalOverflow(page);
        await assertLastCategoryClearsBottomNav(page);
      });
    }
  }

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
