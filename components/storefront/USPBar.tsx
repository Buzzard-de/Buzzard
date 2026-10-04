"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { useLocale } from "@/lib/i18n/context";

const USP_ITEMS = [
  { key: "home.uspShipping", icon: "truck" },
  { key: "home.uspReturns", icon: "return" },
  { key: "home.uspPayment", icon: "shield" },
  { key: "home.uspQuality", icon: "star" },
  { key: "home.uspSupport", icon: "phone" },
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
