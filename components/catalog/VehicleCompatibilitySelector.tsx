"use client";

/**
 * Vehicle compatibility selector shell — uses existing shop vehicle context.
 * No TecDoc live connection; internal abstraction only.
 */
import { useShop } from "@/lib/shop";
import { useLocale } from "@/lib/i18n/context";

export default function VehicleCompatibilitySelector() {
  const { vehicle } = useShop();
  const { t } = useLocale();

  return (
    <div className="automotive-vehicle-compat" aria-live="polite">
      <p className="automotive-vehicle-compat-label">{t("automotive.vehicle.label")}</p>
      {vehicle?.brand ? (
        <p className="automotive-vehicle-compat-value">
          {[vehicle.brand, vehicle.model, vehicle.year, vehicle.engine].filter(Boolean).join(" · ")}
        </p>
      ) : (
        <p className="automotive-vehicle-compat-placeholder">{t("automotive.vehicle.placeholder")}</p>
      )}
    </div>
  );
}
