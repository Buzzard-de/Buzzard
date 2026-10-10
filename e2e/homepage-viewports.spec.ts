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

async function assertSearchPlaceholderFits(page: import("@playwright/test").Page) {
  const input = page.locator("#buzzard-mobile-search-input");
  await expect(input).toBeVisible();
  const clipped = await input.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const placeholder = el.getAttribute("placeholder") ?? "";
    return context.measureText(placeholder).width > el.clientWidth + 1;
  });
  expect(clipped).toBe(false);
}

async function assertFabClearsCategoryLabels(page: import("@playwright/test").Page) {
  const overlap = await page.evaluate(() => {
    const fab = document.querySelector(".ai-chat-fab");
    if (!fab) return false;
    const fabBox = fab.getBoundingClientRect();
    return [...document.querySelectorAll(".home-category-tile-label")].some((label) => {
      const box = label.getBoundingClientRect();
      const visible = box.bottom > 0 && box.top < window.innerHeight;
      if (!visible) return false;
      return !(
        box.bottom <= fabBox.top + 2 ||
        box.top >= fabBox.bottom - 2 ||
        box.right <= fabBox.left + 2 ||
        box.left >= fabBox.right - 2
      );
    });
  });
  expect(overlap).toBe(false);
}

async function assertRailRevealsRemainingCategories(page: import("@playwright/test").Page) {
  const rail = page.locator(".mobile-home-category-rail");
  await expect(rail).toBeVisible();
  const locking = await rail.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      position: style.position,
      overflowY: style.overflowY,
      maxHeight: style.maxHeight,
    };
  });
  expect(["static", "relative"]).toContain(locking.position);
  expect(["visible", "clip"]).toContain(locking.overflowY);
  expect(locking.maxHeight).toBe("none");

  await page.locator(".mobile-home-category-rail [data-category-id='cat-09']").scrollIntoViewIfNeeded();
  await expect(page.locator(".mobile-home-category-rail [data-category-id='cat-09']")).toBeVisible();
  await page.locator(".mobile-home-category-rail [data-category-id='cat-53']").scrollIntoViewIfNeeded();
  await expect(page.locator(".mobile-home-category-rail [data-category-id='cat-53']")).toBeVisible();

  const clearance = await page.evaluate(() => {
    const last = document.querySelector(".mobile-home-category-rail [data-category-id='cat-53']");
    const nav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (!last || !nav) return -1;
    return nav.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(4);
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

async function assertPhoneCategoryBoxes(page: import("@playwright/test").Page) {
  const categories = page.locator(".home-category-tile");
  await expect(categories).toHaveCount(50);
  const result = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll(".home-category-tile")];
    const groups = [...document.querySelectorAll(".home-category-tile-group")];
    const ids = tiles.map((tile) => tile.getAttribute("data-category-id") ?? "");
    const numbers = ids.map((id) => Number.parseInt(id.replace("cat-", ""), 10));
    const groupBoxes = groups.map((group) => group.getBoundingClientRect());
    return {
      ids,
      numbers,
      groupCount: groups.length,
      groupSizes: groups.map((group) => group.querySelectorAll(".home-category-tile").length),
      twoColumns:
        groupBoxes.length >= 2 &&
        Math.abs(groupBoxes[0].top - groupBoxes[1].top) <= 2 &&
        groupBoxes[1].left >= groupBoxes[0].right - 1,
      labelsHidden: tiles.every((tile) => {
        const label = tile.querySelector(".home-category-tile-label");
        return !label || window.getComputedStyle(label).display === "none";
      }),
      iconsHidden: tiles.every((tile) => {
        const icon = tile.querySelector(".home-category-tile-icon");
        return !icon || window.getComputedStyle(icon).display === "none";
      }),
    };
  });
  expect(result.ids[0]).toBe("cat-01");
  expect(result.ids.at(-1)).toBe("cat-53");
  expect(result.numbers).toEqual([...result.numbers].sort((a, b) => a - b));
  expect(result.numbers).not.toContain(30);
  expect(result.numbers).not.toContain(37);
  expect(result.numbers).not.toContain(39);
  expect(result.groupCount).toBe(17);
  expect(result.groupSizes.slice(0, -1).every((size) => size === 3)).toBe(true);
  expect(result.groupSizes.at(-1)).toBe(2);
  expect(result.twoColumns).toBe(true);
  expect(result.labelsHidden).toBe(true);
  expect(result.iconsHidden).toBe(true);
}

