import type { ShippingRulesMap } from "./types";
import shipping from "@/data/buzzard_europe_shipping.json";

/** Shipping rate tables remain the existing commerce overlay; markets come from Market Engine. */
export const marketShippingRules = shipping as ShippingRulesMap;
