import { isEuCountry } from "@/lib/market-engine/registry";
import { normalizeCountryCode, isKnownMarketCountry } from "./targetCountry";
import type { TradeRouteClassification, TradeRouteFlags, TradeRouteType } from "./types";

function buildFlags(tradeRoute: TradeRouteType): TradeRouteFlags {
  const thirdCountry =
    tradeRoute === "EU_TO_NON_EU" ||
    tradeRoute === "NON_EU_TO_EU" ||
    tradeRoute === "NON_EU_TO_NON_EU";

  return {
    requiresExportProcess: thirdCountry,
    requiresImportProcess: thirdCountry,
    requiresCustomsPrecheck: thirdCountry,
    requiresCustomsDocuments: thirdCountry,
    requiresDutyAssessment: thirdCountry,
    requiresVatAssessment: thirdCountry,
  };
}

/**
 * Classify trade route using Market Engine EU membership SSOT.
 */
export function classifyTradeRoute(input: {
  originCountry: string;
  destinationCountry: string;
}): TradeRouteClassification {
  const origin = normalizeCountryCode(input.originCountry);
  const destination = normalizeCountryCode(input.destinationCountry);

  if (!origin || !destination || !isKnownMarketCountry(origin) || !isKnownMarketCountry(destination)) {
    return {
      tradeRoute: "UNKNOWN",
      originCountry: origin ?? "UNKNOWN",
      destinationCountry: destination ?? "UNKNOWN",
      flags: {
        requiresExportProcess: true,
        requiresImportProcess: true,
        requiresCustomsPrecheck: true,
        requiresCustomsDocuments: true,
        requiresDutyAssessment: true,
        requiresVatAssessment: true,
      },
    };
  }

  const originEu = isEuCountry(origin);
  const destinationEu = isEuCountry(destination);

  let tradeRoute: TradeRouteType;
  if (origin === destination) {
    tradeRoute = "SAME_COUNTRY";
  } else if (originEu && destinationEu) {
    tradeRoute = "EU_TO_EU";
  } else if (originEu && !destinationEu) {
    tradeRoute = "EU_TO_NON_EU";
  } else if (!originEu && destinationEu) {
    tradeRoute = "NON_EU_TO_EU";
  } else {
    tradeRoute = "NON_EU_TO_NON_EU";
  }

  return {
    tradeRoute,
    originCountry: origin,
    destinationCountry: destination,
    flags: buildFlags(tradeRoute),
  };
}
