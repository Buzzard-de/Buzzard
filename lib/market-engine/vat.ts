import { EU_COUNTRY_CODES, getMarketVat, isEuCountry } from "./registry";
import type { VatContext, VatContextInput } from "./types";

function normalizeCode(code: string): string {
  return String(code || "").toUpperCase();
}

function isValidVatIdFormat(vatId?: string): boolean {
  if (!vatId) return false;
  const trimmed = vatId.trim();
  return trimmed.length >= 4 && /^[A-Z]{2}[A-Z0-9]+$/i.test(trimmed);
}

/**
 * Resolve VAT context for a transaction.
 * Architecture placeholder — replace rule base with juridically maintained data later.
 * Not tax advice.
 */
export function getVatContext(input: VatContextInput): VatContext {
  const seller = normalizeCode(input.sellerCountry);
  const buyer = normalizeCode(input.buyerCountry);
  const customerType = input.customerType;
  const buyerVat = getMarketVat(buyer);
  const sellerVat = getMarketVat(seller);
  const sellerEu = isEuCountry(seller);
  const buyerEu = isEuCountry(buyer);
  const domestic = seller === buyer;
  const intraEu = sellerEu && buyerEu && !domestic;
  const exportSale = sellerEu && !buyerEu;
  const importToEu = !sellerEu && buyerEu;

  if (customerType === "B2B") {
    if (intraEu && isValidVatIdFormat(input.vatId)) {
      return {
        rate: 0,
        included: false,
        reverseCharge: true,
        reason: "B2B_INTRA_EU_REVERSE_CHARGE",
      };
    }
    if (exportSale) {
      return {
        rate: 0,
        included: false,
        reverseCharge: false,
        reason: "B2B_EXPORT_ZERO_RATED",
      };
    }
    if (importToEu && isValidVatIdFormat(input.vatId)) {
      return {
        rate: buyerVat.standardRate,
        included: false,
        reverseCharge: true,
        reason: "B2B_IMPORT_REVERSE_CHARGE",
      };
    }
    if (domestic) {
      return {
        rate: sellerVat.standardRate,
        included: false,
        reverseCharge: false,
        reason: "B2B_DOMESTIC_NET",
      };
    }
    return {
      rate: buyerVat.standardRate,
      included: buyerVat.pricesIncludeVat,
      reverseCharge: false,
      reason: "B2B_CROSS_BORDER_DEFAULT",
    };
  }

  // B2C
  if (domestic) {
    return {
      rate: sellerVat.standardRate,
      included: sellerVat.pricesIncludeVat,
      reverseCharge: false,
      reason: "B2C_DOMESTIC",
    };
  }
  if (intraEu) {
    return {
      rate: buyerVat.standardRate,
      included: buyerVat.pricesIncludeVat,
      reverseCharge: false,
      reason: "B2C_INTRA_EU_DESTINATION",
    };
  }
  if (exportSale || importToEu || !sellerEu || !buyerEu) {
    return {
      rate: buyerVat.standardRate,
      included: buyerVat.pricesIncludeVat,
      reverseCharge: false,
      reason: exportSale ? "B2C_EXPORT" : "B2C_CROSS_BORDER",
    };
  }

  return {
    rate: buyerVat.standardRate,
    included: buyerVat.pricesIncludeVat,
    reverseCharge: false,
    reason: "B2C_DEFAULT",
  };
}

export function getEuCountryCodes(): string[] {
  return [...EU_COUNTRY_CODES];
}
