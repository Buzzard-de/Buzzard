import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductsFilterSidebar from "@/components/ProductsFilterSidebar";
import ProductList from "@/components/ProductList";
import ProductsSeoGuard from "@/components/seo/ProductsSeoGuard";

export const metadata: Metadata = {
  title: "Produkte – Buzzard",
  description:
    "Produkte bei Buzzard: Textil, Kosmetik, Reinigung, Schule & Bürobedarf und mehr – schnell geliefert, fair bepreist.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link> <span>/</span> <span>Produkte</span>
          </nav>
          <h1>Produkte &amp; Sortiment</h1>
          <p>Hochwertige Artikel in allen Kategorien – schnell geliefert, fair bepreist.</p>
        </div>
      </section>

      <section className="subpage-content products-page-layout">
        <Suspense fallback={null}>
          <ProductsSeoGuard />
        </Suspense>
        <Suspense fallback={<aside className="home-sidebar" />}>
          <ProductsFilterSidebar />
        </Suspense>
        <Suspense fallback={<div className="products-grid" />}>
          <ProductList />
        </Suspense>
      </section>
    </>
  );
}
