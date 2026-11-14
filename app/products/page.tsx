import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsFilterSidebar from "@/components/ProductsFilterSidebar";
import ProductList from "@/components/ProductList";
import ProductsSeoGuard from "@/components/seo/ProductsSeoGuard";
import ProductsPageIntro from "@/components/storefront/ProductsPageIntro";

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
      <ProductsPageIntro />

      <section className="subpage-content products-page-layout">
        <Suspense fallback={null}>
          <ProductsSeoGuard />
        </Suspense>
        <div className="buzzard-desktop-chrome">
          <Suspense fallback={<aside className="home-sidebar" />}>
            <ProductsFilterSidebar />
          </Suspense>
        </div>
        <Suspense fallback={<div className="products-grid" />}>
          <ProductList />
        </Suspense>
      </section>
    </>
  );
}
