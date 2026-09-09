/**
 * Integer-cent money helpers — avoid uncontrolled floating-point arithmetic.
 */

export function toMinorUnits(amount: number, decimalDigits = 2): number {
  const factor = 10 ** decimalDigits;
  return Math.round((Number(amount) || 0) * factor);
}

export function fromMinorUnits(minor: number, decimalDigits = 2): number {
  const factor = 10 ** decimalDigits;
  return minor / factor;
}

export function roundMoney(amount: number, decimalDigits = 2): number {
  return fromMinorUnits(toMinorUnits(amount, decimalDigits), decimalDigits);
}

export function addMoney(a: number, b: number, decimalDigits = 2): number {
  return fromMinorUnits(toMinorUnits(a, decimalDigits) + toMinorUnits(b, decimalDigits), decimalDigits);
}

export function subtractMoney(a: number, b: number, decimalDigits = 2): number {
  return fromMinorUnits(toMinorUnits(a, decimalDigits) - toMinorUnits(b, decimalDigits), decimalDigits);
}

export function multiplyMoney(amount: number, factor: number, decimalDigits = 2): number {
  return fromMinorUnits(Math.round(toMinorUnits(amount, decimalDigits) * factor), decimalDigits);
}

/** Derive net from gross using integer cents. */
export function netFromGross(gross: number, vatRate: number, decimalDigits = 2): { net: number; vat: number } {
  const grossMinor = toMinorUnits(gross, decimalDigits);
  const netMinor = Math.round(grossMinor / (1 + vatRate));
  const vatMinor = grossMinor - netMinor;
  return { net: fromMinorUnits(netMinor, decimalDigits), vat: fromMinorUnits(vatMinor, decimalDigits) };
}

/** Derive gross from net using integer cents. */
export function grossFromNet(net: number, vatRate: number, decimalDigits = 2): { gross: number; vat: number } {
  const netMinor = toMinorUnits(net, decimalDigits);
  const vatMinor = Math.round(netMinor * vatRate);
  const grossMinor = netMinor + vatMinor;
  return { gross: fromMinorUnits(grossMinor, decimalDigits), vat: fromMinorUnits(vatMinor, decimalDigits) };
}

/** Currency decimal digits — mirrors server currency registry defaults. */
const CURRENCY_DECIMALS: Record<string, number> = {
  HUF: 0,
  ISK: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

export function getCurrencyDecimalDigits(currencyCode: string): number {
  return CURRENCY_DECIMALS[String(currencyCode).toUpperCase()] ?? 2;
}

export function formatCurrencyIntl(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  const currency = String(currencyCode).toUpperCase();
  const decimalDigits = getCurrencyDecimalDigits(currency);
  const resolvedLocale = locale || "de-DE";
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(decimalDigits)} ${currency}`;
  }
}
