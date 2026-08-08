import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="home-hero" aria-label="Empfehlung">
      <div className="home-hero-content">
        <p className="home-hero-kicker">QUALITÄT. LEISTUNG. VERTRAUEN.</p>
        <h2 className="home-hero-title">Entdecken Sie unser Sortiment</h2>
        <p className="home-hero-text">
          Über 1.000.000 Produkte – schnell geliefert, fair bepreist, sicher bestellt.
        </p>
        <Link href="/products/" className="home-hero-btn">
          Jetzt entdecken
        </Link>
      </div>
    </section>
  );
}
