# ADR: Order-Read Source of Truth (Pusat Phase C)

**Status:** Proposed — documentation only  
**Date:** 2026-09-26  
**Scope:** Read-path analysis for Voice / Pusat `GET_ORDER`  
**Out of scope:** Implementation, schema change, `orders.json` edits, `pusat.db`, second order persistence, routes, `PUSAT_RUNTIME_ENABLED=1`

---

## 1. Context (repo facts)

Four order stores exist in the same API process. They do **not** share a writer or a sync job in the files listed below.

| Store | Persistence | Primary writers (create) | Primary readers |
|---|---|---|---|
| JSON file | `server/data/orders.json` (path built in plugins as `server/data` relative to `server/`) | `server/plugins/ordersPlugin.js` `writeOrders()` on `POST /api/orders` guest/JSON checkout path | `ordersPlugin.js` `readOrders()`; `server/lib/aiChatService.js` `readOrders()` / `findOrder()` |
| SQLite `orders` | `buzzard.db` via `server/lib/db.js` (`CREATE TABLE orders` ~64–80) | `server/lib/dbOrders.js` `createOrderFromCart` → `INSERT INTO orders`; called from `databasePlugin.js` `POST /api/db/orders` and from `ordersPlugin.js` when `BUZZARD_DB_ENABLED !== "0"` and authenticated cart checkout | `databasePlugin.js` `listUserOrders`, `GET /api/db/orders/:orderNumber`, admin list/status |
| SQLite `oms_orders` | same `buzzard.db` | `server/lib/orderManagement.js` `createOrder` → `INSERT INTO oms_orders` | `getOrderByNumber`, `listCustomerOrders`, `listOrders` |
| SQLite `commerce_orders` | same `buzzard.db` | `server/lib/commerce/orderService.js` `createOrderFromCheckout` → `INSERT INTO commerce_orders` | `getOrder(orderId, ctx)` |

**Production persistence (blueprint):** `render.yaml` sets `BUZZARD_DB_PATH=/var/data/buzzard.db`, `BUZZARD_DB_ENABLED=1`, `BUZZARD_ORDER_MANAGEMENT=1`, **`BUZZARD_SALES_ENABLED=0`**. Commercial writes are gated by `salesMode` / `requireSalesEnabled` on checkout routes. That does **not** unify the four stores.

**No `pusat.db` in repository.** Pusat `GET_ORDER` is a read of Buzzard data only (`server/lib/pusatPolicyAdapter.js`).

---

## 2. Answers to the twelve questions

### 1) Welche Komponente schreibt Orders?

| Writer | File | Function / route | Target |
|---|---|---|---|
| JSON checkout | `server/plugins/ordersPlugin.js` | `POST /api/orders` → `writeOrders()` after `readOrders()` + push | `server/data/orders.json` |
| Authenticated cart (when DB enabled) | `server/lib/dbOrders.js` | `createOrderFromCart` / `createOrderFromCartWithPayment` | SQLite `orders` + `order_items` |
| DB plugin | `server/plugins/databasePlugin.js` | `POST /api/db/orders` → `createOrderFromCartWithPayment` | SQLite `orders` |
| OMS | `server/lib/orderManagement.js` | `createOrder` via `orderManagementPlugin.js` `/api/order-management/orders` | SQLite `oms_orders` |
| Commerce core | `server/lib/commerce/orderService.js` | `createOrderFromCheckout` via commerce plugin | SQLite `commerce_orders` |

`phoneAssistantService.js` and `aiChatService.js` **do not write** orders.  
`pusatPolicyAdapter.js` **does not write** orders.

### 2) Welche Komponente liest Orders?

| Reader | File | Function | Source |
|---|---|---|---|
| Chat / phone lookup | `server/lib/aiChatService.js` | `findOrder(orderNumber, email)` → `readOrders()` | `orders.json` |
| Phone assistant | `server/lib/phoneAssistantService.js` | `verifyOrderAccess` / `getVerifiedOrderStatus` | via `findOrder` → JSON |
| Pusat GET_ORDER | `server/lib/pusatPolicyAdapter.js` | `executeReadOnlyBuzzardAction("GET_ORDER")` | via `getVerifiedOrderStatus` → JSON |
| JSON checkout GET | `server/plugins/ordersPlugin.js` | `readOrders().find(...)` | JSON |
| Account / admin SQLite | `server/plugins/databasePlugin.js` | `listUserOrders`, `SELECT FROM orders` | SQLite `orders` |
| OMS | `server/lib/orderManagement.js` | `getOrderByNumber`, `listOrders` | SQLite `oms_orders` |
| Commerce | `server/lib/commerce/orderService.js` | `getOrder` | SQLite `commerce_orders` |

