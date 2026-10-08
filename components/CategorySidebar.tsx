"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryLabel,
  getChildren,
  getMainCategoryIcon,
  getVisibleMainCategories,
  isCategoryVisibleToCustomer,
  MAIN_CATEGORY_COUNT,
} from "@/lib/categories";
import { useCategoryVisibilityMap } from "@/lib/categories/visibility-client";
import { useHomeUI } from "@/lib/home-ui";
import { useIsMobileNav } from "@/lib/use-media-query";
import { useLocale } from "@/lib/i18n/context";
import type { BuzzardLocale } from "@/lib/i18n/types";
import type { BuzzardCategory } from "@/lib/categories/types";

interface CategorySidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  /** Used inside mega menu overlay – always visible, no separate backdrop */
  embedded?: boolean;
}

interface AccordionNodeProps {
  category: BuzzardCategory;
  depth: number;
  activeId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
  locale: BuzzardLocale;
  t: (key: string) => string;
}

function AccordionNode({
  category,
  depth,
  activeId,
  expandedIds,
  onToggle,
  onNavigate,
  locale,
  t,
  visibilityMap,
}: AccordionNodeProps & { visibilityMap: Record<string, { status?: string }> }) {
  const children = getChildren(category.id).filter((c) =>
    isCategoryVisibleToCustomer(c.id, visibilityMap)
  );
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
            aria-label={`${getCategoryLabel(category, locale)} ${expanded ? t("home.collapse") : t("home.expand")}`}
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
          <span>{isMain ? formatMenuLabel(category, locale) : getCategoryLabel(category, locale)}</span>
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
              locale={locale}
              t={t}
              visibilityMap={visibilityMap}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CategorySidebar({ activeId, onSelect, embedded = false }: CategorySidebarProps) {
  const homeUI = useHomeUI();
  const isMobile = useIsMobileNav();
  const visibilityMap = useCategoryVisibilityMap();
  const { locale, t } = useLocale();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const mainCategoryNodes = getVisibleMainCategories(visibilityMap);

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
      const next = new Set<string>();
      if (!prev.has(id)) next.add(id);
      return next;
    });
    onSelect(id);
  }, [onSelect]);

  function handleDesktopSelect(id: string) {
    onSelect(id);
  }

  function handleNavigate() {
    homeUI?.closeSidebar();
    homeUI?.closeMegaMenu();
  }

  const isOpen = embedded || homeUI?.sidebarOpen;

  return (
    <>
      {!embedded && (
        <button
          type="button"
          className={`sidebar-backdrop${homeUI?.sidebarOpen ? " open" : ""}`}
          aria-label={t("megaMenu.close")}
          onClick={homeUI?.closeSidebar}
        />
      )}
      <aside
        className={`home-sidebar${isOpen ? " open" : ""}${isMobile ? " mobile-nav" : ""}${embedded ? " embedded" : ""}`}
        aria-label={t("home.mainCategories")}
      >
        {!embedded && (
          <div className="home-sidebar-head">
            <strong>{t("home.allCategoriesCount").replace("{count}", String(MAIN_CATEGORY_COUNT))}</strong>
            <button
              type="button"
              className="sidebar-close-btn"
              aria-label={t("home.close")}
              onClick={homeUI?.closeSidebar}
            >
              ×
            </button>
          </div>
        )}

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
                locale={locale}
                t={t}
                visibilityMap={visibilityMap}
              />
            ))}
          </ul>
        ) : (
          <ul className="home-sidebar-list">
            {mainCategoryNodes.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={categoryHref(cat)}
                  className={`home-sidebar-item${activeId === cat.id ? " active" : ""}`}
                  aria-current={activeId === cat.id ? "page" : undefined}
                  onMouseEnter={() => handleDesktopSelect(cat.id)}
                  onFocus={() => handleDesktopSelect(cat.id)}
                  onClick={() => handleDesktopSelect(cat.id)}
                >
                  <CategoryIcon name={getMainCategoryIcon(cat.id)} size={16} />
                  <span>{formatMenuLabel(cat, locale)}</span>
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
