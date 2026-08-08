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

export default function HomeLayout() {
  const [activeMainId, setActiveMainId] = useState(getDefaultMainCategoryId());
  const [activeSubId, setActiveSubId] = useState(() =>
    getDefaultSubCategoryId(getDefaultMainCategoryId())
  );

  const mainCategory = getCategoryById(activeMainId);
  const subCategories = getChildren(activeMainId);

  useEffect(() => {
    setActiveSubId(getDefaultSubCategoryId(activeMainId));
  }, [activeMainId]);

  return (
    <div className="home-fullscreen">
      <div className="home-shell">
        <div className="home-layout">
          <CategorySidebar activeId={activeMainId} onSelect={setActiveMainId} />
          <MegaMenu
            mainCategory={mainCategory}
            subCategories={subCategories}
            activeSubId={activeSubId}
            onSubSelect={setActiveSubId}
          />
          <FeaturedBanner mainCategory={mainCategory} activeSubId={activeSubId} />
        </div>
        <HomeHero />
      </div>
      <ServiceBar />
    </div>
  );
}
