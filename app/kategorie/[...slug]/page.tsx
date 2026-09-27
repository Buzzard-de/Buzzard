import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import KfzPartsBrowse from "@/components/KfzPartsBrowse";
import CategoryCatalogView from "@/components/category/CategoryCatalogView";
import CategoryChildrenGrid from "@/components/category/CategoryChildrenGrid";
import CategoryJsonLd from "@/components/category/CategoryJsonLd";
import CategoryNotFound from "@/components/category/CategoryNotFound";
import KfzSubcategoryCount from "@/components/category/KfzSubcategoryCount";
import {
  findCategoryBySlugPath,
  getAllCategoryStaticParams,
  getCategoryBreadcrumb,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import {
  getKfzMains,
  getKfzStaticParams,
  isKfzSlugPath,
  parseKfzSlugPath,
  getShopL2Href,
  getKfzCompetitors,
  getCompetitorLabel,
  getKfzL3Href,
} from "@/lib/categories/kfzTree";
import { buildCategoryMetadata } from "@/lib/seo/metadata";

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
    const activeCompetitors = main.active_competitors ?? [];
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
          <p>
            <KfzSubcategoryCount count={main.subcategory_count} />
            {main.l3_count ? ` · ${main.l3_count} Produktgruppen (L3)` : ""} · {main.kfz_name}
          </p>
          {shopHref && (
            <p>
              Shop-Bereich: <Link href={shopHref}>{main.shop_l2_name}</Link>
            </p>
          )}
          {activeCompetitors.length > 0 && (
            <p className="kfz-competitor-strip">
              Wettbewerber-Abdeckung:{" "}
              {activeCompetitors.map((id) => (
                <span key={id} className="kfz-competitor-badge">{getCompetitorLabel(id)}</span>
              ))}
            </p>
          )}
        </div>
        <section className="subpage-content kfz-l3-section">
          {main.subcategories.map((sub) => (
            <article key={sub.kfz_id} className="kfz-l3-group">
              <h3><span className="kfz-parts-id">{sub.kfz_id}</span> {sub.kfz_name}</h3>
              {sub.children && sub.children.length > 0 ? (
                <div className="category-children-grid">
                  {sub.children.map((child) => (
                    <Link
                      key={child.kfz_id}
                      href={getKfzL3Href(main, child)}
                      className="category-child-card"
                    >
                      <strong>{child.kfz_id}</strong> {child.kfz_name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="kfz-parts-meta">Keine L3-Produktgruppen definiert</p>
              )}
            </article>
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
          <p>
            {getKfzMains().length} technische Hauptsysteme — verknüpft mit dem Shop unter Automotive.
            {getKfzCompetitors().length > 0 && ` · ${getKfzCompetitors().length} Marken im Sortiment`}
          </p>
          <Link href="/kategorie/automotive/" className="shop-btn-secondary">
            Zum Automotive-Shop
          </Link>
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
    return <CategoryNotFound />;
  }

  const breadcrumb = getCategoryBreadcrumb(category.id);
  const children = category.children ?? [];

  return (
    <>
      <CategoryJsonLd category={category} breadcrumb={breadcrumb} />
      <CategoryCatalogView category={category} />
      <CategoryChildrenGrid categories={children} />

      {category.id === "cat-05" && <KfzPartsBrowse compact />}

      <section className="subpage-content products-page-layout">
        <Suspense fallback={<div className="products-grid" />}>
          <ProductList categorySlug={slug.join("/")} />
        </Suspense>
      </section>
    </>
  );
}
