import CategoryIcon from "./CategoryIcon";
import { trustBadges } from "@/lib/categories";

export default function ServiceBar() {
  return (
    <section className="service-bar" aria-label="Service-Informationen">
      <div className="service-trust-row" aria-label="Vorteile">
        {trustBadges.map((badge) => (
          <div key={badge.label} className="service-trust-item">
            <CategoryIcon name={badge.icon} size={20} />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
      <div className="service-bar-inner">
        <div className="service-item">
          <CategoryIcon name="phone" size={28} />
          <div>
            <strong>KUNDENSERVICE</strong>
            <span>+49 30 0000000</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="mail" size={28} />
          <div>
            <strong>E-MAIL SUPPORT</strong>
            <span>info@buzzard.com</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="return" size={28} />
          <div>
            <strong>30 TAGE RÜCKGABERECHT</strong>
            <span>Zufrieden oder Geld zurück</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="lock" size={28} />
          <div>
            <strong>SICHER EINKAUFEN</strong>
            <span>Ihre Daten sind geschützt</span>
          </div>
        </div>
      </div>
    </section>
  );
}
