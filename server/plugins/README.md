# Buzzard API Plugins

Dieser Ordner enthält Plugins für die lokale Buzzard API.

## Struktur

- `plugins/` enthält einzelne Plugin-Module.
- Jedes Plugin exportiert eine `register(app)` Funktion.

## Beispiel

```js
module.exports = {
  register(app) {
    app.get('/api/hello', (req, res) => {
      res.json({ message: 'Hello from plugin' });
    });
  }
};
```

## Kontakt-Speicher-Plugin

Das Projekt enthält jetzt ein Plugin, das Kontaktanfragen speichert:

- `POST /api/contact` speichert alle Anfragen in `server/data/submissions.json`
- `GET /api/submissions` gibt alle gespeicherten Anfragen zurück

## Product Data Plugin

Das Projekt enthält jetzt ein Produktdaten-Plugin mit folgenden Endpunkten:

- `GET /api/plugin/products` — listet alle Produkte
- `GET /api/plugin/products/:id` — zeigt Details zu einem Produkt

## Plugin hinzufügen

Neue Plugins kannst du so anlegen:

1. Erstelle eine Datei in `server/plugins/`, z. B. `myPlugin.js`
2. Exportiere die `register(app)` Funktion:

```js
module.exports = {
  register(app) {
    app.get('/api/plugin/example', (req, res) => {
      res.json({ message: 'Example plugin response' });
    });
  }
};
```

3. Starte den Server neu. Das Plugin wird automatisch geladen.
