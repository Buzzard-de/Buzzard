export type CustomsDecision =
  | "CUSTOMS_NOT_REQUIRED"
  | "CUSTOMS_READY"
  | "CUSTOMS_REVIEW_REQUIRED"
  | "CUSTOMS_BLOCKED";

export interface CustomsLineAssessment {
  productId: string;
  hsCode?: string;
  originCountry?: string;
  customsValue?: number;
  commodityDescription?: string;
  restrictedGoods: boolean;
  documentationRequired: boolean;
  missingFields: string[];
}

export interface CustomsPrecheckResult {
  ok: boolean;
  decision: CustomsDecision;
  reason?: string;
  missingFields: string[];
  lineAssessments: CustomsLineAssessment[];
  dutyEstimate?: number;
  taxEstimate?: number;
  exportRequired: boolean;
  importRequired: boolean;
  hold: boolean;
}
