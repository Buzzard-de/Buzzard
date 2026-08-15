# Doğu Bey — Standalone (tek klasör)

Eigenständiges **Buzzard Intelligence v29** Paket: Official Source Verification (Doğu Bey).

Dieses ZIP ist die portable Ein-Ordner-Version. Im Buzzard Intelligence Stack ist dieselbe Logik bereits in `buzzard_intelligence/verify.py` integriert.

## Standalone (aus Archiv)

Identische Inhalte in:
- `archive/Buzzard_AI_DoguBey_tek_klasor.zip` (Ordner `Buzzard_AI/`)
- `archive/Buzzard_AI_komplett.zip` (Ordner `Buzzard_AI_komplett/`)

```bash
unzip Buzzard_AI_komplett.zip
cd Buzzard_AI_komplett   # oder: cd Buzzard_AI bei tek_klasor
python main.py init
python main.py demo
python main.py report
python main.py claim --entity "..." --text "..."
python main.py source --claim-id 1 --type OFFICIAL_MANUFACTURER --url "..." --publisher "..."
python main.py verify --claim-id 1 --status VERIFIED --note "..."
```

DB: `buzzard_official_verification_v29.db` (relativ zum Arbeitsverzeichnis)

## Integrierte CLI (intelligence/)

| Standalone | Stack |
|------------|-------|
| `init` | `dogubey-init` oder `init-v29` (+ Aslan Bey Tabellen) |
| `demo` | `dogubey-demo` / `verify-demo` |
| `report` | `dogubey-report` / `verify-report` |
| `claim` | `dogubey-claim` / `verify-claim` |
| `source` | `dogubey-source` / `verify-source` |
| `verify` | `dogubey-verify` / `verify-set` |

```bash
cd intelligence
python main.py dogubey-init
python main.py dogubey-demo
python main.py dogubey-report
```

## Abgrenzung

- **Doğu Bey** (`verify.py`, `dogubey-*`, `verify-*`) = v29 Verifikation
- **Aslan Bey** (`aslan.py`, `aslan-*`) = Müsteşar-Koordination (separates Paket)

Archive: `archive/Buzzard_AI_DoguBey_tek_klasor.zip`, `archive/Buzzard_AI_komplett.zip`

Siehe auch: `dogubey_aslan/README.md`
