import { listMarketplaces } from "./registry";
import { resolveCredentialDisplayState } from "@/lib/master-external-provider-readiness/credentialState";
import { hasExternalLiveEvidence } from "@/lib/master-external-provider-readiness/externalProviderEvidenceStore";

export const MARKETPLACE_CAPABILITIES = [
  "AUTH",
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRICE_SYNC",
  "STOCK_SYNC",
  "ORDER_IMPORT",
  "ORDER_STATUS",
  "SHIPMENT",
  "TRACKING",
  "RETURN",
  "REFUND",
] as const;

export type MarketplaceCapabilityName = (typeof MARKETPLACE_CAPABILITIES)[number];

export type MarketplaceCapabilityStatus =
  | "CONFIGURED"
  | "UNVERIFIED"
  | "VALIDATED"
  | "BLOCKED"
  | "HUMAN_REQUIRED";

export interface MarketplaceCapabilityCell {
  marketplaceId: string;
  capability: MarketplaceCapabilityName;
  status: MarketplaceCapabilityStatus;
  credentialState: string;
}

function mapCapability(mpCaps: ReturnType<typeof listMarketplaces>[0]["capabilities"], cap: MarketplaceCapabilityName): boolean {
  switch (cap) {
    case "AUTH":
      return mpCaps.api || mpCaps.xml;
    case "PRODUCT_CREATE":
      return mpCaps.productListing;
    case "PRODUCT_UPDATE":
      return mpCaps.productUpdate;
    case "PRICE_SYNC":
      return mpCaps.priceUpdate;
    case "STOCK_SYNC":
      return mpCaps.stockUpdate;
    case "ORDER_IMPORT":
      return mpCaps.orderImport;
    case "ORDER_STATUS":
      return mpCaps.orderAcknowledgement;
    case "SHIPMENT":
      return mpCaps.shipmentCreation;
    case "TRACKING":
      return mpCaps.trackingUpdate;
    case "RETURN":
      return mpCaps.returns;
    case "REFUND":
      return mpCaps.refunds;
    default:
      return false;
  }
}

export function buildMarketplaceProductionCapabilityMatrix(): MarketplaceCapabilityCell[] {
  const cells: MarketplaceCapabilityCell[] = [];
  for (const mp of listMarketplaces()) {
    if (mp.marketplaceId.startsWith("TEST_")) continue;
    const key = `MARKETPLACE_${mp.marketplaceId.toUpperCase().replace(/-/g, "_")}_SECRET_REF`;
    const cred = resolveCredentialDisplayState({
      secretRefConfigured: Boolean(process.env[key]?.trim()),
      secretResolvable: false,
      category: "MARKETPLACE",
      providerId: mp.marketplaceId,
      configuredFlag: mp.status !== "DISCOVERED",
    });
    const liveAuth = hasExternalLiveEvidence("MARKETPLACE", mp.marketplaceId, "catalog_read");
    for (const capability of MARKETPLACE_CAPABILITIES) {
      const configured = mapCapability(mp.capabilities, capability);
      let status: MarketplaceCapabilityStatus = "UNVERIFIED";
      if (!configured) status = "BLOCKED";
      else if (liveAuth && capability === "AUTH") status = "VALIDATED";
      else if (configured && cred === "NOT_CONFIGURED") status = "HUMAN_REQUIRED";
      else if (configured) status = "CONFIGURED";
      cells.push({
        marketplaceId: mp.marketplaceId,
        capability,
        status,
        credentialState: cred,
      });
    }
  }
  return cells;
}
