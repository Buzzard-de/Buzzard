import countriesData from "@/data/global/global_countries_35.json";

export interface GlobalCountry {
  countryCode: string;
  countryName: string;
  nativeCountryName: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  currencySymbol: string;
  locale: string;
  seoLocale: string;
  fallbackLanguage: string;
  catalogEnabled: boolean;
  searchEnabled: boolean;
}

export interface GlobalLocaleContextValue {
  country: string;
  countryName: string;
  language: string;
  locale: string;
  currency: string;
  direction: "ltr" | "rtl";
  measurementSystem: string;
  dateFormat: string;
  numberFormat: string;
  fallbackLanguage: string;
  uiReady: boolean;
  setCountry: (code: string, manual?: boolean) => void;
  setLanguage: (code: string, manual?: boolean) => void;
}

export const GLOBAL_COUNTRIES: GlobalCountry[] = countriesData as GlobalCountry[];

export const PREPARED_LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  nl: "Nederlands",
  pl: "Polski",
  cs: "Čeština",
  sk: "Slovenčina",
  hu: "Magyar",
  ro: "Română",
  bg: "Български",
  hr: "Hrvatski",
  sl: "Slovenščina",
  da: "Dansk",
  sv: "Svenska",
  no: "Norsk",
  fi: "Suomi",
  et: "Eesti",
  lv: "Latviešu",
  lt: "Lietuvių",
  pt: "Português",
  el: "Ελληνικά",
  ca: "Català",
  eu: "Euskara",
  gl: "Galego",
  ga: "Gaeilge",
  lb: "Lëtzebuergesch",
  mt: "Malti",
};

export function getGlobalCountry(code: string): GlobalCountry | undefined {
  return GLOBAL_COUNTRIES.find((c) => c.countryCode === code.toUpperCase());
}

export function listGlobalCountries(): GlobalCountry[] {
  return GLOBAL_COUNTRIES;
}