### 3) Welche Datenquelle ist aktuell tatsächlich Production Source of Truth?

**Es gibt keine einzige Order-SoT im Code.**

- **Persistente Production-Datenbank (Blueprint):** SQLite `BUZZARD_DB_PATH=/var/data/buzzard.db` (`render.yaml`). Innerhalb dieser Datei existieren **drei** Order-Tabellen: `orders`, `oms_orders`, `commerce_orders`.
- **Dokumentierte/API-OMS-Schicht (Plan + `orderManagement.js`):** `oms_orders` wenn `BUZZARD_ORDER_MANAGEMENT` und `BUZZARD_DB_ENABLED` aktiv.
- **Account-Checkout-Schicht:** Tabelle `orders` (`dbOrders.js` / `databasePlugin.js`).
- **Phone/Voice/Pusat-Read:** **nicht** diese Tabellen, sondern **`orders.json`**.

`PUSAT_CONSOLIDATION_PLAN.md` / Phase-C-Review behandeln `buzzard.db` als Commerce-Persistenz-SoT. Das gilt **nicht** für den bestehenden Phone-Read.

### 4) Welche Datenquelle verwendet der bestehende Phone-/Voice-Pfad?

**`server/data/orders.json`.**

Kette (unverändert, Production-API-Route):

`aiAutomationPlugin.js` `POST /api/ai/phone/verify-order` | `order-status`  
→ `phoneAssistantService.verifyOrderAccess` / `getVerifiedOrderStatus`  
→ `aiChatService.findOrder`  
→ `readOrders()` auf `path.join(__dirname, "..", "data", "orders.json")`.

`Buzzard/voice_server.py` ist **nicht** in `render.yaml` und nicht Teil dieses Pfads.

### 5) Welche Datenquelle verwendet Pusat `GET_ORDER`?

**Dieselbe JSON-Datei**, indirekt:

`pusatPolicyAdapter.js` `executeReadOnlyBuzzardAction`:

```javascript
if (action === "GET_ORDER") {
  return phoneAssistantService.getVerifiedOrderStatus({ orderNumber, email, postalCode, locale });
}
```

Kein SQLite-Zugriff in diesem Zweig. Bridge ist default **aus** (`PUSAT_RUNTIME_ENABLED !== "1"`); wenn jemals aktiviert, bleibt der Read-Pfad JSON.

### 6) Können `orders.json` und SQLite voneinander abweichen?

**Ja.** Repo-Beweis:

- Getrennte Writer: `writeOrders` vs `INSERT INTO orders` vs `INSERT INTO oms_orders` vs `INSERT INTO commerce_orders`.
- **Kein** Sync zwischen JSON und SQLite in den genannten Dateien.
- Unterschiedliche Schlüssel: JSON `orderNumber` + `customer.email`; SQLite `orders.order_number` + `user_id`; OMS `oms_orders.order_number` + `customer_email`.
- `POST /api/orders` in `ordersPlugin.js`: bei `BUZZARD_DB_ENABLED !== "0"` und **nicht** Guest (`lines` leer) + gültigem Token → **nur** `createOrderFromCartWithPayment` (SQLite `orders`), **kein** `writeOrders`. Guest-Pfad mit `lines` → **nur** JSON.
- Eine Order, die nur über OMS oder Commerce Core entsteht, erscheint **nicht** in `findOrder`.

### 7) Welche konkreten Risiken entstehen dadurch für Pusat Voice?

