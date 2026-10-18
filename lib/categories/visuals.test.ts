import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { APPROVED_CUSTOMER_FACING_L1_COUNT } from "./customerFacing";
import { getVisibleMainCategories } from "./service";
import { getMainCategoryVisual } from "./visuals";

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
});
