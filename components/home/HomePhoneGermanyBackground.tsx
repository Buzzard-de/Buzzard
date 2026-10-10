"use client";

import { useLayoutEffect } from "react";
import { getGermanyPhoneBandBackground } from "@/lib/backgrounds/languageBackgrounds";
import { useMarket } from "@/lib/market/context";

function layoutGermanyPanel() {
  const bg = document.querySelector(".home-phone-germany-bg");
  const layout = document.querySelector(".home-phone-layout");
  const search =
    document.querySelector(".home-phone-controls .buzzard-mobile-search-form") ??
    document.querySelector(".home-phone-controls .buzzard-mobile-search");
  const groups = [...document.querySelectorAll(".home-page-canonical .home-category-tile-group")];
  const first = groups[0];
  const second = groups[1] ?? groups[0];
  const rail = document.querySelector(".mobile-home-category-rail");
  if (!(bg instanceof HTMLElement) || !(layout instanceof HTMLElement)) return;
  if (!(search instanceof HTMLElement) || !(first instanceof Element)) {
    bg.style.height = "0px";
    return;
  }
  const layoutBox = layout.getBoundingClientRect();
  const searchBox = search.getBoundingClientRect();
  const firstBox = first.getBoundingClientRect();
  const secondBox = second.getBoundingClientRect();
  const railVisible = rail instanceof HTMLElement && window.getComputedStyle(rail).display !== "none";
  const left = railVisible ? rail.getBoundingClientRect().right : Math.min(firstBox.left, secondBox.left);
  const right = Math.max(firstBox.right, secondBox.right);
  const top = searchBox.bottom;
  const bottom = Math.min(firstBox.top, secondBox.top);
  bg.style.top = `${Math.round(top - layoutBox.top)}px`;
  bg.style.left = `${Math.round(left - layoutBox.left)}px`;
  bg.style.width = `${Math.max(0, Math.round(right - left))}px`;
  bg.style.height = `${Math.max(0, Math.round(bottom - top))}px`;
  bg.style.right = "auto";
}

export default function HomePhoneGermanyBackground() {
  const { countryCode } = useMarket();
  const src = getGermanyPhoneBandBackground(countryCode);

  useLayoutEffect(() => {
    if (!src) return;
    const run = () => layoutGermanyPanel();
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
    const rail = document.querySelector(".mobile-home-category-rail");
    if (layout) observer.observe(layout);
    if (search) observer.observe(search);
    if (boxes) observer.observe(boxes);
    if (rail) observer.observe(rail);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", run);
      observer.disconnect();
    };
  }, [src]);

  if (!src) return null;
  return <div className="home-phone-germany-bg" aria-hidden="true" />;
}
