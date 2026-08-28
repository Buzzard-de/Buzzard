# i18n / UX Checkliste (P1-13)

**Stand:** 27. August 2026  
**Sprachen:** DE · EN · TR · AR (RTL)

---

## Bereits implementiert

| Feature | Ort |
|---------|-----|
| Language Selector | `components/LanguageSelector.tsx` |
| Browser-Erkennung | `lib/i18n/detect.ts` |
| Locale-Routing | `lib/i18n/routing.ts` |
| UI-Übersetzungen | `lib/i18n/locales/{de,en,tr,ar}.ts` |
| Produkt-Übersetzungen | `data/buzzard_product_translations.json` |
| RTL (Arabisch) | `lib/i18n/context.tsx` → `dir=rtl` |
| Kontaktformular i18n | `contactForm.*` Keys + `ContactForm.tsx` |

---

## API: Übersetzungs-Lücken

```bash
curl -s https://buzzard-api.onrender.com/api/p1/i18n/gaps | jq .
```

Zeigt Produkte ohne EN/TR/AR-Übersetzung.

---

## Manuelle UX-Checks

- [ ] Sprache wechseln: DE → EN → TR → AR auf Startseite
- [ ] Direktlink `/en/`, `/tr/`, `/ar/` funktioniert
- [ ] Kontaktformular: Fehlermeldungen in gewählter Sprache
- [ ] Mobile: Language Selector erreichbar
- [ ] Arabisch: Layout RTL korrekt
- [ ] Katalogmodus-Hinweis sichtbar (kein Checkout)

---

## Bewusst offen

- Vollständige Produkt-Übersetzungen für alle 15 Demo-Produkte
- Accessibility-Audit (WCAG) — Basis vorhanden (`aria-live`, Labels)
