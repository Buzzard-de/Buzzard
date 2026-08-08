"use client";

import { useEffect } from "react";
import { hreflangAlternates } from "@/lib/i18n/routing";
import { siteMetadata } from "@/lib/i18n/seo";
import { useLocale } from "@/lib/i18n/context";

export default function LocaleHead() {
  const { locale } = useLocale();
  const meta = siteMetadata(locale);
  const alternates = hreflangAlternates("/");

  useEffect(() => {
    document.title = meta.title;

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", meta.description);
    setMeta("og:title", meta.openGraph.title, "property");
    setMeta("og:description", meta.openGraph.description, "property");

    document.querySelectorAll('link[data-buzzard-hreflang]').forEach((node) => node.remove());
    for (const alt of alternates) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = alt.locale;
      link.href = alt.href;
      link.setAttribute("data-buzzard-hreflang", "1");
      document.head.appendChild(link);
    }

    const canonical = document.querySelector('link[rel="canonical"]') ?? document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", alternates.find((a) => a.locale === locale)?.href ?? "/");
    if (!canonical.parentElement) document.head.appendChild(canonical);
  }, [locale, meta.title, meta.description, meta.openGraph.title, meta.openGraph.description, alternates]);

  return null;
}
