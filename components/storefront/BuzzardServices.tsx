"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { useLocale } from "@/lib/i18n/context";

const SERVICES = [
  { titleKey: "home.serviceAdvice", textKey: "home.serviceAdviceText", icon: "phone" },
  { titleKey: "home.serviceCatalog", textKey: "home.serviceCatalogText", icon: "box" },
  { titleKey: "home.serviceDelivery", textKey: "home.serviceDeliveryText", icon: "truck" },
  { titleKey: "home.serviceSecure", textKey: "home.serviceSecureText", icon: "lock" },
] as const;

export default function BuzzardServices() {
  const { t } = useLocale();

  return (
    <section className="buzzard-services" aria-labelledby="buzzard-services-title">
      <h2 id="buzzard-services-title" className="buzzard-services-title">
        {t("home.servicesTitle")}
      </h2>
      <ul className="buzzard-services-grid">
        {SERVICES.map((item) => (
          <li key={item.titleKey} className="buzzard-service-card">
            <CategoryIcon name={item.icon} size={28} />
            <h3>{t(item.titleKey)}</h3>
            <p>{t(item.textKey)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
