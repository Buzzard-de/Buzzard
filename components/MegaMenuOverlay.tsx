"use client";

import { useEffect, useState } from "react";
import CategorySidebar from "./CategorySidebar";
import FeaturedBanner from "./FeaturedBanner";
import MegaMenu from "./MegaMenu";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";
import {
  getCategoryById,
  getChildren,
} from "@/lib/categories";
import { useIsMobileNav, useIsTabletNav } from "@/lib/use-media-query";
import MegaMenuSearch from "./MegaMenuSearch";

export default function MegaMenuOverlay() {
  const homeUI = useHomeUI();
  const { t } = useLocale();
  const isMobile = useIsMobileNav();
  const isTablet = useIsTabletNav();
  const [activeMainId, setActiveMainId] = useState("");
  const [activeSubId, setActiveSubId] = useState("");

  const open = homeUI?.megaMenuOpen ?? false;
  const mainCategory = activeMainId ? getCategoryById(activeMainId) : undefined;
  const subCategories = activeMainId ? getChildren(activeMainId) : [];

  useEffect(() => {
    if (!activeMainId) {
      setActiveSubId("");
      return;
    }
    setActiveSubId("");
  }, [activeMainId]);

  if (!open) return null;

  return (
    <div className="mega-menu-overlay" role="dialog" aria-modal="true" aria-label={t("nav.allCategories")}>
      <button
        type="button"
        className="mega-menu-backdrop"
        aria-label={t("megaMenu.close")}
        onClick={homeUI?.closeMegaMenu}
      />
      <div className={`mega-menu-shell${isTablet ? " tablet" : ""}${isMobile ? " mobile" : ""}`}>
        <div className="mega-menu-shell-head">
          <strong>{t("nav.allCategories")}</strong>
          <button type="button" className="mega-menu-close" onClick={homeUI?.closeMegaMenu} aria-label={t("megaMenu.close")}>
            ×
          </button>
        </div>
        <MegaMenuSearch onNavigate={homeUI?.closeMegaMenu} />

        {isMobile ? (
          <CategorySidebar activeId={activeMainId} onSelect={setActiveMainId} embedded />
        ) : (
          <div className="mega-menu-panels">
            <CategorySidebar activeId={activeMainId || "none"} onSelect={setActiveMainId} embedded />
            {activeMainId ? (
              <>
                <MegaMenu
                  mainCategory={mainCategory}
                  subCategories={subCategories}
                  activeSubId={activeSubId}
                  onSubSelect={setActiveSubId}
                />
                <FeaturedBanner mainCategory={mainCategory} activeSubId={activeSubId} />
              </>
            ) : (
              <section className="mega-panel mega-panel-placeholder">
                <p>Wählen Sie eine Hauptkategorie, um Unterkategorien anzuzeigen.</p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
