"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import CategorySidebar from "./CategorySidebar";
import FeaturedBanner from "./FeaturedBanner";
import MegaMenu from "./MegaMenu";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";
import { getCategoryById, getChildren } from "@/lib/categories";
import { useIsMobileNav, useIsTabletNav } from "@/lib/use-media-query";
import MegaMenuSearch from "./MegaMenuSearch";
import LanguageSelector from "./LanguageSelector";
import CountrySelector from "./CountrySelector";

function measurePhoneDrawerTop(): number {
  const search = document.querySelector<HTMLElement>(".home-phone-controls .buzzard-mobile-search-form");
  const tekstil = document.querySelector<HTMLElement>('.mobile-home-category-rail [data-category-id="cat-01"]');
  const searchBottom = search?.getBoundingClientRect().bottom ?? 0;
  const tekstilTop = tekstil?.getBoundingClientRect().top ?? 0;
  const candidates = [searchBottom, tekstilTop].filter((value) => value > 0);
  return Math.round(candidates.length ? Math.max(...candidates) : 170);
}

export default function MegaMenuOverlay() {
  const homeUI = useHomeUI();
  const { t } = useLocale();
  const isMobile = useIsMobileNav();
  const isTablet = useIsTabletNav();
  const [activeMainId, setActiveMainId] = useState("");
  const [activeSubId, setActiveSubId] = useState("");
  const [phoneDrawerTop, setPhoneDrawerTop] = useState<number | null>(null);

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

  useLayoutEffect(() => {
    if (!open || !isMobile) {
      setPhoneDrawerTop(null);
      return;
    }
    function measure() {
      setPhoneDrawerTop(measurePhoneDrawerTop());
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, isMobile]);

  if (!open) return null;

  return (
    <div className="mega-menu-overlay" role="dialog" aria-modal="true" aria-label={t("nav.allCategories")}>
      <button
        type="button"
        className="mega-menu-backdrop"
        aria-label={t("megaMenu.close")}
        onClick={homeUI?.closeMegaMenu}
      />
      <div
        className={`mega-menu-shell${isTablet && !isMobile ? " tablet" : ""}${isMobile ? " mobile" : ""}`}
        style={isMobile && phoneDrawerTop != null ? { top: `${phoneDrawerTop}px` } : undefined}
      >
        {isMobile ? null : (
          <>
            <div className="mega-menu-shell-head">
              <strong>{t("nav.allCategories")}</strong>
              <button type="button" className="mega-menu-close" onClick={homeUI?.closeMegaMenu} aria-label={t("megaMenu.close")}>
                ×
              </button>
            </div>
            <MegaMenuSearch onNavigate={homeUI?.closeMegaMenu} />
            <div className="mega-menu-locale-market">
              <LanguageSelector />
              <CountrySelector />
            </div>
          </>
        )}

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
                <p>{t("megaMenu.pickMain")}</p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
