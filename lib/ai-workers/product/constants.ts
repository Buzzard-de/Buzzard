/** Category confidence below this threshold triggers REVIEW_REQUIRED. */
export const CATEGORY_CONFIDENCE_THRESHOLD = 0.75;

export const TITLE_MIN_LENGTH = 10;
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MIN_LENGTH = 50;

export const MARKETPLACE_CHANNELS = [
  "AMAZON",
  "EBAY",
  "KAUFLAND",
  "ALLEGRO",
  "BOL",
  "CDISCOUNT",
  "OTTO",
] as const;

export const MARKETPLACE_ID_MAP: Record<(typeof MARKETPLACE_CHANNELS)[number], string> = {
  AMAZON: "amazon",
  EBAY: "ebay",
  KAUFLAND: "kaufland",
  ALLEGRO: "allegro",
  BOL: "bol",
  CDISCOUNT: "cdiscount",
  OTTO: "otto",
};

/** Known Buzzard category IDs from automotive catalog — recommendations must reference these. */
export const KNOWN_CATEGORY_IDS = new Set([
  "cat-05-01",
  "cat-05-02",
  "cat-05-03",
  "cat-05-04",
  "cat-05-05",
  "cat-05-07",
  "cat-05-11",
]);

export const CATEGORY_KEYWORD_HINTS: Record<string, string[]> = {
  "cat-05-01": ["motoröl", "engine oil", "5w", "viscosity", "öl"],
  "cat-05-02": ["reifen", "tire", "tyre", "225/", "r17", "load index"],
  "cat-05-03": ["bremsscheibe", "bremsbelag", "brake", "disc", "pad"],
  "cat-05-04": ["filter", "luftfilter", "ölfilter"],
  "cat-05-05": ["zündkerze", "spark plug"],
  "cat-05-07": ["batterie", "battery", "ah"],
  "cat-05-11": ["scheibenwischer", "wiper"],
};

export const CATEGORY_CRITICAL_ATTRIBUTES: Record<string, string[]> = {
  "cat-05-01": ["viscosity", "capacity", "acea", "api"],
  "cat-05-02": ["width", "aspectRatio", "rimDiameter", "loadIndex", "speedRating", "season"],
  "cat-05-03": ["diameter", "thickness", "axlePosition"],
  "cat-05-07": ["capacityAh", "voltage", "terminalType"],
};

export const IDENTIFIER_FIELDS = ["ean", "gtin", "mpn", "oem", "partNumber", "oemNumber"] as const;

export const PRESERVE_IN_TRANSLATION = [
  "EAN",
  "GTIN",
  "MPN",
  "OEM",
  "part number",
  "OEM number",
] as const;

export const COMPLIANCE_FIELDS = [
  "countryOfOrigin",
  "manufacturer",
  "responsibleEconomicOperator",
  "hazmatIndicator",
  "batteryIndicator",
  "productSafetyData",
  "requiredDocumentation",
] as const;

export const MARKET_REQUIRED_FIELDS = ["title", "description", "brand", "category", "ean"] as const;

export const MARKETPLACE_REQUIRED_FIELDS = ["title", "description", "brand", "category", "imagesMetadata", "ean"] as const;

export const CUSTOMER_SAFE_OUTPUT_FIELDS = new Set([
  "productId",
  "analysisType",
  "contentRecommendations",
  "translationRecommendations",
]);

export const INTERNAL_OUTPUT_FIELDS = new Set([
  "quality",
  "duplicateSignals",
  "anomalies",
  "complianceDataStatus",
  "confidence",
  "provenance",
  "proposedActions",
  "humanReviewRequired",
  "marketplaceReadiness",
]);