| Risiko | Mechanismus |
|---|---|
| False negative | Kunde nennt echte SQLite/`oms_orders`-Nummer; `findOrder` findet nichts → `ai.phone.orderNotFound` |
| False positive / stale | JSON-Demo- oder Legacy-Order existiert; SQLite-Status weicht ab; Voice nennt alten Status |
| Verifikation bricht | JSON erwartet `customer.email`; SQLite `orders` hat kein E-Mail-Feld, nur `user_id` |
| Dual-SoT-Verwirrung | Admin sieht SQLite; Voice sieht JSON |
| Sales=0 | `BUZZARD_SALES_ENABLED=0` blockiert neue Writes; vorhandene JSON- vs DB-Bestände bleiben entkoppelt |

### 8) Welche bestehende Buzzard-Funktion kann als Read-only Adapter für den SQLite-Order-Read verwendet werden?

**Bestehende, bereits exportierte Read-Funktionen (keine neue Persistenz):**

| Kandidat | Datei | Funktion | Tabelle | Hinweis |
|---|---|---|---|---|
| **Primär für „OMS-Pfad“** | `server/lib/orderManagement.js` | **`getOrderByNumber(orderNumber)`** | `oms_orders` (+ items/events) | Read-only; kein Schema-Change. **Keine** E-Mail/PLZ-Prüfung in der Funktion. |
| Account-SQLite | `server/plugins/databasePlugin.js` (inline SQL) | `SELECT … FROM orders WHERE order_number = ? AND user_id = ?` | `orders` | Auth über `user_id`, nicht E-Mail. |
| Commerce | `server/lib/commerce/orderService.js` | **`getOrder(orderId, ctx)`** | `commerce_orders` | Lookup per **id**, nicht `orderNumber`; Access-Guard vorhanden. |

Es gibt **keine** vorhandene Funktion, die JSON + alle drei SQLite-Tabellen vereinigt.  
Für Option B (Ziel: SQLite-OMS) ist **`orderManagement.getOrderByNumber`** die einzige benannte, wiederverwendbare OMS-Read-API. Ein späterer Adapter müsste **zusätzlich** Verifikation (E-Mail/PLZ) **außerhalb** dieser Funktion implementieren — ohne neue Tabelle, z. B. Vergleich gegen `oms_orders.customer_email` und `shipping_address_json`.

### 9) Welche Lösung erfordert KEINE neue Datenbank?

**A und B.** Beide lesen bestehende Datei bzw. bestehendes `buzzard.db`. Kein `pusat.db`.

### 10) Welche Lösung erfordert KEINE Migration?

**A:** keine.  
**B:** keine Schema-Migration, wenn nur `getOrderByNumber` (und ggf. vorhandene Spalten `customer_email`, `shipping_address_json`) genutzt werden. **Keine** neue `idempotency`-Spalte, keine neue Order-Tabelle.

### 11) Welche Lösung verändert den bestehenden Production-Voice-Pfad am wenigsten?

**A.** `POST /api/ai/phone/*` bleibt `phoneAssistantService` → JSON. Pusat `GET_ORDER` bleibt derselbe Call.

**B** ändert **nicht** zwingend die Phone-Route, wenn nur `pusatPolicyAdapter.executeReadOnlyBuzzardAction` umgestellt wird. `aiAutomationPlugin` kann JSON behalten. Das ist die **kleinste** Voice-Produktionsänderung unter Ziel-B: **nur** Pusat-Adapter, Phone-Route unangetastet.

Größere Änderung: Phone **und** Pusat auf SQLite — **nicht** nötig für B-Minimum.

### 12) Welche Lösung ist für eine spätere Pusat Voice Integration architektonisch geeignet?

**B.** Voice-Intents sollen irgendwann echte OMS-Daten sehen. A zementiert JSON als AI-Read-SoT und widerspricht `buzzard.db` / `orderManagement`.

Empfohlene Staffelung: **A als Interim** (kein Prod-Voice-Umbau), **B als Target** (Read-only Adapter auf `getOrderByNumber`, Phone-Route optional später).

---

## 3. Option A — Interim (GET_ORDER bleibt Phone/JSON)

Pusat `GET_ORDER` bleibt `phoneAssistantService.getVerifiedOrderStatus` → `aiChatService.findOrder` → `orders.json`.

