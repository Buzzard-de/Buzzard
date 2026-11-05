import LocaleLanding from "@/components/LocaleLanding";
import { SUPPORTED_LOCALES, type BuzzardLocale } from "@/lib/i18n/types";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocalePrefixPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as BuzzardLocale)) {
    notFound();
  }
  return <LocaleLanding locale={locale as BuzzardLocale} />;
}
