import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import JsonLd from "@/components/seo/JsonLd";
import {
  categoryHref,
  findCategoryBySlugPath,
  getAllCategoryStaticParams,
  getCategoryBreadcrumb,
  getCategoryLabel,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, categoryBreadcrumbItems, categoryCollectionSchema } from "@/lib/seo/structured-data";

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  return getAllCategoryStaticParams();
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategoryBySlugPath(slug.join("/"));
  if (!category) {
    return { title: "Kategorie – Buzzard" };
  }
  return buildCategoryMetadata(category, DEFAULT_LOCALE);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = findCategoryBySlugPath(slug.join("/"));

  if (!category) {
    return (
      <section className="shop-page">
        <div className="shop-empty">
          <h1>Kategorie nicht gefunden</h1>
          <Link href="/" className="shop-btn-primary">Zur Startseite</Link>
        </div>
      </section>
    );
  }

  const breadcrumb = getCategoryBreadcrumb(category.id);
  const name = getCategoryLabel(category, DEFAULT_LOCALE);
  const children = category.children ?? [];
  const description = `${name} bei Buzzard24 online entdecken – Kfz-Teile und Autoteile bei buzzard24.de.`;

  return (
    <>
      <JsonLd data={breadcrumbSchema(categoryBreadcrumbItems(breadcrumb, DEFAULT_LOCALE))} />
      <JsonLd data={categoryCollectionSchema(category, DEFAULT_LOCALE, description)} />
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link>
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.id}>
                <span>/</span>
                {index === breadcrumb.length - 1 ? (
                  <span>{getCategoryLabel(crumb, DEFAULT_LOCALE)}</span>
                ) : (
                  <Link href={categoryHref(crumb)}>{getCategoryLabel(crumb, DEFAULT_LOCALE)}</Link>
                )}
              </span>
            ))}
          </nav>
          <h1>{name}</h1>
          {children.length > 0 && (
            <p>{children.length} Unterkategorien verfügbar</p>
          )}
        </div>
      </section>

      {children.length > 0 && (
        <section className="subpage-content category-children-grid">
          {children.map((child) => (
            <Link key={child.id} href={categoryHref(child)} className="category-child-card">
              {getCategoryLabel(child, DEFAULT_LOCALE)}
            </Link>
          ))}
        </section>
      )}

      <section className="subpage-content products-page-layout">
        <Suspense fallback={<div className="products-grid" />}>
          <ProductList categorySlug={slug.join("/")} />
        </Suspense>
      </section>
    </>
  );
}
