import React, {useMemo, useState} from "react";

/**
 * Props:
 *   taxonomy = { nodes: [{ id, name, slug, children: [{id,name,slug,children:[]}]}] }
 *
 * This component is intentionally data-driven:
 * 48 main categories -> subcategories -> sub-subcategories.
 */
export default function BuzzardCategoryMainColumn({taxonomy}) {
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");

  const active = taxonomy.nodes.find(x => x.id === activeId);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return [];
    const out = [];
    for (const m of taxonomy.nodes) {
      for (const s of m.children) {
        for (const l of s.children) {
          if (`${m.name} ${s.name} ${l.name}`.toLocaleLowerCase("tr-TR").includes(q)) {
            out.push({m,s,l});
          }
        }
      }
    }
    return out.slice(0, 250);
  }, [taxonomy, query]);

  return (
    <section className="buzzard-category-main">
      <div className="buzzard-category-toolbar">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Produkte, Marken, Kategorien suchen..."
        />
        <button onClick={() => setActiveId(null)}>Alle Kategorien</button>
      </div>

      <div className="buzzard-category-layout">
        <aside className="buzzard-category-sidebar">
          <strong>48 HAUPTKATEGORIEN</strong>
          {taxonomy.nodes.map((m,i) => (
            <button
              key={m.id}
              className={activeId === m.id ? "active" : ""}
              onClick={() => setActiveId(m.id)}
            >
              {String(i+1).padStart(2,"0")}. {m.name}
            </button>
          ))}
        </aside>

        <div className="buzzard-category-content">
          {query ? (
            results.map(({m,s,l}) => (
              <article key={l.id}>
                <h3>{m.name}</h3>
                <a href={`/${l.slug}`}>{s.name} → {l.name}</a>
              </article>
            ))
          ) : (
            <>
              <h1>{active?.name || "Alle Kategorien"}</h1>
              <div className="buzzard-subgrid">
                {(active ? active.children : taxonomy.nodes.flatMap(m => m.children.slice(0,4))).map(s => (
                  <article key={s.id}>
                    <h2>{s.name}</h2>
                    {s.children.map(l => <a key={l.id} href={`/${l.slug}`}>{l.name}</a>)}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
