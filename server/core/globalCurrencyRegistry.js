/**
 * Central currency registry — localization infrastructure only, no sales activation.
 */
const CURRENCIES = Object.freeze({
  EUR: { code: "EUR", symbol: "€", decimalDigits: 2, locale: "de-DE", position: "suffix", formatRule: "standard" },
  GBP: { code: "GBP", symbol: "£", decimalDigits: 2, locale: "en-GB", position: "prefix", formatRule: "standard" },
  CHF: { code: "CHF", symbol: "CHF", decimalDigits: 2, locale: "de-CH", position: "suffix", formatRule: "standard" },
  PLN: { code: "PLN", symbol: "zł", decimalDigits: 2, locale: "pl-PL", position: "suffix", formatRule: "standard" },
  CZK: { code: "CZK", symbol: "Kč", decimalDigits: 2, locale: "cs-CZ", position: "suffix", formatRule: "standard" },
  HUF: { code: "HUF", symbol: "Ft", decimalDigits: 0, locale: "hu-HU", position: "suffix", formatRule: "standard" },
  RON: { code: "RON", symbol: "lei", decimalDigits: 2, locale: "ro-RO", position: "suffix", formatRule: "standard" },
  BGN: { code: "BGN", symbol: "лв", decimalDigits: 2, locale: "bg-BG", position: "suffix", formatRule: "standard" },
  DKK: { code: "DKK", symbol: "kr", decimalDigits: 2, locale: "da-DK", position: "suffix", formatRule: "standard" },
  SEK: { code: "SEK", symbol: "kr", decimalDigits: 2, locale: "sv-SE", position: "suffix", formatRule: "standard" },
  NOK: { code: "NOK", symbol: "kr", decimalDigits: 2, locale: "nb-NO", position: "suffix", formatRule: "standard" },
  ISK: { code: "ISK", symbol: "kr", decimalDigits: 0, locale: "is-IS", position: "suffix", formatRule: "standard" },
  CAD: { code: "CAD", symbol: "$", decimalDigits: 2, locale: "en-CA", position: "prefix", formatRule: "standard" },
  USD: { code: "USD", symbol: "$", decimalDigits: 2, locale: "en-US", position: "prefix", formatRule: "standard" },
  AUD: { code: "AUD", symbol: "$", decimalDigits: 2, locale: "en-AU", position: "prefix", formatRule: "standard" },
  NZD: { code: "NZD", symbol: "$", decimalDigits: 2, locale: "en-NZ", position: "prefix", formatRule: "standard" },
  AED: { code: "AED", symbol: "د.إ", decimalDigits: 2, locale: "ar-AE", position: "suffix", formatRule: "standard" },
  SAR: { code: "SAR", symbol: "ر.س", decimalDigits: 2, locale: "ar-SA", position: "suffix", formatRule: "standard" },
  TRY: { code: "TRY", symbol: "₺", decimalDigits: 2, locale: "tr-TR", position: "suffix", formatRule: "standard" },
});

function listCurrencies() {
  return Object.values(CURRENCIES);
}

function getCurrency(code) {
  if (!code) return CURRENCIES.EUR;
  return CURRENCIES[String(code).toUpperCase()] || CURRENCIES.EUR;
}

function formatCurrencyAmount(amount, currencyCode, localeOverride) {
  const currency = getCurrency(currencyCode);
  const locale = localeOverride || currency.locale;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: currency.decimalDigits,
      maximumFractionDigits: currency.decimalDigits,
    }).format(Number(amount) || 0);
  } catch {
    return `${currency.symbol}${Number(amount || 0).toFixed(currency.decimalDigits)}`;
  }
}

module.exports = {
  listCurrencies,
  getCurrency,
  formatCurrencyAmount,
};
