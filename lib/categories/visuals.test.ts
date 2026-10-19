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
      ...getChildren("cat-45"),
      ...getChildren("cat-52"),
      ...getChildren("cat-17"),
      ...getChildren("cat-18"),
      ...getChildren("cat-47"),
      ...getChildren("cat-04"),
      ...getChildren("cat-10"),
      ...getChildren("cat-11"),
      ...getChildren("cat-35"),
      ...getChildren("cat-24"),
      ...getChildren("cat-13"),
      ...getChildren("cat-03"),
      ...getChildren("cat-46"),
      ...getChildren("cat-06"),
      ...getChildren("cat-26"),
      ...getChildren("cat-07"),
      ...getChildren("cat-33"),
      ...getChildren("cat-20"),
      ...getChildren("cat-14"),
      ...getChildren("cat-09"),
      ...getChildren("cat-08"),
      ...getChildren("cat-21"),
      ...getChildren("cat-22"),
      ...getChildren("cat-23"),
      ...getChildren("cat-40"),
      ...getChildren("cat-12"),
      ...getChildren("cat-36"),
      ...getChildren("cat-38"),
      ...getChildren("cat-19"),
      ...getChildren("cat-48"),
      ...getChildren("cat-49"),
      ...getChildren("cat-51"),
      ...getChildren("cat-32"),
      ...getChildren("cat-34"),
      ...getChildren("cat-05"),
      ...getChildren("cat-55"),
      ...getChildren("cat-56"),
    ];
    expect(hubs).toHaveLength(374);
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
    expect(hasHubSubcategoryVisual("cat-45")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-45-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-52")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-52-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-17")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-17-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-18")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-18-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-47")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-47-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-04")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-04-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-10")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-10-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-11")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-11-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-35")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-35-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-24")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-24-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-13")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-13-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-03")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-03-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-46")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-46-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-06")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-06-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-26")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-26-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-07")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-07-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-33")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-33-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-20")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-20-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-14")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-14-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-09")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-09-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-08")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-08-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-21")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-21-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-22")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-22-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-23")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-23-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-40")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-40-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-12")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-12-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-36")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-36-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-38")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-38-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-19")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-19-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-48")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-48-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-49")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-49-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-51")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-51-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-32")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-32-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-34")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-34-01-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-05")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-05-01")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-55")).toBe(false);
    expect(hasHubSubcategoryVisual("cat-55-01-01")).toBe(false);
  });
});
