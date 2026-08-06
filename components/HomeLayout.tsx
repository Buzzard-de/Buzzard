"use client";

import { useState } from "react";
import CategorySidebar from "./CategorySidebar";
import FeaturedBanner from "./FeaturedBanner";
import MegaMenu from "./MegaMenu";
import ServiceBar from "./ServiceBar";
import { defaultMegaMenuId, megaMenuContent } from "@/lib/categories";

export default function HomeLayout() {
  const [activeCategory, setActiveCategory] = useState(defaultMegaMenuId);
  const content = megaMenuContent[activeCategory] ?? megaMenuContent[defaultMegaMenuId];

  return (
    <div className="home-fullscreen">
      <div className="home-shell">
        <div className="home-layout">
          <CategorySidebar activeId={activeCategory} onSelect={setActiveCategory} />
          <MegaMenu content={content} />
          <FeaturedBanner />
        </div>
      </div>
      <ServiceBar />
    </div>
  );
}
