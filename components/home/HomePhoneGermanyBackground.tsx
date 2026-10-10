"use client";

import { useLayoutEffect } from "react";
import { getGermanyPhoneBandBackground } from "@/lib/backgrounds/languageBackgrounds";
import { useMarket } from "@/lib/market/context";

function twoBoxBounds(first: Element, second: Element) {
  const a = first.getBoundingClientRect();
  const b = second.getBoundingClientRect();
  return {
    left: Math.min(a.left, b.left),
    width: Math.max(a.right, b.right) - Math.min(a.left, b.left),
    height: Math.max(a.height, b.height),
    top: Math.min(a.top, b.top),
  };
}

function layoutGermanyBand() {
  const bg = document.querySelector(".home-phone-germany-bg");
  const layout = document.querySelector(".home-phone-layout");
  const search =
    document.querySelector(".home-phone-controls .buzzard-mobile-search-form") ??
    document.querySelector(".home-phone-controls .buzzard-mobile-search");
  const groups = [...document.querySelectorAll(".home-page-canonical .home-category-tile-group")];
  const first = groups[0];
  const second = groups[1] ?? groups[0];
  if (!(bg instanceof HTMLElement) || !(layout instanceof HTMLElement)) return;
  if (!(search instanceof HTMLElement) || !(first instanceof Element)) {
    bg.style.height = "0px";
    return;
  }
  const layoutBox = layout.getBoundingClientRect();
  const searchBottom = search.getBoundingClientRect().bottom;
  const boxes = twoBoxBounds(first, second);
  const gap = boxes.top - searchBottom;
  const height = Math.max(0, Math.min(Math.round(boxes.height), Math.round(gap)));
  bg.style.top = `${Math.round(searchBottom - layoutBox.top)}px`;
  bg.style.left = `${Math.round(boxes.left - layoutBox.left)}px`;
  bg.style.width = `${Math.round(boxes.width)}px`;
  bg.style.height = `${height}px`;
  bg.style.right = "auto";
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
