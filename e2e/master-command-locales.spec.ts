import { test, expect } from "@playwright/test";
import { LANGUAGE_CODES } from "../lib/i18n/languages";

test.describe("30 locale prefixes", () => {
  test("every catalog locale landing returns below 500", async ({ request }) => {
    expect(LANGUAGE_CODES).toHaveLength(30);
    for (const locale of LANGUAGE_CODES) {
      const res = await request.get(`/${locale}/`);
      expect(res.status(), locale).toBeLessThan(500);
    }
  });
});
