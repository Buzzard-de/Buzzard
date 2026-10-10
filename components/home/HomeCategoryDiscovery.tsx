"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getMainCategoryIcon,
} from "@/lib/categories";
import { getHomeCategoryList } from "@/lib/home/homepageContent";
import { useLocale } from "@/lib/i18n/context";

function alignBoxesWithAutomotive() {
  const boxes = document.querySelector(".home-page-canonical .home-category-discovery");
  const rail = document.querySelector(".mobile-home-category-rail");
  const automotive = document.querySelector(".mobile-home-category-rail [data-category-id='cat-05']");
  if (!(boxes instanceof HTMLElement)) return;
  if (
    !(rail instanceof HTMLElement) ||
    !(automotive instanceof HTMLElement) ||
    window.getComputedStyle(rail).display === "none"
  ) {
    boxes.style.marginTop = "0px";
    return;
  }
  const currentMargin = Number.parseFloat(boxes.style.marginTop || "0") || 0;
  const delta = automotive.getBoundingClientRect().top - boxes.getBoundingClientRect().top;
  if (Math.abs(delta) < 1) return;
  boxes.style.marginTop = `${Math.max(0, Math.round(currentMargin + delta))}px`;
}

function groupCategories<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export default function HomeCategoryDiscovery() {
  const { locale, t } = useLocale();
  const categories = getHomeCategoryList();

  useLayoutEffect(() => {
    const run = () => alignBoxesWithAutomotive();
    run();
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    void document.fonts?.ready.then(run);
    const rail = document.querySelector(".mobile-home-category-rail");
    const automotive = document.querySelector(".mobile-home-category-rail [data-category-id='cat-05']");
    const observer = new ResizeObserver(run);
    if (rail) observer.observe(rail);
    if (automotive) observer.observe(automotive);
    window.addEventListener("resize", run);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);

  return (
    <section className="home-section home-category-discovery" aria-labelledby="home-categories-title">
      <div className="home-section-head">
        <h2 id="home-categories-title">{t("home.mainCategories")}</h2>
        <Link href="/products/" className="home-section-link">
          {t("home.allCategories")}
        </Link>
      </div>
      <div className="home-category-grid" role="list">
        {groupCategories(categories, 3).map((group) => (
          <div key={group.map((cat) => cat.id).join("-")} className="home-category-tile-group">
            {group.map((cat) => (
              <Link
                key={cat.id}
                href={categoryHref(cat)}
                className="home-category-tile"
                role="listitem"
                data-category-id={cat.id}
                aria-label={formatMenuLabel(cat, locale)}
              >
                <span className="home-category-tile-icon">
                  <CategoryIcon name={getMainCategoryIcon(cat.id)} size={28} />
                </span>
                <span className="home-category-tile-label">{formatMenuLabel(cat, locale)}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
