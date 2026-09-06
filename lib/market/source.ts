import type { ShippingRulesMap } from "./types";
import shipping from "@/data/buzzard_europe_shipping.json";
import { marketCountries } from "./marketCountryAdapter";

export { marketCountries };
export const marketShippingRules = shipping as ShippingRulesMap;
