import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import KfzPartsBrowse from "@/components/KfzPartsBrowse";
import JsonLd from "@/components/seo/JsonLd";
import {
  categoryHref,
  findCategoryBySlugPath,
  getAllCategoryStaticParams,
  getCategoryBreadcrumb,
  getCategoryLabel,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import {
  getKfzMains,
  getKfzStaticParams,
  isKfzSlugPath,
  parseKfzSlugPath,
  getShopL2Href,
} from "@/lib/categories/kfzTree";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, categoryBreadcrumbItems, categoryCollectionSchema } from "@/lib/seo/structured-data";

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  return [...getAllCategoryStaticParams(), ...getKfzStaticParams()];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isKfzSlugPath(slug)) {
    const { main } = parseKfzSlugPath(slug);
    if (main) {
      return { title: `${main.name_de} — KFZ-Teilebaum | Buzzard` };
    }
    return { title: "KFZ-Teilebaum — Buzzard" };
  }
  const category = findCategoryBySlugPath(slug.join("/"));
  if (!category) {
    return { title: "Kategorie – Buzzard" };
  }
  return buildCategoryMetadata(category, DEFAULT_LOCALE);
}

function KfzBrowsePage({ slug }: { slug: string[] }) {
  const { main } = parseKfzSlugPath(slug);

  if (!main && slug.length > 2) {
    return (
      <section className="shop-page">
        <div className="shop-empty">
          <h1>KFZ-Kategorie nicht gefunden</h1>
          <Link href="/kategorie/automotive/kfz/" className="shop-btn-primary">Zum KFZ-Teilebaum</Link>
        </div>
      </section>
    );
  }

  if (main) {
    const shopHref = getShopL2Href(main);
    return (
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link>
            <span><span>/</span><Link href="/kategorie/automotive/">Automotive</Link></span>
            <span><span>/</span><Link href="/kategorie/automotive/kfz/">KFZ-Teilebaum</Link></span>
            <span><span>/</span><span>{main.name_de}</span></span>
          </nav>
          <h1>
            <span className="kfz-parts-id">{main.kfz_id}</span> {main.name_de}
          </h1>
          <p>{main.subcategory_count} Unterkategorien · {main.kfz_name}</p>
          {shopHref && (
            <p>
              Shop-Bereich: <Link href={shopHref}>{main.shop_l2_name}</Link>
            </p>
          )}
        </div>
        <section className="subpage-content category-children-grid">
          {main.subcategories.map((sub) => (
            <div key={sub.kfz_id} className="category-child-card">
              <strong>{sub.kfz_id}</strong> {sub.kfz_name}
            </div>
          ))}
        </section>
        {shopHref && (
          <section className="subpage-content products-page-layout">
            <Suspense fallback={<div className="products-grid" />}>
              <ProductList categorySlug={`automotive/${main.shop_l2_slug}`} />
            </Suspense>
          </section>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link>
            <span><span>/</span><Link href="/kategorie/automotive/">Automotive</Link></span>
            <span><span>/</span><span>KFZ-Teilebaum</span></span>
          </nav>
          <h1>KFZ-Teilebaum</h1>
          <p>{getKfzMains().length} Hauptsysteme — Buzzard Master Kfz Category Intelligence V1</p>
        </div>
      </section>
      <KfzPartsBrowse />
    </>
  );
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  if (isKfzSlugPath(slug)) {
    return <KfzBrowsePage slug={slug} />;
  }

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
  const description = `${name} bei Buzzard24 — Kategorie im Demo-Katalog. Produkte entdecken und informieren.`;

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

      {category.id === "cat-05" && <KfzPartsBrowse compact />}

      <section className="subpage-content products-page-layout">
        <Suspense fallback={<div className="products-grid" />}>
          <ProductList categorySlug={slug.join("/")} />
        </Suspense>
      </section>
    </>
  );
}
