import Link from "next/link";
import { brands } from "@/lib/categories";

interface BrandsStripProps {
  variant?: "mega" | "promo";
}

export default function BrandsStrip({ variant = "mega" }: BrandsStripProps) {
  return (
    <section
      className={`brands-strip brands-strip--${variant}`}
      aria-label="Top Marken"
    >
      <h3 className="brands-strip-title">TOP MARKEN</h3>
      <ul className="brands-strip-list">
        {brands.map((brand) => (
          <li key={brand.name}>
            <Link
              href={`/products/?q=${encodeURIComponent(brand.name)}`}
              className={`brand-pill ${brand.className}`}
            >
              <span className="brand-pill-name">{brand.name}</span>
              {brand.sub && <span className="brand-pill-sub">{brand.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
