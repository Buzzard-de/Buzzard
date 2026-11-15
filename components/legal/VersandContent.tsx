"use client";

import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { CONTACT_EMAIL } from "@/lib/site/contact";
import { useLocale } from "@/lib/i18n/context";

export default function VersandContent() {
  const { t } = useLocale();

  return (
    <LegalPageShell
      title={t("shippingPage.title")}
      description={t("shippingPage.lead")}
      breadcrumb={t("footer.shipping")}
      homeLabel={t("category.home")}
    >
      <p className="legal-catalog-notice">
        <strong>{t("shippingPage.catalogTitle")}</strong> {t("shippingPage.catalogText")}
      </p>

      <section>
        <h2>{t("shippingPage.statusTitle")}</h2>
        <p>{t("shippingPage.statusText")}</p>
      </section>

      <section>
        <h2>{t("shippingPage.areaTitle")}</h2>
        <p>{t("shippingPage.areaText")}</p>
      </section>

      <section>
        <h2>{t("shippingPage.timeTitle")}</h2>
        <p>{t("shippingPage.timeText")}</p>
      </section>

      <section>
        <h2>{t("shippingPage.costTitle")}</h2>
        <p>{t("shippingPage.costText")}</p>
      </section>

      <section>
        <h2>{t("shippingPage.contactTitle")}</h2>
        <p>
          {t("shippingPage.contactText")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> {t("shippingPage.or")}{" "}
          <Link href="/impressum/">{t("shippingPage.contactForm")}</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
