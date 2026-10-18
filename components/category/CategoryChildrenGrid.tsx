"use client";

import Link from "next/link";
import { categoryHref, getCategoryLabel, getCategoryVisual, hasHubSubcategoryVisual } from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

const VEHICLE_HUB_MARK: Record<string, string> = {
  pkw: "🚗",
  transporter: "🚐",
  lkw: "🚛",
  bus: "🚌",
  motorrad: "🏍️",
  traktor: "🚜",
  baumaschinen: "🚧",
  reifen: "🛞",
  felgen: "⚙️",
  bagger: "🚜",
  "mini-bagger": "🚜",
  radlader: "🪣",
  backhoe: "🚜",
  walze: "🛞",
  planierraupe: "🚜",
  grader: "🛠️",
  kran: "🏗️",
  kipper: "🚛",
  stapler: "🏭",
  betontechnik: "🧱",
  rinder: "🐄",
  schafe: "🐑",
  ziegen: "🐐",
  gefluegel: "🐔",
  imkerei: "🐝",
  pferde: "🐴",
  schweine: "🐖",
};

interface CategoryChildrenGridProps {
  categories: BuzzardCategory[];
  variant?: "default" | "vehicle-hubs";
}

export default function CategoryChildrenGrid({
  categories,
  variant = "default",
}: CategoryChildrenGridProps) {
  const { locale } = useLocale();
  if (categories.length === 0) return null;

  const hub = variant === "vehicle-hubs";

  return (
    <section className={`subpage-content category-children-grid${hub ? " vehicle-hub-grid" : ""}`}>
      {categories.map((child) => {
        const photo = hasHubSubcategoryVisual(child.id);
        const label = getCategoryLabel(child, locale);
        return (
          <Link
            key={child.id}
            href={categoryHref(child)}
            className={hub ? `vehicle-hub-card${photo ? " vehicle-hub-card--photo" : ""}` : "category-child-card"}
          >
            {photo ? (
              <span className="vehicle-hub-visual">
                <img src={getCategoryVisual(child.id)} alt="" width={320} height={320} />
              </span>
            ) : hub && VEHICLE_HUB_MARK[child.slug] ? (
              <span className="vehicle-hub-mark" aria-hidden="true">
                {VEHICLE_HUB_MARK[child.slug]}
              </span>
            ) : null}
            {hub ? <strong>{label}</strong> : label}
          </Link>
        );
      })}
    </section>
  );
}
