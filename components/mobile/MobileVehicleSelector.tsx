"use client";

import { useShop } from "@/lib/shop";
import { useLocale } from "@/lib/i18n/context";

export default function MobileVehicleSelector() {
  const { openVehicleModal, vehicle, vin } = useShop();
  const { t } = useLocale();

  const detail = vehicle
    ? `${vehicle.brand} ${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ""}${vehicle.engine ? ` · ${vehicle.engine}` : ""}`
    : vin
      ? `VIN: ${vin.slice(0, 8)}…`
      : t("nav.vehiclePlaceholder");

  return (
    <div className="buzzard-mobile-vehicle">
      <button type="button" className="buzzard-mobile-vehicle-btn" onClick={openVehicleModal}>
        <span>
          <strong>{t("nav.vehicleSelect")}</strong>
          <small>{detail}</small>
        </span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
