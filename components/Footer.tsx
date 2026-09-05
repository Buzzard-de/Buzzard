"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { CONTACT_EMAIL } from "@/lib/site/contact";

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span>BUZZARD24</span>
        </div>
        <div className="footer-links">
          <Link href="/hilfe/">{t("footer.help")}</Link>
          <Link href="/hilfe/#faq">{t("footer.faq")}</Link>
          <Link href="/agb/">{t("footer.terms")}</Link>
          <Link href="/versand/">{t("footer.shipping")}</Link>
          <Link href="/widerruf/">{t("footer.withdrawal")}</Link>
          <Link href="/impressum/">{t("footer.imprint")}</Link>
          <Link href="/datenschutz/">{t("footer.privacy")}</Link>
          <Link href="/hilfe/#kontakt">{t("footer.contact")}</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
        <p className="footer-copy">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