async function assertSearchUnderLocale(page: import("@playwright/test").Page) {
  const gap = await page.evaluate(() => {
    const locale = document.querySelector(".mobile-home-locale-market");
    const search =
      document.querySelector(".home-phone-controls .buzzard-mobile-search-form") ??
      document.querySelector(".home-phone-controls .buzzard-mobile-search");
    if (!locale || !search) return null;
    return search.getBoundingClientRect().top - locale.getBoundingClientRect().bottom;
  });
  expect(gap).not.toBeNull();
  expect(gap ?? 99).toBeGreaterThanOrEqual(0);
  expect(gap ?? 99).toBeLessThanOrEqual(16);
}

async function assertLastCategoryClearsBottomNav(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const categories = [...document.querySelectorAll(".home-category-tile")];
        const lastCategory = categories.at(-1);
        const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
        if (!lastCategory || !bottomNav) return null;
        const navBox = bottomNav.getBoundingClientRect();
        return {
          categoryBottom: lastCategory.getBoundingClientRect().bottom,
          navTop: navBox.top,
        };
      }),
    )
    .not.toBeNull();

  const clearance = await page.evaluate(() => {
    const categories = [...document.querySelectorAll(".home-category-tile")];
    const lastCategory = categories.at(-1);
    const bottomNav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (!lastCategory || !bottomNav) return -1;
    return bottomNav.getBoundingClientRect().top - lastCategory.getBoundingClientRect().bottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(32);
}

async function assertNoForbiddenCopy(page: import("@playwright/test").Page) {
  const hero = page.locator(".home-hero-campaign");
  if (await hero.isVisible()) {
    const heroText = await hero.innerText();
    for (const phrase of FORBIDDEN) {
      expect(heroText).not.toContain(phrase);
    }
  }
  const usp = page.locator(".usp-bar");
  if ((await usp.count()) > 0 && (await usp.first().isVisible())) {
    const uspText = await usp.first().innerText();
    expect(uspText).not.toContain("Schnelle Lieferung");
    expect(uspText).not.toContain("Einfache Rückgabe");
    expect(uspText).not.toContain("Sichere Zahlung");
  }
}

async function assertCanonicalHome(
  page: import("@playwright/test").Page,
  locale: (typeof LOCALES)[number],
  heroVisible = true,
) {
  const hero = page.locator(".home-hero-campaign");
  if (heroVisible) {
    await expect(hero.locator("h1")).toBeVisible();
    await expect(hero.locator("h1")).toHaveText(HERO_TITLE[locale]);
  } else {
    await expect(hero).toBeHidden();
    await expect(page.locator(".home-category-discovery .home-section-head")).toBeHidden();
  }
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
    await assertCanonicalHome(page, "de", false);
    await expect(page.locator(".buzzard-mobile-vehicle")).toHaveCount(0);
    await expect(page.locator(".mobile-home-category-rail")).toBeVisible();
    const railWidth = await page.locator(".mobile-home-category-rail").evaluate((el) => el.getBoundingClientRect().width);
    expect(railWidth).toBeLessThanOrEqual(64);
    const frames = await page.evaluate(() => {
      const rail = document.querySelector(".mobile-home-category-rail");
      const hero = document.querySelector(".home-hero-campaign");
      if (!rail || !hero) return null;
      const railStyle = window.getComputedStyle(rail);
      const heroStyle = window.getComputedStyle(hero);
      return {
        railBorder: Number.parseFloat(railStyle.borderInlineEndWidth),
        heroBorder: Number.parseFloat(heroStyle.borderWidth),
      };
    });
    expect(frames?.railBorder).toBe(0);
    expect(frames?.heroBorder).toBe(0);
    await expect(page.locator(".mobile-home-category-rail-link")).toHaveCount(52);
    await expect(page.locator(".mobile-home-category-rail a").first()).toHaveAttribute("href", "/");
    await expect(page.locator(".mobile-home-category-rail-more")).toBeVisible();
    await expect(page.locator(".mobile-home-category-rail a").nth(1)).toHaveAttribute("href", /\/kategorie\//);
    const railStack = await page.evaluate(() => {
      const home = document.querySelector(".mobile-home-category-rail a[href='/']");
      const all = document.querySelector(".mobile-home-category-rail-more");
      const textile = document.querySelector(".mobile-home-category-rail [data-category-id='cat-01']");
      if (!home || !all || !textile) return null;
      const a = home.getBoundingClientRect();
      const b = all.getBoundingClientRect();
      const c = textile.getBoundingClientRect();
      return {
        stacked: Math.abs(a.left - b.left) <= 2 && Math.abs(b.left - c.left) <= 2,
        between: a.bottom <= b.top + 1 && b.bottom <= c.top + 1,
      };
    });
    expect(railStack?.stacked).toBe(true);
    expect(railStack?.between).toBe(true);
    await expect(page.locator(".mobile-home-category-rail [data-category-id]")).toHaveCount(50);
    await expect(page.locator(".mobile-home-category-rail [data-category-id='cat-08']")).toBeVisible();
    await expect(page.locator(".mobile-home-category-rail [data-category-id='cat-09']")).toBeAttached();
    await expect(page.locator(".mobile-home-category-rail [data-category-id]").last()).toHaveAttribute("data-category-id", "cat-53");
    await assertRailRevealsRemainingCategories(page);
    await assertLabelsAreNotClipped(page, ".mobile-home-category-rail-link > span:last-child");
    await assertLabelsAreNotClipped(page, ".home-category-tile-label");
    await assertPhoneCategoryBoxes(page);
    await expect(page.locator(".mobile-home-locale-market .language-selector select option")).toHaveCount(30);
    await expect(page.locator(".mobile-home-locale-market .country-selector select option")).toHaveCount(35);
    await expect(page.locator("#buzzard-mobile-search-input")).toBeVisible();
    await assertSearchPlaceholderFits(page);
    await assertSearchUnderLocale(page);
    await expect(page.locator(".buzzard-mobile-header-link[href='/konto/']")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-header-link[href='/warenkorb/']")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await assertFabClearsCategoryLabels(page);
    await expect(page.locator(".buzzard-mobile-bottom-nav")).toBeVisible();
    const aiNav = page.locator(".buzzard-mobile-bottom-nav-ai");
    await expect(aiNav).toBeVisible();
    await expect(page.locator(".buzzard-mobile-bottom-nav-ai-label")).toHaveText("AI");
    const navOrder = await page.locator(".buzzard-mobile-bottom-nav > *").evaluateAll((els) =>
      els.map((el) => {
        if (el.classList.contains("buzzard-mobile-bottom-nav-ai")) return "ai";
        return (el as HTMLAnchorElement).getAttribute("href") ?? "";
      }),
    );
    expect(navOrder.indexOf("/warenkorb/")).toBeLessThan(navOrder.indexOf("ai"));
    expect(navOrder.indexOf("ai")).toBeLessThan(navOrder.indexOf("/konto/"));
    const aiColors = await page.locator(".buzzard-mobile-bottom-nav-ai-label").evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(aiColors.background).toBe("rgb(27, 143, 58)");
    expect(aiColors.color).toBe("rgb(226, 185, 87)");
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
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertPhoneCategoryBoxes(page);
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
        await expect(page.locator(".home-hero-campaign")).toBeHidden();
        await assertSearchPlaceholderFits(page);
        await assertPhoneCategoryBoxes(page);
        if (width >= 390) await assertSearchUnderLocale(page);
        await assertNoHorizontalOverflow(page);
        await assertLastCategoryClearsBottomNav(page);
        await assertFabClearsCategoryLabels(page);
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
    await assertCanonicalHome(page, "de", false);
    const mobileLanguage = page.locator(".mobile-home-locale-market .language-selector select");
    const mobileMarket = page.locator(".mobile-home-locale-market .country-selector select");
    await expect(mobileMarket).toHaveValue("DE");
    await mobileLanguage.selectOption("tr");
    await expect(mobileMarket).toHaveValue("DE");
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertSearchUnderLocale(page);
    await assertNoHorizontalOverflow(page);
  });

  test("reference-width 430px shows all canonical categories in one ordered column", async ({ page }) => {
    await dismissConsent(page, "tr");
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/");
    await expect(page.locator(".mobile-home-category-rail a").first()).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertPhoneCategoryBoxes(page);
    await assertSearchUnderLocale(page);
    await assertLabelsAreNotClipped(page, ".home-category-tile-label");
    await assertNoHorizontalOverflow(page);
  });

  test("landscape 844x390 German — phone layout, same hero", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalHome(page, "de", false);
    await expect(page.locator(".home-fullscreen")).toBeHidden();
    await assertPhoneCategoryBoxes(page);
    await assertSearchUnderLocale(page);
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
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
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
      await expect(page.locator(".home-hero-campaign")).toBeHidden();
      await assertCanonicalHome(page, locale, false);
      await assertNoHorizontalOverflow(page);
      if (locale === "tr" || locale === "fr" || locale === "ar") {
        await page.screenshot({ path: `test-results/homepage-${locale}-portrait.png`, fullPage: false });
      }
    });
  }
});
