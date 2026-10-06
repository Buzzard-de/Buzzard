import {
  addMoney,
  formatCurrencyIntl,
  getCurrencyDecimalDigits,
  grossFromNet,
  multiplyMoney,
  netFromGross,
  roundMoney,
  subtractMoney,
} from "./money";
import { getMarket, getMarketCurrency } from "./registry";
import { getVatContext } from "./vat";
import type { CustomerType, DisplayPriceInput, DisplayPriceResult } from "./types";

export function calculateDisplayPrice(
  input: DisplayPriceInput,
  options?: {
    countryCode?: string;
    sellerCountry?: string;
    customerType?: CustomerType;
    vatId?: string;
  }
): DisplayPriceResult {
  const countryCode = options?.countryCode ?? "DE";
  const market = getMarket(countryCode);
  const currency = input.currency || market?.currency || "EUR";
  const locale = input.locale || market?.source.locale || market?.locales[0] || "de-DE";
  const decimalDigits = getCurrencyDecimalDigits(currency);
  const quantity = input.quantity ?? 1;
  const discount = input.discountAmount ?? 0;
  const shipping = input.shippingAmount ?? 0;

  const vatContext = getVatContext({
    sellerCountry: options?.sellerCountry ?? "DE",
    buyerCountry: countryCode,
    customerType: options?.customerType ?? "B2C",
    vatId: options?.vatId,
  });

  const vatRate = input.vatRate ?? vatContext.rate;
  const priceIncludesVat = input.priceIncludesVat ?? vatContext.included;

  let unitNet: number;
  let unitVat: number;
  let unitGross: number;

  if (vatContext.reverseCharge || vatRate === 0) {
    unitNet = roundMoney(input.amount, decimalDigits);
    unitVat = 0;
    unitGross = unitNet;
  } else if (priceIncludesVat) {
    const derived = netFromGross(input.amount, vatRate, decimalDigits);
    unitNet = derived.net;
    unitVat = derived.vat;
    unitGross = roundMoney(input.amount, decimalDigits);
  } else {
    const derived = grossFromNet(input.amount, vatRate, decimalDigits);
    unitNet = roundMoney(input.amount, decimalDigits);
    unitVat = derived.vat;
    unitGross = derived.gross;
  }

  const lineNet = multiplyMoney(unitNet, quantity, decimalDigits);
  const lineVat = multiplyMoney(unitVat, quantity, decimalDigits);
  const lineGross = multiplyMoney(unitGross, quantity, decimalDigits);

  const netAfterDiscount = subtractMoney(lineNet, discount, decimalDigits);
  const netPrice = netAfterDiscount;
  const vatAmount = vatContext.reverseCharge ? 0 : lineVat;
  const grossPrice = vatContext.reverseCharge
    ? addMoney(netAfterDiscount, shipping, decimalDigits)
    : addMoney(subtractMoney(lineGross, discount, decimalDigits), shipping, decimalDigits);

  return {
    netPrice,
    vatAmount,
    grossPrice,
    currency,
    formatted: formatCurrencyIntl(grossPrice, currency, locale),
    formattedNet: formatCurrencyIntl(netPrice, currency, locale),
    formattedVat: formatCurrencyIntl(vatAmount, currency, locale),
  };
}

export function getMarketCurrencyForCountry(countryCode: string): ReturnType<typeof getMarketCurrency> {
  return getMarketCurrency(countryCode);
}
