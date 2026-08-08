"use client";

import CategoryIcon from "./CategoryIcon";
import { sidebarCategories } from "@/lib/categories";
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
        aria-label="Kategorien"
      >
        <div className="home-sidebar-head">
          <strong>Kategorien</strong>
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
          {sidebarCategories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                className={`home-sidebar-item${activeId === cat.id ? " active" : ""}`}
                onClick={() => handleSelect(cat.id)}
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
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
