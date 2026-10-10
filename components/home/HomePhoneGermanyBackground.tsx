"use client";

import { useLayoutEffect } from "react";
import { getGermanyPhoneBandBackground } from "@/lib/backgrounds/languageBackgrounds";
import { useMarket } from "@/lib/market/context";

function layoutGermanyBand() {
  const bg = document.querySelector(".home-phone-germany-bg");
  const layout = document.querySelector(".home-phone-layout");
  const search =
    document.querySelector(".home-phone-controls .buzzard-mobile-search-form") ??
    document.querySelector(".home-phone-controls .buzzard-mobile-search");
  const boxes = document.querySelector(".home-page-canonical .home-category-tile-group");
  if (!(bg instanceof HTMLElement) || !(layout instanceof HTMLElement)) return;
  if (!(search instanceof HTMLElement) || !(boxes instanceof HTMLElement)) {
    bg.style.height = "0px";
    return;
  }
  const layoutBox = layout.getBoundingClientRect();
  const top = search.getBoundingClientRect().bottom - layoutBox.top;
  const height = boxes.getBoundingClientRect().top - search.getBoundingClientRect().bottom;
  bg.style.top = `${Math.max(0, Math.round(top))}px`;
  bg.style.height = `${Math.max(0, Math.round(height))}px`;
}

export default function HomePhoneGermanyBackground() {
  const { countryCode } = useMarket();
  const src = getGermanyPhoneBandBackground(countryCode);

  useLayoutEffect(() => {
    if (!src) return;
    const run = () => layoutGermanyBand();
    run();
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    void document.fonts?.ready.then(run);
    window.addEventListener("resize", run);
    const observer = new ResizeObserver(run);
    const layout = document.querySelector(".home-phone-layout");
    const search =
      document.querySelector(".home-phone-controls .buzzard-mobile-search-form") ??
      document.querySelector(".home-phone-controls .buzzard-mobile-search");
    const boxes = document.querySelector(".home-page-canonical .home-category-discovery");
    if (layout) observer.observe(layout);
    if (search) observer.observe(search);
    if (boxes) observer.observe(boxes);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", run);
      observer.disconnect();
    };
  }, [src]);

  if (!src) return null;
  return <div className="home-phone-germany-bg" aria-hidden="true" />;
}
