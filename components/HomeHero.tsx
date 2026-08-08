import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="home-hero" aria-label="Hero">
      <div className="home-hero-content">
        <p className="home-hero-kicker">QUALITY. PERFORMANCE. TRUST.</p>
        <h2 className="home-hero-title">Alles für Ihr Auto</h2>
        <p className="home-hero-text">
          Über 1.000.000 Teile – passend, schnell geliefert, fair bepreist.
        </p>
        <Link href="/products/" className="home-hero-btn">
          Jetzt entdecken
        </Link>
      </div>
      <div className="home-hero-visual" aria-hidden="true">
        <svg viewBox="0 0 320 140" fill="none" width="100%" height="100%">
          <rect x="20" y="70" width="280" height="40" rx="12" fill="#1a1a1a" stroke="#c9a066" strokeWidth="2" />
          <path d="M60 110 Q90 60 130 70 L190 70 Q230 60 260 110" stroke="#c9a066" strokeWidth="3" fill="none" />
          <circle cx="90" cy="110" r="18" fill="#111" stroke="#c9a066" strokeWidth="3" />
          <circle cx="230" cy="110" r="18" fill="#111" stroke="#c9a066" strokeWidth="3" />
          <rect x="145" y="78" width="50" height="24" rx="4" fill="#c9a066" opacity="0.25" />
        </svg>
      </div>
    </section>
  );
}
