import { getDeliverableMarketCountry } from "./countries";

export function getDeliveryEstimate(countryCode: string): string {
  return getDeliverableMarketCountry(countryCode)?.deliveryDays ?? "3–8 Werktage";
}
