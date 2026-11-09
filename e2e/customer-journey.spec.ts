import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function resolveDemoProduct(request: import("@playwright/test").APIRequestContext) {
  const catalog = await request.get(`${API}/api/catalog/products?limit=1`);
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

async function completeReadinessOrder(request: import("@playwright/test").APIRequestContext, cartId: string) {
  const start = await request.post(`${API}/api/commerce/checkout/start`, {
    data: { cartId, orderType: "READINESS_TEST" },
  });
  const started = await start.json();
  const checkoutId = started.checkout?.id || started.id;
  expect(checkoutId).toBeTruthy();
  const addr = { line1: "E2E 1", city: "Berlin", postalCode: "10115", country: "DE" };
  await request.post(`${API}/api/commerce/checkout/${checkoutId}/validate`, {
    data: { billingAddress: addr, shippingAddress: addr },
  });
  const complete = await request.post(`${API}/api/commerce/checkout/${checkoutId}/complete`, {
    data: { orderType: "READINESS_TEST" },
    headers: { "Idempotency-Key": `e2e-ui-complete-${Date.now()}` },
  });
  const result = await complete.json();
  expect(complete.ok()).toBeTruthy();
  expect(result.order?.orderType).toBe("READINESS_TEST");
  expect(result.payment?.realMoneyMovement).toBe(false);
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
    await expect(page.locator("body")).toBeVisible();
    await completeReadinessOrder(request, cartId);
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
