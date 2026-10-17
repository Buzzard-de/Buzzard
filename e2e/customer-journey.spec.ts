import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";
import { postCommerce } from "./helpers/commerceRequest";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function resolvePublicProduct(request: import("@playwright/test").APIRequestContext) {
  const catalog = await request.get(`${API}/api/catalog/products?page=1&limit=5`);
  if (!catalog.ok()) return null;
  const body = await catalog.json();
  const product = (body.items || []).find(
    (item: { id?: string; price?: number; slug?: string; name?: string; title?: string; seo?: { slug?: string } }) =>
      item?.id && Number(item.price) > 0
  );
  if (!product) return null;
  const slug = product.slug || product.seo?.slug;
  return { id: product.id, slug, name: product.name || product.title };
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
}

async function completeCheckoutSteps(page: import("@playwright/test").Page) {
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('input[type="email"]').fill("test@example.com");
  await page.locator('.checkout-section input[autocomplete="given-name"]').first().fill("Test");
  await page.locator('.checkout-section input[autocomplete="family-name"]').first().fill("Kunde");
  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.locator("#shipping-firstName").fill("Test");
  await page.locator("#shipping-lastName").fill("Kunde");
  await page.locator("#shipping-street").fill("Teststraße 1");
  await page.locator("#shipping-zip").fill("10115");
  await page.locator("#shipping-city").fill("Berlin");
  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.locator('input[name="shippingMethod"]').first().check();
  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.locator('input[name="paymentProvider"]').first().check();
  await page.getByRole("button", { name: /weiter|next/i }).click();

  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.getByRole("button", { name: /bestellen|order|place/i }).click();
}

