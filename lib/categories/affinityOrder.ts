import { APPROVED_CUSTOMER_FACING_L1_COUNT } from "./customerFacing";
import type { BuzzardCategory } from "./types";

/**
 * Storefront display order: related L1 categories sit next to each other.
 * IDs stay stable; only visual/menu sequence changes.
 */
export const CUSTOMER_FACING_AFFINITY_ORDER = [
  "cat-01",
  "cat-42",
  "cat-15",
  "cat-16",
  "cat-43",
  "cat-53",
  "cat-02",
  "cat-44",
  "cat-27",
  "cat-45",
  "cat-52",
  "cat-17",
  "cat-18",
  "cat-47",
  "cat-04",
  "cat-10",
  "cat-11",
  "cat-35",
  "cat-24",
  "cat-13",
  "cat-03",
  "cat-25",
  "cat-46",
  "cat-06",
  "cat-26",
  "cat-07",
  "cat-33",
  "cat-20",
  "cat-14",
  "cat-05",
  "cat-09",
  "cat-08",
  "cat-21",
  "cat-22",
  "cat-23",
  "cat-40",
  "cat-12",
  "cat-36",
  "cat-38",
  "cat-19",
  "cat-48",
  "cat-49",
  "cat-51",
  "cat-32",
  "cat-34",
  "cat-50",
  "cat-41",
  "cat-28",
  "cat-29",
  "cat-31",
] as const;

const AFFINITY_INDEX = new Map<string, number>(
  CUSTOMER_FACING_AFFINITY_ORDER.map((id, index) => [id, index]),
);

export function orderCustomerFacingCategories<T extends { id: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const left = AFFINITY_INDEX.get(a.id) ?? APPROVED_CUSTOMER_FACING_L1_COUNT + 1;
    const right = AFFINITY_INDEX.get(b.id) ?? APPROVED_CUSTOMER_FACING_L1_COUNT + 1;
    if (left !== right) return left - right;
    return a.id.localeCompare(b.id);
  });
}

export function getCustomerFacingAffinityIds(): string[] {
  return [...CUSTOMER_FACING_AFFINITY_ORDER];
}

export function assertAffinityCovers(categories: Pick<BuzzardCategory, "id">[]): string[] {
  const visible = categories.map((cat) => cat.id);
  const missingFromOrder = visible.filter((id) => !AFFINITY_INDEX.has(id));
  const extraInOrder = CUSTOMER_FACING_AFFINITY_ORDER.filter((id) => !visible.includes(id));
  return [...missingFromOrder, ...extraInOrder];
}
