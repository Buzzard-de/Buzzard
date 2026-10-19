import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { APPROVED_CUSTOMER_FACING_L1_COUNT } from "./customerFacing";
import { getVisibleMainCategories } from "./service";
import { getChildren } from "./service";
import { getCategoryVisual, getMainCategoryVisual, hasHubSubcategoryVisual } from "./visuals";

describe("main category visuals", () => {
  it("maps every customer-facing L1 to a public WebP tile", () => {
    const ids = getVisibleMainCategories().map((cat) => cat.id);
    expect(ids).toHaveLength(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(ids[0]).toBe("cat-01");
    expect(ids.at(-1)).toBe("cat-56");
    expect(ids).not.toContain("cat-30");
    expect(ids).not.toContain("cat-37");
    expect(ids).not.toContain("cat-39");
    const missing = ids.filter(
      (id) => !existsSync(join(process.cwd(), "public", "images", "categories", `${id}.webp`)),
    );
    for (const id of ids) {
      expect(getMainCategoryVisual(id)).toBe(`/images/categories/${id}.webp`);
    }
    expect(missing).toEqual([]);
  });

  it("gives dedicated fashion and vehicle L2 hubs their own photographs", () => {
    const hubs = [
      ...getChildren("cat-01"),
      ...getChildren("cat-02"),
      ...getChildren("cat-42"),
      ...getChildren("cat-15"),
      ...getChildren("cat-16"),
      ...getChildren("cat-44"),
      ...getChildren("cat-27"),
      ...getChildren("cat-05"),
      ...getChildren("cat-55"),
      ...getChildren("cat-56"),
    ];
    expect(hubs).toHaveLength(94);
    const missing = hubs.filter(
      (cat) => !existsSync(join(process.cwd(), "public", "images", "categories", `${cat.id}.webp`)),
    );
    for (const cat of hubs) {
      expect(hasHubSubcategoryVisual(cat.id)).toBe(true);
      expect(getCategoryVisual(cat.id)).toBe(`/images/categories/${cat.id}.webp`);
    }
    expect(missing).toEqual([]);
    expect(hasHubSubcategoryVisual("cat-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-01-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-02")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-02-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-42")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-42-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-15")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-15-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-16")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-16-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-44")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-44-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-27")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-27-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-05")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-05-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-55")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-55-01-01")).toBe(false);
  });
});
