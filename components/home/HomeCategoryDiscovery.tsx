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

function resetPhoneBoxLayout(boxes: HTMLElement, grid: HTMLElement | null) {
  boxes.style.marginTop = "0px";
  if (!grid) return;
  for (const node of grid.querySelectorAll(".home-category-tile-group--fill")) node.remove();
  for (const node of grid.querySelectorAll(".home-category-tile-group")) {
    if (node instanceof HTMLElement) {
      node.style.height = "";
      node.style.minHeight = "";
    }
  }
}

function fillBoxesToLastCategory() {
  const grid = document.querySelector(".home-page-canonical .home-category-grid");
  const rail = document.querySelector(".mobile-home-category-rail");
  if (!(grid instanceof HTMLElement)) return;
  if (!(rail instanceof HTMLElement) || window.getComputedStyle(rail).display === "none") {
    for (const node of grid.querySelectorAll(".home-category-tile-group--fill")) node.remove();
    for (const node of grid.querySelectorAll(".home-category-tile-group")) {
      if (node instanceof HTMLElement) {
        node.style.height = "";
        node.style.minHeight = "";
      }
    }
    return;
  }

  const cats = [...rail.querySelectorAll("[data-category-id]")];
  const startIndex = cats.findIndex((el) => el.getAttribute("data-category-id") === "cat-07");
  if (startIndex < 0) return;

  const pairs: Element[][] = [];
  for (let index = startIndex; index < cats.length; index += 2) {
    pairs.push(cats.slice(index, index + 2));
  }

  const needed = pairs.length * 2;
  const realCount = grid.querySelectorAll(".home-category-tile-group:not(.home-category-tile-group--fill)").length;
  while (realCount + grid.querySelectorAll(".home-category-tile-group--fill").length < needed) {
    const fill = document.createElement("div");
    fill.className = "home-category-tile-group home-category-tile-group--fill";
    fill.setAttribute("aria-hidden", "true");
    grid.appendChild(fill);
  }
  while (realCount + grid.querySelectorAll(".home-category-tile-group--fill").length > needed) {
    grid.querySelector(".home-category-tile-group--fill:last-child")?.remove();
  }

  const groups = [...grid.querySelectorAll(".home-category-tile-group")];
  const gap = Number.parseFloat(window.getComputedStyle(grid).rowGap) || 0;
  pairs.forEach((pair, index) => {
    const start = pair[0].getBoundingClientRect();
    const end = pair[pair.length - 1].getBoundingClientRect();
    const isLast = index === pairs.length - 1;
    const height = Math.max(0, Math.round(end.bottom - start.top - (isLast ? 0 : gap)));
    const left = groups[index * 2];
    const right = groups[index * 2 + 1];
    if (left instanceof HTMLElement) left.style.height = `${height}px`;
    if (right instanceof HTMLElement) right.style.height = `${height}px`;
  });
}

function alignBoxesWithAutomotive() {
  const boxes = document.querySelector(".home-page-canonical .home-category-discovery");
  const first = document.querySelector(".home-page-canonical .home-category-tile-group");
  const rail = document.querySelector(".mobile-home-category-rail");
  const start = document.querySelector(".mobile-home-category-rail [data-category-id='cat-07']");
  if (!(boxes instanceof HTMLElement)) return;
  const grid = document.querySelector(".home-page-canonical .home-category-grid");
  if (
    !(rail instanceof HTMLElement) ||
    !(start instanceof HTMLElement) ||
    window.getComputedStyle(rail).display === "none"
  ) {
    resetPhoneBoxLayout(boxes, grid instanceof HTMLElement ? grid : null);
    return;
  }
  fillBoxesToLastCategory();
  const target = first instanceof HTMLElement ? first : boxes;
  const currentMargin = Number.parseFloat(boxes.style.marginTop || "0") || 0;
  const delta = start.getBoundingClientRect().top - target.getBoundingClientRect().top;
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
    const start = document.querySelector(".mobile-home-category-rail [data-category-id='cat-07']");
    const observer = new ResizeObserver(run);
    if (rail) observer.observe(rail);
    if (start) observer.observe(start);
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