| | |
|---|---|
| **Vorteile** | Kein Code nötig; Production-Voice unverändert; Verifikation (E-Mail + optionale PLZ) bereits implementiert; kein Flag, keine Route |
| **Nachteile** | Liest nicht `orders` / `oms_orders` / `commerce_orders`; SoT-Widerspruch zu Blueprint-SQLite |
| **Risiken** | False negative/positive (Abschnitt 7); Phase-C-Voice darf SQLite-SoT nicht behaupten |
| **Betroffene Dateien** | Keine (Status quo): `pusatPolicyAdapter.js`, `phoneAssistantService.js`, `aiChatService.js`, `ordersPlugin.js` |
| **Abhängigkeiten** | Inhalt von `orders.json`; Sales-Gate für neue JSON-Writes |
| **Phase C** | Facade/Approvals/Tasks können starten; `GET_ORDER` dokumentiert als JSON-Interim |

## 4. Option B — Ziel (Read-only Adapter auf SQLite-OMS)

Pusat `GET_ORDER` ruft **später** (nicht in diesem ADR) einen Read-only Wrapper auf `orderManagement.getOrderByNumber`, plus Verifikation gegen `customer_email` / Adresse. Writes unverändert. Keine neue DB, keine Migration.

| | |
|---|---|
| **Vorteile** | Aligniert mit `buzzard.db` OMS; wiederverwendet existierende Funktion; kein `pusat.db`; Phone-Route kann unverändert JSON bleiben |
| **Nachteile** | `getOrderByNumber` allein reicht nicht für Voice-Auth; `orders` vs `oms_orders` vs `commerce_orders` bleiben parallel — Adapter muss **eine** Tabelle wählen (`oms_orders` laut OMS-Modul) |
| **Risiken** | Order nur in `orders` oder JSON, nicht in `oms_orders` → weiterhin not found; Verifikationslogik falsch gebaut = PII-Leak — muss gleiche Fail-closed-Checks wie Phone nutzen |
| **Betroffene Dateien (zukünftig, nicht jetzt)** | `server/lib/pusatPolicyAdapter.js` (Read-Zweig); optional neues **dünnes** Lib-Modul, das nur `orderManagement` liest; **nicht** `orders.json`; **nicht** `db.js` Schema |
| **Abhängigkeiten** | `BUZZARD_ORDER_MANAGEMENT` / `BUZZARD_DB_ENABLED`; `orderManagement.isEnabled()` |
| **Phase C** | Implementierung des Adapters ist Phase-C-fähig **nach** diesem ADR, Flag aus, Phone-Pfad unberührt |

---

## 5. Entscheidung (dieses ADR)

| Frage | Entscheidung |
|---|---|
| Interim Phase C (keine Voice-Prod-Änderung) | **A** |
| Architektonisches Ziel für Pusat `GET_ORDER` | **B** (`getOrderByNumber` / `oms_orders`) |
| Neue Datenbank | Nein |
| Migration | Nein |
| `orders.json` ändern | Nein |
| Production-Voice-Route ändern | Nein (auch bei B-Minimum) |
| `PUSAT_RUNTIME_ENABLED` | Bleibt aus |

**Single recommended target label (Zielarchitektur):** **B**  
**Interim operational posture:** **A** until B adapter exists and is flag-gated.

---

## 6. Nicht tun

- Keine `pusat.db`
- Keine zweite Order-Datenbank
- Keine neue Order-Persistenz
- Keine Änderungen an `orders.json`
- Keine Änderungen am SQLite-Schema
- Kein Vereinigen der drei SQLite-Order-Tabellen in diesem ADR
- Phone-Production-Pfad nicht umbauen, um B zu „erzwingen“

---

ORDER READ SOT:  
SPLIT — Phone/Pusat-GET_ORDER = `server/data/orders.json` via `aiChatService.findOrder`; persistente API-OMS = SQLite `oms_orders` (`orderManagement.getOrderByNumber`); Account-Checkout = SQLite `orders` (`dbOrders` / `databasePlugin`); Commerce Core = `commerce_orders`. Keine einzige vereinigte SoT im Code.

VOICE PRODUCTION BLOCKED:  
NEIN

RECOMMENDED TARGET:  
B

REQUIRES MIGRATION:  
NEIN

REQUIRES NEW DATABASE:  
NEIN

NO CODE CHANGES MADE  
NO DATABASE CHANGES MADE  
NO DEPLOYMENT MADE  
NO PRODUCTION ACTIVATION MADE
