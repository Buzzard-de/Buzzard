"use client";

import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { isSalesEnabled } from "@/lib/shop/mode";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from "@/lib/site/contact";
import { useLocale } from "@/lib/i18n/context";

const catalogBadges = [
  { key: "service.catalogChoice", icon: "star" },
  { key: "service.catalogInfo", icon: "box" },
  { key: "service.catalogSupport", icon: "phone" },
  { key: "service.catalogAdvice", icon: "shield" },
] as const;

const salesBadges = [
  { key: "service.salesShipping", icon: "truck" },
  { key: "service.salesReturns", icon: "return" },
  { key: "service.salesPayment", icon: "shield" },
  { key: "service.salesQuality", icon: "star" },
] as const;

export default function ServiceBar() {
  const { t } = useLocale();
  const badges = isSalesEnabled() ? salesBadges : catalogBadges;

  return (
    <section className="service-bar" aria-label={t("service.aria")}>
      <div className="service-trust-row" aria-label={t("service.benefits")}>
        {badges.map((badge) => (
          <div key={badge.key} className="service-trust-item">
            <CategoryIcon name={badge.icon} size={20} />
            <span>{t(badge.key)}</span>
          </div>
        ))}
      </div>
      <div className="service-bar-inner">
        <div className="service-item">
          <CategoryIcon name="phone" size={28} />
          <div>
            <strong>{t("service.customer")}</strong>
            <span>{CONTACT_PHONE_DISPLAY}</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="mail" size={28} />
          <div>
            <strong>{t("service.email")}</strong>
            <span>{CONTACT_EMAIL}</span>
          </div>
        </div>
        <Link href="/hilfe/#faq" className="service-item">
          <CategoryIcon name="return" size={28} />
          <div>
            <strong>{t("service.help")}</strong>
            <span>/hilfe/</span>
          </div>
        </Link>
        <Link href="/datenschutz/" className="service-item">
          <CategoryIcon name="lock" size={28} />
          <div>
            <strong>{t("service.privacy")}</strong>
            <span>{t("service.gdpr")}</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
