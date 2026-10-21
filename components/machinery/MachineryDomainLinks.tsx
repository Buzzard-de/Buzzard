import Link from "next/link";

export default function MachineryDomainLinks({ current }: { current: "vehicle" | "agricultural" | "construction" }) {
  const links = [
    { id: "vehicle", href: "/fahrzeugteile-suche/", label: "Fahrzeugteile" },
    { id: "agricultural", href: "/landmaschinen-suche/", label: "Landmaschinen" },
    { id: "construction", href: "/baumaschinen-suche/", label: "Baumaschinen" },
  ] as const;

  return (
    <p>
      Getrennte Suchen:{" "}
      {links.map((link, index) => (
        <span key={link.id}>
          {index > 0 ? " · " : null}
          {link.id === current ? <strong>{link.label}</strong> : <Link href={link.href}>{link.label}</Link>}
        </span>
      ))}
      . Regeln werden nicht gemischt.
    </p>
  );
}
