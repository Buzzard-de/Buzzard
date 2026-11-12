"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { storefrontString } from "@/lib/i18n/translations";
import { listingSeo } from "@/lib/storefront/productSeo";

export default function ProductsPageIntro() {
  const { locale } = useLocale();
  const seo = listingSeo(locale);
  useEffect(() => {
    const apply = () => { if (document.title !== seo.title) document.title = seo.title; };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [seo.title]);
  const title = storefrontString(locale, "catalog.pageTitle");
  const lead = storefrontString(locale, "catalog.pageLead");
  const home = storefrontString(locale, "category.home");
  const products = storefrontString(locale, "product.products");
  const crumb = storefrontString(locale, "mobile.breadcrumb");
  return (
    <section className="page-hero buzzard-desktop-chrome">
      <div className="page-hero-inner">
        <nav className="page-hero-breadcrumb" aria-label={crumb.text}>
          <Link href="/">{home.text}</Link> <span>/</span> <span>{products.text}</span>
        </nav>
        <h1>{title.text}</h1>
        <p>{lead.text}</p>
        <p data-review={title.review}>{title.provenance} · {title.review}</p>
      </div>
    </section>
  );
}
