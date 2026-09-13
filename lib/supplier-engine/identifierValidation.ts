export interface IdentifierValidationResult {
  field: string;
  value: string;
  valid: boolean;
  reason?: string;
}

const EAN_GTIN_PATTERN = /^\d{8,14}$/;
const MPN_PATTERN = /^[\w\s./\-+]{1,64}$/i;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._\-/]{0,63}$/i;

export function validateEan(value: unknown): IdentifierValidationResult | null {
  if (value == null || value === "" || value === "UNKNOWN") return null;
  const str = String(value).trim();
  const valid = EAN_GTIN_PATTERN.test(str);
  return { field: "ean", value: str, valid, reason: valid ? undefined : "INVALID_EAN_FORMAT" };
}

export function validateGtin(value: unknown): IdentifierValidationResult | null {
  if (value == null || value === "" || value === "UNKNOWN") return null;
  const str = String(value).trim();
  const valid = EAN_GTIN_PATTERN.test(str);
  return { field: "gtin", value: str, valid, reason: valid ? undefined : "INVALID_GTIN_FORMAT" };
}

export function validateMpn(value: unknown): IdentifierValidationResult | null {
  if (value == null || value === "" || value === "UNKNOWN") return null;
  const str = String(value).trim();
  const valid = MPN_PATTERN.test(str);
  return { field: "mpn", value: str, valid, reason: valid ? undefined : "INVALID_MPN_FORMAT" };
}

export function validateSupplierSku(value: unknown): IdentifierValidationResult | null {
  if (value == null || value === "" || value === "UNKNOWN") return null;
  const str = String(value).trim();
  const valid = SKU_PATTERN.test(str);
  return { field: "supplierSku", value: str, valid, reason: valid ? undefined : "INVALID_SKU_FORMAT" };
}

export function validateOem(value: unknown): IdentifierValidationResult | null {
  if (value == null || value === "" || value === "UNKNOWN") return null;
  const str = String(value).trim();
  const valid = str.length >= 1 && str.length <= 64;
  return { field: "oem", value: str, valid, reason: valid ? undefined : "INVALID_OEM_FORMAT" };
}

export function validateRecordIdentifiers(record: Record<string, unknown>): IdentifierValidationResult[] {
  const results: IdentifierValidationResult[] = [];
  for (const check of [
    validateSupplierSku(record.supplierSku || record.supplier_sku),
    validateEan(record.ean),
    validateGtin(record.gtin),
    validateMpn(record.mpn),
    validateOem(record.oemNumbers || record.oem),
  ]) {
    if (check) results.push(check);
  }
  return results;
}

export function summarizeIdentifierValidation(records: Record<string, unknown>[]): {
  totalChecked: number;
  invalid: IdentifierValidationResult[];
  invalidCount: number;
} {
  const invalid: IdentifierValidationResult[] = [];
  for (const record of records) {
    for (const result of validateRecordIdentifiers(record)) {
      if (!result.valid) invalid.push(result);
    }
  }
  return { totalChecked: records.length, invalid, invalidCount: invalid.length };
}
