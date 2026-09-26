import CategoryIcon from "@/components/CategoryIcon";

const USP_ITEMS = [
  { label: "Schneller Versand", icon: "truck" },
  { label: "30 Tage Rückgabe", icon: "return" },
  { label: "Sichere Zahlung", icon: "shield" },
  { label: "Top Qualität", icon: "star" },
  { label: "Kundenservice", icon: "phone" },
] as const;

export default function USPBar() {
  return (
    <section className="usp-bar" aria-label="Servicevorteile">
      <ul className="usp-bar-list">
        {USP_ITEMS.map((item) => (
          <li key={item.label} className="usp-item">
            <CategoryIcon name={item.icon} size={22} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
