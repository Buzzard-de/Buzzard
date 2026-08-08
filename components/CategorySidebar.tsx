"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryAncestors,
  getCategoryLabel,
  getChildren,
  getMainCategories,
  getMainCategoryIcon,
  mainCategories,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import { useHomeUI } from "@/lib/home-ui";
import { useIsMobileNav } from "@/lib/use-media-query";
import type { BuzzardCategory } from "@/lib/categories/types";

interface CategorySidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

interface AccordionNodeProps {
  category: BuzzardCategory;
  depth: number;
  activeId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}

function AccordionNode({
  category,
  depth,
  activeId,
  expandedIds,
  onToggle,
  onNavigate,
}: AccordionNodeProps) {
  const children = getChildren(category.id);
  const hasChildren = children.length > 0;
  const expanded = expandedIds.has(category.id);
  const isMain = depth === 0;

  return (
    <li className={`category-accordion-item depth-${depth}`}>
      <div className="category-accordion-row">
        {hasChildren ? (
          <button
            type="button"
            className={`category-accordion-toggle${expanded ? " open" : ""}`}
            aria-expanded={expanded}
            aria-label={`${getCategoryLabel(category, DEFAULT_LOCALE)} ${expanded ? "einklappen" : "ausklappen"}`}
            onClick={() => onToggle(category.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
              <path d={expanded ? "M6 9l6 6 6-6" : "M9 18l6-6-6-6"} />
            </svg>
          </button>
        ) : (
          <span className="category-accordion-spacer" aria-hidden="true" />
        )}
        <Link
          href={categoryHref(category)}
          className={`home-sidebar-item category-accordion-link${activeId === category.id ? " active" : ""}`}
          onClick={onNavigate}
        >
          {isMain && <CategoryIcon name={getMainCategoryIcon(category.id)} size={16} />}
          <span>{isMain ? formatMenuLabel(category, DEFAULT_LOCALE) : getCategoryLabel(category, DEFAULT_LOCALE)}</span>
        </Link>
      </div>
      {hasChildren && expanded && (
        <ul className="category-accordion-children" role="group">
          {children.map((child) => (
            <AccordionNode
              key={child.id}
              category={child}
              depth={depth + 1}
              activeId={activeId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CategorySidebar({ activeId, onSelect }: CategorySidebarProps) {
  const homeUI = useHomeUI();
  const isMobile = useIsMobileNav();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set([activeId]));
  const mainCategoryNodes = getMainCategories();

  useEffect(() => {
    const pathIds = [...getCategoryAncestors(activeId).map((c) => c.id), activeId];
    setExpandedIds((prev) => {
      const next = new Set(prev);
      pathIds.forEach((id) => next.add(id));
      return next;
    });
  }, [activeId]);

  useEffect(() => {
    if (!homeUI?.sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") homeUI?.closeSidebar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [homeUI]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onSelect(id);
  }, [onSelect]);

  function handleDesktopSelect(id: string) {
    onSelect(id);
  }

  function handleNavigate() {
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
        className={`home-sidebar${homeUI?.sidebarOpen ? " open" : ""}${isMobile ? " mobile-nav" : ""}`}
        aria-label="Hauptkategorien"
      >
        <div className="home-sidebar-head">
          <strong>{isMobile ? "Kategorien" : "Hauptkategorien"}</strong>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Schließen"
            onClick={homeUI?.closeSidebar}
          >
            ×
          </button>
        </div>

        {isMobile ? (
          <ul className="home-sidebar-list category-accordion-list">
            {mainCategoryNodes.map((cat) => (
              <AccordionNode
                key={cat.id}
                category={cat}
                depth={0}
                activeId={activeId}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onNavigate={handleNavigate}
              />
            ))}
          </ul>
        ) : (
          <ul className="home-sidebar-list">
            {mainCategories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={cat.href}
                  className={`home-sidebar-item${activeId === cat.id ? " active" : ""}`}
                  aria-current={activeId === cat.id ? "page" : undefined}
                  onMouseEnter={() => handleDesktopSelect(cat.id)}
                  onFocus={() => handleDesktopSelect(cat.id)}
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
        )}
      </aside>
    </>
  );
}
