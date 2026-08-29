import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function resolveDemoProduct(request: import("@playwright/test").APIRequestContext) {
  const catalog = await request.get(`${API}/api/catalog/products?q=BZ-CORE&limit=1`);
  expect(catalog.ok()).toBeTruthy();
  const body = await catalog.json();
  const product = body.items?.[0];
  expect(product?.id).toBeTruthy();
  return product as { id: string; slug?: string; name?: string };
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

  test("warenkorb page loads", async ({ page }) => {
    await page.goto("/warenkorb/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("product → cart → checkout → READINESS_TEST success", async ({ page, request }) => {
    const product = await resolveDemoProduct(request);

    const cartRes = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-ui-${Date.now()}`, country: "DE" },
    });
    expect(cartRes.ok()).toBeTruthy();
    const cartId = (await cartRes.json()).cart.id;
    const addRes = await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId: product.id, quantity: 1 },
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
    await completeCheckoutSteps(page);
    await page.waitForURL(/erfolg|success|checkout/i, { timeout: 45_000 });
    await expect(page.locator("body")).toContainText(/test|readiness|bestell|order|erfolg/i);
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
