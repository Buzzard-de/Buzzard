"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { searchProducts } from "@/lib/products";
import { formatPrice } from "@/lib/products/format";
import { sanitizeSearchQuery } from "@/lib/security";

const RECENT_KEY = "buzzard_recent_searches";

interface SearchAutocompleteProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
  mobileOpen?: boolean;
}

export default function SearchAutocomplete({
  query,
  onQueryChange,
  onSubmit,
  mobileOpen,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = sanitizeSearchQuery(query)
    ? searchProducts(query, { pageSize: 6 }).items
    : [];

  function saveRecent(term: string) {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function goSearch(term: string) {
    const q = sanitizeSearchQuery(term);
    if (q) saveRecent(q);
    setOpen(false);
    router.push(q ? `/products/?q=${encodeURIComponent(q)}` : "/products/");
  }

  return (
    <div
      ref={wrapRef}
      className={`search-wrap search-autocomplete${mobileOpen ? " mobile-open" : ""}`}
    >
      <form
        className="search-bar"
        onSubmit={(e) => {
          onSubmit(e);
          saveRecent(query);
          setOpen(false);
        }}
      >
        <input
          type="search"
          placeholder={t("header.searchPlaceholder")}
          aria-label={t("header.search")}
          aria-controls="search-suggestions"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          maxLength={100}
        />
        <button type="submit" className="search-btn" aria-label={t("header.search")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </form>

      {open && (
        <div id="search-suggestions" className="search-suggestions" role="listbox">
          {recent.length > 0 && !query && (
            <div className="search-suggestions-section">
              <p>{t("search.recent")}</p>
              <ul>
                {recent.map((term) => (
                  <li key={term}>
                    <button type="button" onClick={() => goSearch(term)}>
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="search-suggestions-section">
              <p>{t("search.suggestions")}</p>
              <ul>
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <Link href={product.url} onClick={() => setOpen(false)}>
                      <span>{product.name}</span>
                      <small>{product.sku} · {formatPrice(product.price)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {query && suggestions.length === 0 && (
            <p className="search-suggestions-empty">{t("search.noResults")}</p>
          )}
        </div>
      )}
    </div>
  );
}
