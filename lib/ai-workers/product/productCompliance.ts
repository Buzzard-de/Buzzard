import type { ComplianceDataStatus, ProductAiInput } from "./types";
import { COMPLIANCE_FIELDS } from "./constants";

export function analyzeComplianceData(input: ProductAiInput): {
  status: ComplianceDataStatus;
  missingFields: string[];
  populatedFields: string[];
} {
  const missingFields: string[] = [];
  const populatedFields: string[] = [];

  const fieldValues: Record<string, unknown> = {
    countryOfOrigin: input.countryOfOrigin ?? input.attributes.countryOfOrigin,
    manufacturer: input.manufacturer,
    responsibleEconomicOperator: input.attributes.responsibleEconomicOperator,
    hazmatIndicator: input.hazmatIndicators?.length ? input.hazmatIndicators : input.attributes.hazmatIndicator,
    batteryIndicator: input.attributes.batteryIndicator,
    productSafetyData: input.attributes.productSafetyData,
    requiredDocumentation: input.attributes.requiredDocumentation,
  };

  for (const field of COMPLIANCE_FIELDS) {
    const val = fieldValues[field];
    if (val === undefined || val === null || val === "") {
      missingFields.push(field);
    } else {
      populatedFields.push(field);
    }
  }

  let status: ComplianceDataStatus;
  if (missingFields.length === 0) {
    status = "DATA_COMPLETE";
  } else if (missingFields.length >= COMPLIANCE_FIELDS.length - 1) {
    status = "REVIEW_REQUIRED";
  } else {
    status = "DATA_INCOMPLETE";
  }

  return { status, missingFields, populatedFields };
}
