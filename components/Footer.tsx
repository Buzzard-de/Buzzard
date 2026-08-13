"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

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
          <Link href="/impressum/">{t("footer.contact")}</Link>
          <a href="mailto:info@buzzard.com">info@buzzard.com</a>
        </div>
        <p className="footer-copy">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
