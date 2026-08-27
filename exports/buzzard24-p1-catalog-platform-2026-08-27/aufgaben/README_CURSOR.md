# BUZZARD24 – CURSOR ARBEITSPAKET
Stand: 27.08.2026

ZIEL
Buzzard24 bis zum geplanten Go-Live technisch fertig machen, ABER Verkauf/Checkout und echte Produktbilder ausdrücklich NICHT aktivieren.

SICHERE GRENZEN
- SALES_ENABLED bleibt false.
- Checkout/Payment nicht aktivieren.
- Stripe/PayPal/SMTP nicht aktivieren.
- Keine echten Produktbilder importieren oder erzwingen.
- Placeholderbilder bleiben erlaubt.
- Keine Commerce-Secrets für die AI-Core-Phase 3 hinterlegen.

QUELLE
Buzzard24-Komplettbericht vom 27.08.2026. Aktuell: Website/API live, 53 Hauptkategorien, 26 Demo-Produkte, Admin-Passwort offen, PR #238 offen, Orchestrator im PR, Verkauf bewusst deaktiviert, echte Produktbilder bewusst offen.

PRIORITÄT
P0 sofort, P1 vor Produktionsreife, P2 später/optional.

REGEL
Bestehende Funktionalität nicht unnötig umbauen. Kleine überprüfbare Änderungen, Tests nach jeder Änderung, keine Secrets committen.
