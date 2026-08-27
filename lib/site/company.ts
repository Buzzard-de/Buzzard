/** Legal company details for Impressum, Datenschutz, structured data. */
export const COMPANY_LEGAL_NAME =
  process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Buzzard Kfz-Teile";

export const COMPANY_BRAND = "Buzzard24";

export const COMPANY_STREET = process.env.NEXT_PUBLIC_COMPANY_STREET || "";

export const COMPANY_POSTAL_CODE =
  process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || "35232";

export const COMPANY_CITY = process.env.NEXT_PUBLIC_COMPANY_CITY || "Dautphetal";

export const COMPANY_COUNTRY = "Deutschland";

/** USt-IdNr. — set NEXT_PUBLIC_COMPANY_VAT_ID when available. */
export const COMPANY_VAT_ID = process.env.NEXT_PUBLIC_COMPANY_VAT_ID || "";

/** Verantwortlich für Inhalte gem. § 18 Abs. 2 MStV */
export const COMPANY_CONTENT_OWNER =
  process.env.NEXT_PUBLIC_COMPANY_CONTENT_OWNER || COMPANY_LEGAL_NAME;

export interface CompanyAddressLines {
  street?: string;
  cityLine: string;
  country: string;
}

export function getCompanyAddressLines(): CompanyAddressLines {
  return {
    street: COMPANY_STREET || undefined,
    cityLine: `${COMPANY_POSTAL_CODE} ${COMPANY_CITY}`,
    country: COMPANY_COUNTRY,
  };
}

export function getCompanyAddressSingleLine(): string {
  const { street, cityLine, country } = getCompanyAddressLines();
  return [street, cityLine, country].filter(Boolean).join(", ");
}
