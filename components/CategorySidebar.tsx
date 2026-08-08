"use client";

import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { mainCategories } from "@/lib/categories";
import { useHomeUI } from "@/lib/home-ui";

interface CategorySidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CategorySidebar({ activeId, onSelect }: CategorySidebarProps) {
  const homeUI = useHomeUI();

  function handleSelect(id: string) {
    onSelect(id);
    homeUI?.closeSidebar();
  }

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${homeUI?.sidebarOpen ? " open" : ""}`}
        aria-label="Menü schließen"
        onClick={homeUI?.closeSidebar}
      />
      <aside
        className={`home-sidebar${homeUI?.sidebarOpen ? " open" : ""}`}
        aria-label="Hauptkategorien"
      >
        <div className="home-sidebar-head">
          <strong>Hauptkategorien</strong>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Schließen"
            onClick={homeUI?.closeSidebar}
          >
            ×
          </button>
        </div>
        <ul className="home-sidebar-list">
          {mainCategories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={cat.href}
                className={`home-sidebar-item${activeId === cat.id ? " active" : ""}`}
                aria-current={activeId === cat.id ? "page" : undefined}
                onMouseEnter={() => handleSelect(cat.id)}
                onFocus={() => handleSelect(cat.id)}
              >
                <CategoryIcon name={cat.icon} size={16} />
                <span>{cat.label}</span>
                <svg
                  className="chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
