"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api/config";
import { categoryHref } from "@/lib/categories";
import { findCategoryBySlugPath } from "@/lib/categories/service";

interface SearchHit {
  main: { id: string; name: string; slug: string };
  sub: { id: string; name: string; slug: string };
  leaf: { id: string; name: string; slug: string };
}

function slugTail(slug: string): string {
  return slug.split("/").pop() || slug;
}

function resolveCategoryHref(slug: string): string {
  const path = slug.replace(/^\/+/, "");
  const category = findCategoryBySlugPath(path) ?? findCategoryBySlugPath(slugTail(path));
  if (category) return categoryHref(category);
  return `/kategorie/${slugTail(path)}/`;
}

export default function MegaMenuSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const base = apiBaseUrl();
        const res = await fetch(
          `${base}/api/smart-menu-48/search?q=${encodeURIComponent(trimmed)}&limit=12`
        );
        if (res.ok) {
          const data = await res.json();
          setHits(data.items ?? []);
        } else {
          setHits([]);
        }
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmed]);

  const hint = useMemo(() => {
    if (!trimmed) return "48 Kategorien · 3 Ebenen durchsuchen";
    if (loading) return "Suche läuft…";
    if (hits.length === 0) return "Keine Treffer";
    return `${hits.length} Treffer`;
  }, [trimmed, loading, hits.length]);

  return (
    <div className="mega-menu-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kategorien durchsuchen…"
        aria-label="Kategorien durchsuchen"
        className="mega-menu-search-input"
      />
      <span className="mega-menu-search-hint">{hint}</span>
      {hits.length > 0 && (
        <ul className="mega-menu-search-results" role="list">
          {hits.map((hit) => (
            <li key={hit.leaf.id}>
              <Link
                href={resolveCategoryHref(hit.leaf.slug)}
                className="mega-menu-search-link"
                onClick={onNavigate}
              >
                <strong>{hit.leaf.name}</strong>
                <span>
                  {hit.main.name} → {hit.sub.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
