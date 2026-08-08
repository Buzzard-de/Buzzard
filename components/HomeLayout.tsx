"use client";

import { useEffect, useState } from "react";
import CategorySidebar from "./CategorySidebar";
import FeaturedBanner from "./FeaturedBanner";
import HomeHero from "./HomeHero";
import MegaMenu from "./MegaMenu";
import ServiceBar from "./ServiceBar";
import {
  getCategoryById,
  getDefaultMainCategoryId,
  getDefaultSubCategoryId,
  getChildren,
} from "@/lib/categories";
import { useIsMobileNav, useIsTabletNav } from "@/lib/use-media-query";

export default function HomeLayout() {
  const [activeMainId, setActiveMainId] = useState(getDefaultMainCategoryId());
  const [activeSubId, setActiveSubId] = useState(() =>
    getDefaultSubCategoryId(getDefaultMainCategoryId())
  );
  const isMobile = useIsMobileNav();
  const isTablet = useIsTabletNav();

  const mainCategory = getCategoryById(activeMainId);
  const subCategories = getChildren(activeMainId);

  useEffect(() => {
    setActiveSubId(getDefaultSubCategoryId(activeMainId));
  }, [activeMainId]);

  return (
    <div className="home-fullscreen">
      <div className="home-shell">
        <div className={`home-layout${isTablet ? " tablet-overlay" : ""}`}>
          <CategorySidebar activeId={activeMainId} onSelect={setActiveMainId} />
          {!isMobile && (
            <MegaMenu
              mainCategory={mainCategory}
              subCategories={subCategories}
              activeSubId={activeSubId}
              onSubSelect={setActiveSubId}
            />
          )}
          <FeaturedBanner mainCategory={mainCategory} activeSubId={activeSubId} />
        </div>
        <HomeHero />
      </div>
      <ServiceBar />
    </div>
  );
}
