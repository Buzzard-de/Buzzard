import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductsFilterSidebar from "@/components/ProductsFilterSidebar";
import ProductList from "@/components/ProductList";

export const metadata: Metadata = {
  title: "Produkte – Buzzard",
  description:
    "Kfz-Ersatzteile und Zubehör bei Buzzard. Bremsen, Motorenöle, Filter, Zündung, Batterien, Fahrwerk und mehr.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link> <span>/</span> <span>Produkte</span>
          </nav>
          <h1>Kfz-Ersatzteile &amp; Zubehör</h1>
          <p>Hochwertige Teile für alle Fahrzeugmarken – schnell geliefert, fair bepreist.</p>
        </div>
      </section>

      <section className="subpage-content products-page-layout">
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
