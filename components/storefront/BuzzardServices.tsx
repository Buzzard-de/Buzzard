import CategoryIcon from "@/components/CategoryIcon";

const SERVICES = [
  {
    title: "Fachberatung",
    text: "Technische Fragen zu Kategorien, Passgenauigkeit und Auswahl.",
    icon: "phone",
  },
  {
    title: "Katalog & Suche",
    text: "Teile, Kategorien und Nummern zentral durchsuchen.",
    icon: "box",
  },
  {
    title: "Lieferung & Service",
    text: "Transparente Informationen zu Versand und Rückgabe.",
    icon: "truck",
  },
  {
    title: "Sichere Prozesse",
    text: "Konto, Warenkorb und Anfragen mit klaren Schutzregeln.",
    icon: "lock",
  },
] as const;

export default function BuzzardServices() {
  return (
    <section className="buzzard-services" aria-labelledby="buzzard-services-title">
      <h2 id="buzzard-services-title" className="buzzard-services-title">
        Buzzard Services
      </h2>
      <ul className="buzzard-services-grid">
        {SERVICES.map((item) => (
          <li key={item.title} className="buzzard-service-card">
            <CategoryIcon name={item.icon} size={28} />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
