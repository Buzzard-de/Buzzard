export type CompatibilityState =
  | "VERIFIED_COMPATIBLE"
  | "CONDITIONALLY_COMPATIBLE"
  | "POSSIBLE_ALTERNATIVE"
  | "VERIFIED_INCOMPATIBLE"
  | "INSUFFICIENT_DATA";

export type ConstructionSearchItem = {
  id: string;
  manufacturer: string;
  oemPartNumber: string | null;
  descriptions: Record<string, string>;
  matchKind: string;
  score: number;
  reasons: string[];
  compatibility: { state: CompatibilityState; missingInformation: string[] } | null;
  provenance: { providerId: string; mock: boolean; updatedAt: string };
  verifiedExactMatch: boolean;
};

export type ConstructionSearchResponse = {
  ok: boolean;
  items: ConstructionSearchItem[];
  machines: Array<{ id: string; manufacturer: string; modelName: string; modelCode: string | null }>;
  total: number;
  rankingNote?: string;
};

export type ConstructionHealth = {
  ok: boolean;
  implementation: string;
  liveVerified: boolean;
  providerConfigured: boolean;
  machines: number;
  parts: number;
  evidence: number;
  connectors: Array<{ id: string; status: string; mock: boolean }>;
};
