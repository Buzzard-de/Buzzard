import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductsFilterSidebar from "@/components/ProductsFilterSidebar";
import ProductList from "@/components/ProductList";
import ProductsSeoGuard from "@/components/seo/ProductsSeoGuard";

export const metadata: Metadata = {
  title: "Kfz-Teile & Autoteile – Produkte",
  description:
    "Buzzard24 Produkte: Kfz-Teile, Autoteile, Motoröl, Bremsen, Filter und Fahrzeugzubehör – große Auswahl bei buzzard24.de.",
  alternates: {
    canonical: "https://buzzard24.de/products/",
  },
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
          <p>Große Auswahl in allen Kategorien — online durchstöbern und unverbindlich anfragen.</p>
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
