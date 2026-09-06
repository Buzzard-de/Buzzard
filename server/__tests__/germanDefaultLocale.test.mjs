import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const localeResolution = require("../lib/global/localeResolution.js");
const countryRegistry = require("../core/globalCountryRegistry.js");
test("default locale constant is German", () => {
  const src = readFileSync(resolve("lib/i18n/routing.ts"), "utf8");
  assert.match(src, /DEFAULT_LOCALE: BuzzardLocale = "de"/);
});

test("default country code is Germany", () => {
  assert.equal(countryRegistry.getDefaultCountryCode(), "DE");
});

test("language resolution defaults to German without browser autodetect", () => {
  const resolved = localeResolution.resolveLanguage({
    browserLanguages: ["en-US", "en"],
    countryCode: undefined,
  });
  assert.equal(resolved.language, "de");
  assert.equal(resolved.source, "global_default");
});

test("country default still applies when country is set", () => {
  const resolved = localeResolution.resolveLanguage({
    browserLanguages: ["de-DE"],
    countryCode: "TR",
  });
  assert.equal(resolved.language, "tr");
  assert.equal(resolved.source, "country_default");
});

test("frontend detectLocale uses German as site default", () => {
  const src = readFileSync(resolve("lib/i18n/detect.ts"), "utf8");
  assert.match(src, /export function detectLocale\(\)[\s\S]*?return readStoredLocale\(\) \?\? "de"/);
  assert.doesNotMatch(src, /export function detectLocale\(\)[\s\S]*?detectBrowserLocale\(\)/);
});

test("frontend market detection defaults to Germany", () => {
  const src = readFileSync(resolve("lib/market/countries.ts"), "utf8");
  assert.match(src, /return defaultMarketCountryCode\(\)/);
});
