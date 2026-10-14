"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catalogModeNotice } from "@/components/LegalPageShell";
import { isRtlLocale, resolveSupportedLocale } from "@/lib/i18n/types";

const COPY = {
  de: {
    title: "Buzzard Treue-QR",
    lead: "Scannen allein meldet Sie nicht an und gewährt keinen Rabatt.",
    discount:
      "Ein zweiter qualifizierter Einkauf kann bis zu 15 % erhalten, wenn die erste Bestellung nicht storniert oder zurückgegeben wurde.",
    profit: "Der Preis bleibt hinter dem bestehenden Gewinnschutz (mindestens 0,50 € Nettoproduktgewinn).",
    rights: "Gesetzliche Widerrufs- und Rückgaberechte bleiben unverändert.",
    login: "Kontoinformationen nur nach Anmeldung.",
    catalog: "Katalogmodus — die Kampagne ist nicht live.",
    signIn: "Anmelden",
    home: "Startseite",
  },
  en: {
    title: "Buzzard loyalty QR",
    lead: "Scanning alone does not sign you in and does not grant a discount.",
    discount: "A qualifying second purchase may receive up to 15% if the first order was not cancelled or returned.",
    profit: "Pricing still enforces the existing €0.50 minimum net product profit gate.",
    rights: "Statutory cancellation and return rights stay unchanged.",
    login: "Account details appear only after sign-in.",
    catalog: "Catalog mode — this campaign is not live.",
    signIn: "Sign in",
    home: "Home",
  },
  tr: {
    title: "Buzzard sadakat QR",
    lead: "Yalnızca tarama giriş yapmaz ve indirim vermez.",
    discount: "İlk sipariş iptal veya iade edilmediyse, nitelikli ikinci alışverişte en fazla %15 uygulanabilir.",
    profit: "Fiyat, mevcut en az 0,50 € net ürün kârı kapısını korur.",
    rights: "Yasal cayma ve iade hakları değişmez.",
    login: "Hesap bilgisi yalnızca oturum açtıktan sonra gösterilir.",
    catalog: "Katalog modu — kampanya canlı değildir.",
    signIn: "Giriş",
    home: "Ana sayfa",
  },
  ar: {
    title: "رمز ولاء Buzzard",
    lead: "المسح وحده لا يسجّل الدخول ولا يمنح خصمًا.",
    discount: "قد يحصل الشراء الثاني المؤهل على خصم حتى 15٪ إذا لم يُلغ الطلب الأول أو يُعاد.",
    profit: "يبقى حد الربح الصافي للمنتج 0.50 يورو ساريًا.",
    rights: "حقوق الإلغاء والإرجاع القانونية لا تتغير.",
    login: "تظهر بيانات الحساب بعد تسجيل الدخول فقط.",
    catalog: "وضع الكتالوج — الحملة غير مباشرة.",
    signIn: "تسجيل الدخول",
    home: "الرئيسية",
  },
} as const;

type Lang = keyof typeof COPY;

export function QrCampaignLanding({ locale = "de" }: { locale?: string }) {
  const [currentLocale, setCurrentLocale] = useState(locale);
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang) setCurrentLocale(lang);
  }, []);
  const resolved = resolveSupportedLocale(currentLocale);
  const t = COPY[resolved as Lang] || COPY.en;
  const rtl = isRtlLocale(resolved);

  return (
    <div className="qr-campaign-page" dir={rtl ? "rtl" : "ltr"} data-campaign-live="false">
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">{t.home}</Link> <span>/</span> <span>QR</span>
          </nav>
          <p className="qr-campaign-brand">BUZZARD</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
      </section>
      <div className="subpage-content">
        {catalogModeNotice()}
        <section className="qr-campaign-card">
          <p>{t.discount}</p>
          <p>{t.profit}</p>
          <p>{t.rights}</p>
          <p>
            <strong>{t.login}</strong>
          </p>
          <p className="qr-campaign-status">{t.catalog}</p>
          <p>
            <Link href="/konto/login/">{t.signIn}</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
