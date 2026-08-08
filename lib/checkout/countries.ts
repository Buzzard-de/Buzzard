export interface CountryOption {
  code: string;
  labelKey: string;
  vatRate: number;
  zipPattern: RegExp;
}

/** EU-focused list; Germany is default storefront country. */
export const CHECKOUT_COUNTRIES: CountryOption[] = [
  { code: "DE", labelKey: "country.DE", vatRate: 19, zipPattern: /^\d{5}$/ },
  { code: "AT", labelKey: "country.AT", vatRate: 20, zipPattern: /^\d{4}$/ },
  { code: "CH", labelKey: "country.CH", vatRate: 8.1, zipPattern: /^\d{4}$/ },
  { code: "NL", labelKey: "country.NL", vatRate: 21, zipPattern: /^\d{4}\s?[A-Z]{2}$/i },
  { code: "BE", labelKey: "country.BE", vatRate: 21, zipPattern: /^\d{4}$/ },
  { code: "FR", labelKey: "country.FR", vatRate: 20, zipPattern: /^\d{5}$/ },
  { code: "IT", labelKey: "country.IT", vatRate: 22, zipPattern: /^\d{5}$/ },
  { code: "PL", labelKey: "country.PL", vatRate: 23, zipPattern: /^\d{2}-\d{3}$/ },
  { code: "TR", labelKey: "country.TR", vatRate: 20, zipPattern: /^\d{5}$/ },
];

export function getCountry(code: string): CountryOption | undefined {
  return CHECKOUT_COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function defaultCountryCode(): string {
  return "DE";
}
