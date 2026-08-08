"use client";

import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { mainNavLinks } from "@/lib/categories";
import { useShop } from "@/lib/shop";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";

export default function Navbar() {
  const { openVehicleModal, vehicle, vin } = useShop();
  const homeUI = useHomeUI();
  const { t } = useLocale();

  const vehicleLabel = vehicle
    ? `${vehicle.brand} ${vehicle.model}`
    : vin
      ? `VIN: ${vin.slice(0, 8)}…`
      : t("nav.vehiclePlaceholder");

  return (
    <nav className="main-nav" role="navigation" aria-label="Hauptnavigation">
      <div className="main-nav-inner">
        <button type="button" className="vehicle-select-btn" onClick={openVehicleModal}>
          <CategoryIcon name="car" size={22} />
          <span>
            <strong>{t("nav.vehicleSelect")}</strong>
            <small>{vehicleLabel}</small>
          </span>
        </button>

        <button
          type="button"
          className="all-categories-btn"
          aria-expanded={homeUI?.megaMenuOpen}
          aria-haspopup="dialog"
          onClick={homeUI?.toggleMegaMenu}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          {t("nav.allCategories")}
        </button>

        <ul className="main-nav-links">
          {mainNavLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
