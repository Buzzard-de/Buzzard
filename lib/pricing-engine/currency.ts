import {
  getCurrencyDecimalDigits,
  multiplyMoney,
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
} from "@/lib/market-engine/money";
import { getExchangeRate } from "./registry";

/**
 * Deterministic test exchange rates — no live FX APIs.
 * Converts amount from source currency to target currency using integer minor units.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number | null {
  const from = String(fromCurrency).toUpperCase();
  const to = String(toCurrency).toUpperCase();
  if (from === to) return roundMoney(amount, getCurrencyDecimalDigits(to));

  const rate = getExchangeRate(from, to);
  if (rate == null) return null;

  const decimalDigits = getCurrencyDecimalDigits(to);
  const minor = toMinorUnits(amount, getCurrencyDecimalDigits(from));
  const convertedMinor = Math.round(minor * rate);
  return fromMinorUnits(convertedMinor, decimalDigits);
}

export function addInCurrency(
  a: number,
  aCurrency: string,
  b: number,
  bCurrency: string,
  targetCurrency: string
): number | null {
  const aConverted = convertCurrency(a, aCurrency, targetCurrency);
  const bConverted = convertCurrency(b, bCurrency, targetCurrency);
  if (aConverted == null || bConverted == null) return null;
  return roundMoney(aConverted + bConverted, getCurrencyDecimalDigits(targetCurrency));
}

export { multiplyMoney, roundMoney, getCurrencyDecimalDigits };