test.describe("Part 10 — Customer journey (commerce dry-run)", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("homepage skip link is keyboard reachable and targets main", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    const skip = page.locator("a.skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#maincontent");
    await skip.press("Enter");
    await expect(page.locator("#maincontent")).toBeVisible();
  });

  test("product detail page loads for a static catalog slug", async ({ page }) => {
    // Static export PDP params come from lib/products, not the PIM /api/catalog list.
    await page.goto("/produkt/premium-bremsscheibe-testprodukt/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/missing param|Internal Server Error/i);
    await expect(page.locator("#maincontent")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Bremsscheibe|Buzzard/i);
    await assertNoHorizontalOverflow(page);
  });

  test("unknown product slug fails closed without inventing a product", async ({ page }) => {
    const response = await page.goto("/produkt/zz-kein-produkt-xyz/", { waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    expect([404, 200]).toContain(status);
    await expect(page.locator("body")).not.toContainText(/missing param/i);
    await expect(page.locator("body")).toContainText(/nicht gefunden|404/i);
    await expect(page.locator("body")).not.toContainText(/€9,99|live campaign/i);
  });

  test("QR campaign landing stays catalog-only", async ({ page }) => {
    await page.goto("/kampanya/qr/?lang=de", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(/Treue-QR|loyalty QR|sadakat QR/i);
    await expect(page.locator("body")).toContainText(/Katalogmodus|Catalog mode|Katalog modu/i);
    await expect(page.locator("body")).not.toContainText(/€9,99|€19,99|live campaign/i);
    await assertNoHorizontalOverflow(page);
  });

  test("QR Arabic landing is RTL and still catalog-only", async ({ page }) => {
    await page.goto("/kampanya/qr/?lang=ar", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".qr-campaign-page")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1")).toContainText(/ولاء|loyalty QR|Treue-QR/i);
    await expect(page.locator("[data-campaign-live]")).toHaveAttribute("data-campaign-live", "false");
    await expect(page.locator("body")).toContainText(/الكتالوج|Catalog mode|Katalogmodus/i);
    await assertNoHorizontalOverflow(page);
  });

  test("invalid product cannot enter the cart", async ({ request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "API cart invariant is project-independent; extra projects share the IP cart limiter",
    );
    const sessionId = `e2e-bad-${Date.now()}`;
    const cartRes = await postCommerce(request, `${API}/api/commerce/cart`, {
      sessionId,
      country: "DE",
    });
    expect(cartRes.ok()).toBeTruthy();
    const cartId = (await cartRes.json()).cart.id;
    const addRes = await postCommerce(request, `${API}/api/commerce/cart/${cartId}/items`, {
      productId: "missing-product-xyz",
      quantity: 1,
      sessionId,
    });
    expect(addRes.ok()).toBeFalsy();
    const body = await addRes.json();
    expect(body.errorKey || body.error || body.message).toBeTruthy();
  });

  test("customer account stays behind sign-in and does not leak QR PII", async ({ page }) => {
    await page.goto("/konto/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/bzqr_[0-9a-f]{32}|IBAN|@gmail\.com/i);
    await assertNoHorizontalOverflow(page);
  });

  test("warenkorb page loads", async ({ page }) => {
    await page.goto("/warenkorb/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("product → cart → checkout → READINESS_TEST success", async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "checkout API setup is project-independent; extra projects share the IP cart limiter",
    );
    const product = await resolvePublicProduct(request);
    test.skip(!product, "no public catalog product in this isolated environment");
    if (!product) return;

    const sessionId = `e2e-ui-${Date.now()}`;
    const cartRes = await postCommerce(request, `${API}/api/commerce/cart`, {
      sessionId,
      country: "DE",
    });
    expect(cartRes.ok()).toBeTruthy();
    const cartId = (await cartRes.json()).cart.id;
    const addRes = await postCommerce(request, `${API}/api/commerce/cart/${cartId}/items`, {
      productId: product.id,
      quantity: 1,
      sessionId,
    });
    expect(addRes.ok()).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((id) => {
      localStorage.setItem("buzzard_commerce_cart_id", id);
    }, cartId);

    await page.goto("/warenkorb/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/warenkorb|cart|summe|total|produkt|demo|universal/i, {
      timeout: 20_000,
    });
    await assertNoHorizontalOverflow(page);

    await page.goto("/checkout/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/Internal Server Error/i);
    await expect(page.locator("body")).toContainText(/anfrage|inquiry|katalog|catalog|kasse|checkout/i);
    await expect(page.locator('input[name="paymentProvider"]')).toHaveCount(0);

    const attempt = await request.post(`${API}/api/commerce/checkout/attempt`, {
      data: { cartId, orderType: "COMMERCIAL" },
    });
    expect(attempt.ok()).toBeTruthy();
    const attemptBody = await attempt.json();
    expect(attemptBody.blocked === true || attemptBody.salesEnabled === false).toBeTruthy();
    expect(Number(attemptBody.commercialOrders || 0)).toBe(0);
    expect(attemptBody.realPayment).not.toBe(true);
  });
});

test.describe("Mobile five-stage category UX", () => {
  test("home drills into master-tree categories on phone", async ({ page }, testInfo) => {
    const width = page.viewportSize()?.width ?? testInfo.project.use.viewport?.width ?? 1280;
    if (width >= 768) test.skip();

    await page.addInitScript(() => {
      localStorage.setItem(
        "buzzard_consent_v1",
        JSON.stringify({
          necessary: true,
          analytics: false,
          marketing: false,
          updatedAt: new Date().toISOString(),
        })
      );
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".buzzard-mobile-header img[alt='Buzzard Logo']")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-header-link[href='/konto/']")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-bottom-nav")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-trust")).toHaveCount(0);
    await expect(page.locator(".home-hero-campaign")).toBeHidden();

    const card = page.locator(".home-category-tile").first();
    await expect(card).toBeVisible();
    await card.click({ force: true });
    await page.waitForURL(/\/kategorie\//, { timeout: 15_000 });
    const mainCategoryUrl = page.url();
    await expect(page.locator(".buzzard-mobile-category-hero")).toBeVisible();

    const row = page.locator(".buzzard-mobile-category-row").first();
    await expect(row).toBeVisible();
    await expect(row.locator(".buzzard-mobile-category-row-icon")).toBeVisible();
    await row.click();
    await expect(page).not.toHaveURL(mainCategoryUrl);
    await expect(page.locator(".buzzard-mobile-breadcrumb")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-category-hero")).toBeVisible();
    await page.getByRole("button", { name: /back|zurück|geri|رجوع/i }).click();
    await expect(page).toHaveURL(mainCategoryUrl);
    await expect(page.locator(".buzzard-mobile-category-hero")).toBeVisible();
  });
});

test.describe("Part 10 — Mobile layout checks", () => {
  test.describe.configure({ mode: "serial" });

  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`no horizontal overflow — ${label}`, async ({ page }, testInfo) => {
      if (testInfo.project.name !== "chromium-desktop" && label.startsWith("desktop")) {
        test.skip();
      }
      if (label === "mobile320") {
        // Part 12 — 320px overflow fix re-enabled
      }
      await page.setViewportSize(viewport);
      for (const path of ["/", "/warenkorb/", "/checkout/"]) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await assertNoHorizontalOverflow(page);
      }
    });
  }
});
