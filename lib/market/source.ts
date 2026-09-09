/** Market source — authoritative 35-country registry (legacy 41-country JSON deprecated). */
import type { MarketCountry, ShippingRulesMap } from "./types";
import { marketCountries as globalMarketCountries } from "./marketCountryAdapter";
import shipping from "@/data/buzzard_europe_shipping.json";

export const marketCountries: MarketCountry[] = globalMarketCountries;
export const marketShippingRules = shipping as ShippingRulesMap;
