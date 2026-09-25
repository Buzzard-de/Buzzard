import { Suspense } from "react";
import JsonLd from "@/components/seo/JsonLd";
import CategoryBreadcrumbs from "@/components/catalog/CategoryBreadcrumbs";
import CategoryNavigation from "@/components/catalog/CategoryNavigation";
import CategoryGrid from "@/components/catalog/CategoryGrid";
import CategoryFilters from "@/components/catalog/CategoryFilters";
import VehicleCompatibilitySelector from "@/components/catalog/VehicleCompatibilitySelector";
import AutomotiveCategoryProducts from "@/components/catalog/AutomotiveCategoryProducts";
import {
  getAutomotiveRoot,
  getAutomotiveSubcategories,
  getAutomotiveCategoryBySlugPath,
  getAutomotiveBreadcrumb,
  getAutomotiveChildren,
  getAutomotiveCategoryLabel,
  getAutomotiveCategoryUrl,
  getAutomotiveFiltersForCategory,
} from "@/lib/automotive/service";
import {
  automotiveBreadcrumbJsonLd,
  automotiveCollectionJsonLd,
} from "@/lib/automotive/seo";
import { DEFAULT_LOCALE } from "@/lib/categories";

interface AutomotiveCategoryPageViewProps {
  slug: string[];
}

export default function AutomotiveCategoryPageView({ slug }: AutomotiveCategoryPageViewProps) {
  const path = slug.join("/");
  const category = path ? getAutomotiveCategoryBySlugPath(path) : getAutomotiveRoot();
  const locale = DEFAULT_LOCALE;

  if (!category) {
    return (
      <section className="shop-page">
        <div className="shop-empty">
          <h1>Category not found</h1>
        </div>
      </section>
    );
  }

  const breadcrumbChain = getAutomotiveBreadcrumb(category.id);
  const subcategories =
    category.level === 1 ? getAutomotiveSubcategories() : getAutomotiveChildren(category.id);
  const childNav =
    category.level === 2
      ? getAutomotiveChildren(category.id)
      : category.level === 1
        ? getAutomotiveSubcategories()
        : [];
  const filters = getAutomotiveFiltersForCategory(category.id);

  const jsonLdBreadcrumb = breadcrumbChain.map((node, index) => ({
    name: getAutomotiveCategoryLabel(node, locale),
    url: index < breadcrumbChain.length - 1 ? getAutomotiveCategoryUrl(node) : undefined,
  }));

  return (
    <>
      <JsonLd data={automotiveBreadcrumbJsonLd([{ name: "Home", url: "/" }, ...jsonLdBreadcrumb])} />
      <JsonLd data={automotiveCollectionJsonLd(category, locale)} />

      <section className="page-hero">
        <div className="page-hero-inner">
          <CategoryBreadcrumbs chain={breadcrumbChain} />
          <h1>{getAutomotiveCategoryLabel(category, locale)}</h1>
          {category.description?.[locale] ? <p>{category.description[locale]}</p> : null}
        </div>
      </section>

      <section className="subpage-content products-page-layout automotive-category-page">
        <Suspense fallback={null}>
          <CategoryFilters filters={filters} />
        </Suspense>

        <div className="automotive-category-main">
          <VehicleCompatibilitySelector />

          {childNav.length > 0 ? (
            <CategoryNavigation
              categories={childNav}
              currentId={category.level >= 2 ? category.id : undefined}
            />
          ) : null}

          {category.level === 1 ? <CategoryGrid categories={subcategories} /> : null}

          <Suspense fallback={<div className="products-grid" aria-busy="true" />}>
            <AutomotiveCategoryProducts categoryId={category.id} categorySlug={path} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
