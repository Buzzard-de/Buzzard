import { test, expect } from "@playwright/test";

const COUNTRY_LOCALE_CASES: Array<{ country: string; locale: string; dir: "ltr" | "rtl" }> = [
  { country: "DE", locale: "de", dir: "ltr" },
  { country: "FR", locale: "fr", dir: "ltr" },
  { country: "IT", locale: "it", dir: "ltr" },
  { country: "NL", locale: "nl", dir: "ltr" },
  { country: "SA", locale: "ar", dir: "rtl" },
];

async function dismissConsentIfPresent(page: import("@playwright/test").Page) {
  const accept = page.getByRole("button", { name: /alle akzeptieren|all accept|nur notwendig|only necessary/i });
  if (await accept.count()) {
    await accept.first().click();
  }
}

async function readLocaleState(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    locale: localStorage.getItem("buzzard_locale"),
    country: localStorage.getItem("buzzard_market_country"),
    dir: document.documentElement.dir || "ltr",
    lang: document.documentElement.lang,
    cart: localStorage.getItem("buzzard_cart"),
    cartId: localStorage.getItem("buzzard_commerce_cart_id"),
    token: sessionStorage.getItem("buzzard_account_token"),
  }));
}

async function selectCountry(page: import("@playwright/test").Page, countryCode: string) {
  const selector = page.locator(".country-selector select");
  await selector.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const select = document.querySelector(".country-selector select") as HTMLSelectElement | null;
    return Boolean(select && select.options.length >= 30);
  });
  await selector.selectOption({ value: countryCode });
  await page.waitForFunction(
    (code) => localStorage.getItem("buzzard_market_country") === code,
    countryCode,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => localStorage.getItem("buzzard_locale") !== null,
    null,
    { timeout: 20_000 },
  );
}

test.describe("Country → Language browser E2E (#351)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const keepStorage = testInfo.title.includes("persistence reload");
    if (!keepStorage) {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    await page.goto("/", { waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    await page.locator(".country-selector select").waitFor({ state: "visible", timeout: 20_000 });
  });

  for (const { country, locale, dir } of COUNTRY_LOCALE_CASES) {
    test(`${country} selection → locale ${locale}, dir ${dir}`, async ({ page }) => {
      await selectCountry(page, country);
      const state = await readLocaleState(page);
      expect(state.country).toBe(country);
      expect(state.locale).toBe(locale);
      expect(state.dir).toBe(dir);
    });
  }

  test("SA rtl → DE ltr direction flip", async ({ page }) => {
    await selectCountry(page, "SA");
    expect((await readLocaleState(page)).dir).toBe("rtl");

    await selectCountry(page, "DE");
    expect((await readLocaleState(page)).dir).toBe("ltr");
  });

  test("persistence reload keeps DE/de after reload", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    await selectCountry(page, "DE");
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    const state = await readLocaleState(page);
    expect(state.country).toBe("DE");
    expect(state.locale).toBe("de");
  });

  test("persistence reload keeps FR/fr after reload", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    await selectCountry(page, "FR");
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    const state = await readLocaleState(page);
    expect(state.country).toBe("FR");
    expect(state.locale).toBe("fr");
  });

  test("persistence reload keeps SA/ar/rtl after reload", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    await selectCountry(page, "SA");
    await page.reload({ waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    const state = await readLocaleState(page);
    expect(state.country).toBe("SA");
    expect(state.locale).toBe("ar");
    expect(state.dir).toBe("rtl");
  });

  test("cart and auth token preserved across country switch", async ({ page }) => {
    await page.evaluate(() => {
      const cart = [
        {
          lineId: "e2e-prod-1",
          productId: "e2e-prod-1",
          name: "E2E Brake Pad",
          sku: "E2E-SKU",
          unitPrice: 9.99,
          qty: 1,
          variantIds: [],
          variantLabel: "",
          vatRate: 0.19,
        },
      ];
      localStorage.setItem("buzzard_cart", JSON.stringify(cart));
      localStorage.setItem("buzzard_commerce_cart_id", "e2e-cart-id");
      sessionStorage.setItem("buzzard_account_token", "e2e-token-keep");
    });

    await selectCountry(page, "FR");
    let state = await readLocaleState(page);
    expect(state.locale).toBe("fr");
    expect(JSON.parse(state.cart!)).toHaveLength(1);
    expect(JSON.parse(state.cart!)[0].productId).toBe("e2e-prod-1");
    expect(state.cartId).toBe("e2e-cart-id");
    expect(state.token).toBe("e2e-token-keep");

    await selectCountry(page, "SA");
    state = await readLocaleState(page);
    expect(state.locale).toBe("ar");
    expect(JSON.parse(state.cart!)[0].productId).toBe("e2e-prod-1");
    expect(state.token).toBe("e2e-token-keep");
  });

  test("path preservation on prefix locale switch de → ar", async ({ page }) => {
    await page.goto("/de/products/", { waitUntil: "networkidle" });
    await dismissConsentIfPresent(page);
    await page.locator(".country-selector select").waitFor({ state: "visible" });
    await selectCountry(page, "SA");
    await expect(page).toHaveURL(/\/ar\/products/, { timeout: 20_000 });
  });
});
