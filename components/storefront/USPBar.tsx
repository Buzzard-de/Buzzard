"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { useLocale } from "@/lib/i18n/context";

const USP_ITEMS = [
  { key: "home.trustChoice", icon: "star" },
  { key: "home.trustInfo", icon: "box" },
  { key: "home.trustSupport", icon: "phone" },
  { key: "home.trustAdvice", icon: "shield" },
] as const;

export default function USPBar() {
  const { t } = useLocale();

  return (
    <section className="usp-bar" aria-label={t("home.uspAria")}>
      <ul className="usp-bar-list">
        {USP_ITEMS.map((item) => (
          <li key={item.key} className="usp-item">
            <CategoryIcon name={item.icon} size={22} />
            <span>{t(item.key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
