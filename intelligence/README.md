# Buzzard Intelligence v1–v11

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v10 | … | Memory → Council |
| v11 | `voice/` | Sprach-UI (Browser Speech API + Flask) |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py voice
```

Browser: http://127.0.0.1:8787

## v11 Voice Interface

- Deutsch / Türkisch (Browser Speech Recognition)
- Sprachausgabe via Speech Synthesis
- Befehle: **Bericht**, **Warnungen**, **Posteingang**, **Hilfe**
- Anbindung an v9 Reporting und v10 Council

```bash
python main.py voice --host 127.0.0.1 --port 8787
```

Kein eigenes KI-Modell — nutzt den lokalen Intelligence-Stack.

Archive: `archive/Buzzard_Intelligence_v11_Voice_Interface.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
