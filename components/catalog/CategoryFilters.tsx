"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import type { AutomotiveFilterDef } from "@/lib/automotive/service";

interface CategoryFiltersProps {
  filters: AutomotiveFilterDef[];
}

export default function CategoryFilters({ filters }: CategoryFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!filters.length) return null;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <aside className="automotive-filters" aria-label={t("automotive.filters.title")}>
      <h2>{t("automotive.filters.title")}</h2>
      {filters.map((filter) => (
        <label key={filter.key} className="automotive-filter-field">
          <span>{t(filter.labelKey)}</span>
          <input
            type="text"
            name={filter.key}
            defaultValue={searchParams.get(filter.key) || ""}
            onChange={(e) => updateFilter(filter.key, e.target.value)}
            placeholder={t("automotive.filters.any")}
          />
        </label>
      ))}
    </aside>
  );
}
