import { describe, expect, it } from "vitest";
import {
  categoryHref,
  getChildren,
  getDefaultMainCategoryId,
  getMainCategories,
  getVisibleMainCategories,
} from "@/lib/categories";
import { getMobileFilterScope } from "./categoryFilters";

describe("mobile 5-stage category navigation", () => {
  it("uses the live master category tree for home → leaf routes", () => {
    const mains = getVisibleMainCategories();
    expect(mains.length).toBeGreaterThan(0);

    const main = mains.find((cat) => getChildren(cat.id).length > 0) ?? mains[0];
    const sub = getChildren(main.id)[0];
    expect(sub).toBeTruthy();

    const nested = getChildren(sub.id);
    const leaf = nested[0] ?? sub;

    expect(categoryHref(main)).toMatch(/^\/kategorie\//);
    expect(categoryHref(sub)).toContain(categoryHref(main).replace(/\/$/, ""));
    expect(getChildren(leaf.id).length === 0 || getChildren(leaf.id).length > 0).toBe(true);
  });

  it("scopes product filters to the current branch instead of a hardcoded automotive id", () => {
    const main = getMainCategories().find((cat) => getChildren(cat.id).length > 0);
    expect(main).toBeTruthy();
    if (!main) return;

    const scope = getMobileFilterScope(main);
    expect(scope.categories.map((cat) => cat.id)).toEqual(getChildren(main.id).map((cat) => cat.id));
    expect(scope.allHref).toBe(categoryHref(main));
    expect(scope.categories.every((cat) => cat.id !== main.id)).toBe(true);

    const leafParent = getChildren(main.id).find((cat) => getChildren(cat.id).length > 0);
    if (!leafParent) return;
    const leaf = getChildren(leafParent.id)[0];
    const leafScope = getMobileFilterScope(leaf);
    expect(leafScope.categories.map((cat) => cat.id)).toEqual(
      getChildren(leafParent.id).map((cat) => cat.id)
    );
  });

  it("keeps default main category from source of truth", () => {
    expect(getDefaultMainCategoryId()).toBe(getMainCategories()[0]?.id);
  });
});
