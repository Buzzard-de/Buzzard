"use client";

import Link from "next/link";
import { homeCampaigns } from "@/lib/navigation/home-config";
import { useLocale } from "@/lib/i18n/context";

export default function MobilePromoBanner() {
  const { t } = useLocale();
  const campaign = homeCampaigns[0];
  if (!campaign) return null;

  return (
    <Link href={campaign.href} className="buzzard-mobile-promo">
      <strong>{campaign.title}</strong>
      <span>{t("mobile.promoCta")}</span>
    </Link>
  );
}
