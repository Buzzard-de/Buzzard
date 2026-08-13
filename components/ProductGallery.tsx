"use client";

import { useState } from "react";
import ProductSvg from "./ProductSvg";

interface ProductGalleryProps {
  images: string[];
  imageKey?: string;
  name: string;
}

export default function ProductGallery({ images, imageKey, name }: ProductGalleryProps) {
  const slides = images.length > 0 ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  if (slides.length === 0) {
    return (
      <div className="product-gallery">
        <div className="product-gallery-main">
          <ProductSvg imageKey={imageKey ?? "oel"} />
        </div>
      </div>
    );
  }

  return (
    <div className="product-gallery">
      <button
        type="button"
        className="product-gallery-main"
        aria-label={`${name} vergrößern`}
        onClick={() => setZoomOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slides[activeIndex]} alt={name} loading="lazy" />
      </button>
      {slides.length > 1 && (
        <div className="product-gallery-thumbs" role="tablist" aria-label="Produktbilder">
          {slides.map((src, index) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={`product-gallery-thumb${index === activeIndex ? " active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
      {zoomOpen && (
        <div className="product-gallery-zoom" role="dialog" aria-modal="true" aria-label="Produktbild">
          <button type="button" className="product-gallery-zoom-close" onClick={() => setZoomOpen(false)}>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slides[activeIndex]} alt={name} />
        </div>
      )}
    </div>
  );
}
