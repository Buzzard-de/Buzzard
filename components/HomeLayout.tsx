"use client";

import { useEffect, useState } from "react";
import CategorySidebar from "./CategorySidebar";
import FeaturedBanner from "./FeaturedBanner";
import HomeHero from "./HomeHero";
import MegaMenu from "./MegaMenu";
import ServiceBar from "./ServiceBar";
import {
  defaultMainCategoryId,
  findMainCategory,
  getDefaultSubCategoryId,
  getSubCategories,
  getSubSubCategories,
} from "@/lib/categories";

export default function HomeLayout() {
  const [activeMainId, setActiveMainId] = useState(defaultMainCategoryId);
  const [activeSubId, setActiveSubId] = useState(() => getDefaultSubCategoryId(defaultMainCategoryId));

  const mainCategory = findMainCategory(activeMainId);
  const subCategories = getSubCategories(activeMainId);
  const subSubCategories = getSubSubCategories(activeMainId, activeSubId);

  useEffect(() => {
    setActiveSubId(getDefaultSubCategoryId(activeMainId));
  }, [activeMainId]);

  function handleMainSelect(mainId: string) {
    setActiveMainId(mainId);
  }

  function handleSubSelect(subId: string) {
    setActiveSubId(subId);
  }

  return (
    <div className="home-fullscreen">
      <div className="home-shell">
        <div className="home-layout">
          <CategorySidebar activeId={activeMainId} onSelect={handleMainSelect} />
          <MegaMenu
            mainCategory={mainCategory}
            subCategories={subCategories}
            activeSubId={activeSubId}
            onSubSelect={handleSubSelect}
          />
          <FeaturedBanner
            mainCategory={mainCategory}
            subCategories={subCategories}
            subSubCategories={subSubCategories}
            activeSubId={activeSubId}
          />
        </div>
        <HomeHero />
      </div>
      <ServiceBar />
    </div>
  );
}
