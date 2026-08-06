"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { filterOptions } from "@/lib/categories";
import { isAllowedFilter } from "@/lib/security";

export default function ProductsFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = isAllowedFilter(searchParams.get("filter") || "alle", filterOptions)
    ? searchParams.get("filter") || "alle"
    : "alle";

  function setFilter(filter: string) {
    if (!isAllowedFilter(filter, filterOptions)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "alle") params.delete("filter");
    else params.set("filter", filter);
    const q = params.toString();
    router.push(q ? `/products/?${q}` : "/products/");
  }

  return (
    <aside className="home-sidebar products-filter-sidebar" aria-label="Kategoriefilter">
      <h2 className="category-sidebar-title">Filter</h2>
      <ul className="home-sidebar-list">
        {filterOptions.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              className={`home-sidebar-item${activeFilter === opt.id ? " active" : ""}`}
              onClick={() => setFilter(opt.id)}
            >
              <span>{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="category-sidebar-links">
        <Link href="/">← Startseite</Link>
      </div>
    </aside>
  );
}
