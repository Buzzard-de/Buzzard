import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveSupportedLocale,
} = require("../lib/canonicalLocales");
const { VALID_LOCALES } = require("../lib/productValidator");
const { getI18nReadiness, REQUIRED_LOCALES } = require("../lib/storefront/storefrontI18nReadiness");
const aiChat = require("../lib/aiChatService");
const notifications = require("../lib/notificationEngine");

describe("canonical server locales", () => {
  it("loads the same 30-locale registry as the frontend JSON", () => {
    const json = JSON.parse(readFileSync(resolve("lib/i18n/supported-locales.json"), "utf8"));
    expect(SUPPORTED_LOCALES).toEqual(json);
    expect(SUPPORTED_LOCALES).toHaveLength(30);
  });

  it("product validator accepts all 30 locales", () => {
    expect(VALID_LOCALES.size).toBe(30);
    for (const locale of SUPPORTED_LOCALES) {
      expect(VALID_LOCALES.has(locale)).toBe(true);
      expect(isSupportedLocale(locale)).toBe(true);
    }
  });

  it("storefront readiness requires all 30 catalogs", () => {
    const readiness = getI18nReadiness();
    expect(REQUIRED_LOCALES).toHaveLength(30);
    expect(readiness.requiredPresent).toBe(true);
    expect(readiness.localeCount).toBe(30);
    expect(readiness.rtlSupport).toBe(true);
    expect(readiness.frConfigured).toBe(true);
  });

  it("AI chat accepts extra locales without clamping to German", () => {
    expect(resolveSupportedLocale("fr")).toBe("fr");
    expect(resolveSupportedLocale("pl")).toBe("pl");
    expect(resolveSupportedLocale("unknown")).toBe("en");
    const result = aiChat.handleMessage({ locale: "fr", message: "hello" });
    expect(result.ok).toBe(true);
    expect(result.reply).toMatch(/Hello!|assistant/i);
    expect(result.reply).not.toMatch(/Hallo! Ich bin der Buzzard/);
  });

  it("notification engine resolves extra locales to English, not German", () => {
    const rendered = notifications.renderTemplate("new_order", "fr", { orderNumber: "1" });
    expect(resolveSupportedLocale("sv")).toBe("sv");
    expect(rendered.subject).toBe("Order confirmation 1");
    expect(rendered.subject).not.toMatch(/Bestellbestätigung/);
  });
});
