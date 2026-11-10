export type MachineryHubDomain = "automotive" | "agricultural" | "construction";

export function resolveMachineryHubDomain(categoryId: string): MachineryHubDomain | null {
  const id = String(categoryId || "").trim().toLowerCase();
  if (id.startsWith("cat-20")) return "agricultural";
  if (id.startsWith("cat-55")) return "construction";
  if (id.startsWith("cat-05") || id.startsWith("cat-54")) return "automotive";
  return null;
}

export function machineryHubCopy(domain: MachineryHubDomain) {
  if (domain === "agricultural") {
    return {
      title: "Landmaschinen-Suche",
      hint: "Nur Landwirtschaft. Kfz- und Baumaschinen-Regeln werden nicht gemischt.",
      moreHref: "/landmaschinen-suche/",
      moreLabel: "Vollständige Suche",
      categoryId: "cat-20",
    };
  }
  if (domain === "construction") {
    return {
      title: "Baumaschinen-Suche",
      hint: "Nur Baumaschinen. Landtechnik- und Kfz-Regeln werden nicht gemischt.",
      moreHref: "/baumaschinen-suche/",
      moreLabel: "Vollständige Suche",
      categoryId: "cat-55",
    };
  }
  return {
    title: "Fahrzeugteile-Suche",
    hint: "Nur Fahrzeugteile. Land- und Baumaschinen werden hier nicht bewertet.",
    moreHref: "/fahrzeugteile-suche/",
    moreLabel: "Vollständige Suche",
    categoryId: "cat-05",
  };
}
