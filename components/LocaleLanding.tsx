"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { persistLanguage, persistLocale } from "@/lib/i18n/detect";
import type { BuzzardLocale } from "@/lib/i18n/types";

export default function LocaleLanding({ locale }: { locale: BuzzardLocale }) {
  const router = useRouter();

  useEffect(() => {
    persistLocale(locale, true);
    persistLanguage(locale);
    router.replace("/");
  }, [locale, router]);

  return <div className="account-loading">…</div>;
}
