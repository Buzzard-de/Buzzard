import CategoryIcon from "./CategoryIcon";
import { isSalesEnabled } from "@/lib/shop/mode";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from "@/lib/site/contact";

const catalogBadges = [
  { label: "GROSSE KATEGORIEAUSWAHL", icon: "star" },
  { label: "PRODUKTINFORMATIONEN", icon: "box" },
  { label: "SUPPORT ERREICHBAR", icon: "phone" },
  { label: "KONTAKT & BERATUNG", icon: "shield" },
] as const;

const salesBadges = [
  { label: "TOP MARKEN", icon: "star" },
  { label: "SCHNELLE LIEFERUNG", icon: "truck" },
  { label: "KOSTENLOSER VERSAND", icon: "box" },
  { label: "SICHERE ZAHLUNG", icon: "shield" },
] as const;

export default function ServiceBar() {
  const badges = isSalesEnabled() ? salesBadges : catalogBadges;

  return (
    <section className="service-bar" aria-label="Service-Informationen">
      <div className="service-trust-row" aria-label="Vorteile">
        {badges.map((badge) => (
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
            <span>{CONTACT_PHONE_DISPLAY}</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="mail" size={28} />
          <div>
            <strong>E-MAIL</strong>
            <span>{CONTACT_EMAIL}</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="return" size={28} />
          <div>
            <strong>HILFE & FAQ</strong>
            <span>/hilfe/</span>
          </div>
        </div>
        <div className="service-item">
          <CategoryIcon name="lock" size={28} />
          <div>
            <strong>DATENSCHUTZ</strong>
            <span>DSGVO-konform</span>
          </div>
        </div>
      </div>
    </section>
  );
}
