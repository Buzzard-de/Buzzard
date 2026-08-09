import type { MarketCountry, ShippingRulesMap } from "./types";
import countries from "@/data/buzzard_europe_countries.json";
import shipping from "@/data/buzzard_europe_shipping.json";

export const marketCountries = countries as MarketCountry[];
export const marketShippingRules = shipping as ShippingRulesMap;
