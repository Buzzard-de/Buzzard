import type { ProductAiFixtureScenario, ProductAiInput } from "./types";

const baseCompleteInput = (): ProductAiInput => ({
  productId: "reifen-pilot-sport",
  supplierId: "SUPPLIER_A",
  market: "DE",
  channel: "WEB",
  language: "de",
  title: "Michelin Pilot Sport 4 225/45 R17 94Y XL Sommerreifen",
  description:
    "Hochleistungs-Sommerreifen von Michelin mit exzellenter Nasshaftung und präziser Lenkung für sportliche Fahrzeuge. Geeignet für PKW.",
  brand: "Michelin",
  manufacturer: "Michelin",
  mpn: "1234567890",
  ean: "3528701234567",
  gtin: "3528701234567",
  category: "cat-05-02",
  subcategory: "cat-05-02-01",
  attributes: {
    width: 225,
    aspectRatio: 45,
    rimDiameter: 17,
    loadIndex: 94,
    speedRating: "Y",
    season: "summer",
  },
  imagesMetadata: [{ url: "https://example.com/tire.jpg", type: "MAIN" }],
  dimensions: { length: 700, width: 225, height: 225, unit: "mm" },
  weight: 9.5,
  weightUnit: "kg",
  compatibility: [{ make: "BMW", model: "3 Series", verified: true }],
  countryOfOrigin: "DE",
  existingTranslations: [
    { locale: "de", title: "Michelin Pilot Sport 4 225/45 R17", description: "Sommerreifen" },
    { locale: "en", title: "Michelin Pilot Sport 4 225/45 R17", description: "Summer tire" },
    { locale: "tr", title: "Michelin Pilot Sport 4 225/45 R17", description: "Yaz lastiği" },
    { locale: "ar", title: "Michelin Pilot Sport 4 225/45 R17", description: "إطار صيفي" },
  ],
  marketAvailability: ["DE", "AT"],
  stockStatus: "IN_STOCK",
  productType: "automotive",
});

export const PRODUCT_AI_FIXTURE_SCENARIOS: ProductAiFixtureScenario[] = [
  {
    id: "complete-product",
    description: "Complete product — HIGH quality, READY",
    input: baseCompleteInput(),
    taskType: "PRODUCT_ANALYSIS",
    expectation: { minQualityScore: 70, marketReadiness: "READY", humanReviewRequired: false },
  },
  {
    id: "missing-title-description",
    description: "Missing title/description — LOW quality, DATA_QUALITY flags",
    input: { ...baseCompleteInput(), productId: "fixture-missing-content", title: undefined, description: undefined },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { maxQualityScore: 55, hasDataQualityFlag: true },
  },
  {
    id: "missing-attributes",
    description: "Missing attributes — recommendations + human review",
    input: { ...baseCompleteInput(), productId: "fixture-missing-attrs", attributes: {} },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { humanReviewRequired: true },
  },
  {
    id: "category-ambiguity",
    description: "Category ambiguity — NEEDS_REVIEW",
    input: { ...baseCompleteInput(), productId: "fixture-cat-ambiguity", category: undefined, title: "Universal Part 12345" },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { marketReadiness: "NEEDS_REVIEW", humanReviewRequired: true },
  },
  {
    id: "duplicate-ean",
    description: "Duplicate EAN — duplicateCandidate",
    input: { ...baseCompleteInput(), productId: "duplicate-test-product", ean: "4006633001234" },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { duplicateCandidate: true, humanReviewRequired: true },
  },
  {
    id: "conflicting-supplier-data",
    description: "Conflicting supplier data — ANOMALY, REVIEW_REQUIRED",
    input: {
      ...baseCompleteInput(),
      productId: "fixture-conflict",
      weight: -5,
      attributes: { width: 225, conflictingWidth: 205 },
    },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { hasAnomaly: true, humanReviewRequired: true },
  },
  {
    id: "missing-automotive-compatibility",
    description: "Missing automotive compatibility — UNKNOWN / NEEDS_DATA",
    input: { ...baseCompleteInput(), productId: "fixture-no-compat", compatibility: [], productType: "automotive" },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { humanReviewRequired: true },
  },
  {
    id: "translation",
    description: "Translation — valid target language, identifiers preserved",
    input: baseCompleteInput(),
    taskType: "PRODUCT_TRANSLATION",
    expectation: { translationValid: true, identifiersPreserved: true },
  },
  {
    id: "unsupported-technical-claim",
    description: "Unsupported technical claim — FLAGGED",
    input: {
      ...baseCompleteInput(),
      productId: "fixture-unsupported-claim",
      description: "Guaranteed 500HP increase and universal fit for all vehicles.",
    },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { humanReviewRequired: true },
  },
  {
    id: "compliance-incomplete",
    description: "Compliance data incomplete — DATA_INCOMPLETE",
    input: {
      ...baseCompleteInput(),
      productId: "fixture-compliance",
      countryOfOrigin: undefined,
      attributes: {
        ...baseCompleteInput().attributes,
        countryOfOrigin: null,
        hazmatIndicator: false,
        batteryIndicator: false,
        productSafetyData: "available",
        requiredDocumentation: "pending",
        responsibleEconomicOperator: "Buzzard GmbH",
      },
    },
    taskType: "PRODUCT_ANALYSIS",
    expectation: { complianceDataStatus: "DATA_INCOMPLETE" },
  },
  {
    id: "customer-service-restricted",
    description: "Customer Service restricted context — internal fields unavailable",
    input: {
      ...baseCompleteInput(),
      productId: "fixture-cs-restricted",
      _internal: { qualityScore: 42, duplicateInternals: true },
    },
    taskType: "PRODUCT_ANALYSIS",
    expectation: {},
  },
  {
    id: "malformed-ai-output",
    description: "Malformed AI output — REJECTED",
    input: baseCompleteInput(),
    taskType: "PRODUCT_ANALYSIS",
    expectation: { rejected: true },
  },
];

export function getFixtureScenario(id: string): ProductAiFixtureScenario | undefined {
  return PRODUCT_AI_FIXTURE_SCENARIOS.find((s) => s.id === id);
}

export function buildFixtureInput(id: string): ProductAiInput {
  const scenario = getFixtureScenario(id);
  if (!scenario) throw new Error(`Unknown fixture scenario: ${id}`);
  return scenario.input;
}
