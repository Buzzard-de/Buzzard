import { describe, expect, it } from "vitest";
import { APPROVED_CUSTOMER_FACING_L1_COUNT, INTERNAL_ONLY_L1_IDS } from "./customerFacing";
import { getVisibleMainCategories } from "./service";
import {
  CUSTOMER_FACING_AFFINITY_ORDER,
  assertAffinityCovers,
  getCustomerFacingAffinityIds,
  orderCustomerFacingCategories,
} from "./affinityOrder";

describe("customer-facing category affinity order", () => {
  it("lists every visible L1 once, with related families adjacent", () => {
    const visible = getVisibleMainCategories();
    const ids = getCustomerFacingAffinityIds();
    expect(ids).toHaveLength(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(new Set(ids).size).toBe(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(assertAffinityCovers(visible)).toEqual([]);
    for (const hidden of INTERNAL_ONLY_L1_IDS) {
      expect(ids).not.toContain(hidden);
    }
    expect(orderCustomerFacingCategories(visible).map((cat) => cat.id)).toEqual(ids);
    expect(ids[0]).toBe("cat-01");
    expect(ids.at(-1)).toBe("cat-31");
  });

  it("keeps close families next to each other", () => {
    const index = new Map<string, number>(CUSTOMER_FACING_AFFINITY_ORDER.map((id, i) => [id, i]));
    const neighbors: Array<[string, string]> = [
      ["cat-01", "cat-42"],
      ["cat-15", "cat-16"],
      ["cat-02", "cat-44"],
      ["cat-27", "cat-45"],
      ["cat-17", "cat-18"],
      ["cat-06", "cat-26"],
      ["cat-05", "cat-54"],
      ["cat-20", "cat-56"],
      ["cat-21", "cat-55"],
      ["cat-07", "cat-33"],
      ["cat-12", "cat-36"],
      ["cat-36", "cat-38"],
      ["cat-09", "cat-08"],
      ["cat-28", "cat-29"],
    ];
    for (const [left, right] of neighbors) {
      expect((index.get(right) ?? -1) - (index.get(left) ?? -99)).toBe(1);
    }
  });
});
