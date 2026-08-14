# Buzzard Intelligence v1–v12

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1–v10 | … | siehe vorherige Abschnitte |
| v11 | `voice/` | kein eigener DB-Speicher (UI-Schicht) |
| v12 | `shared_memory.py` | `buzzard_shared_memory_v12.db` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## v12 Shared Memory — neu

Langfristige gemeinsame Wissensbasis — unabhängig von v2 Produkt-Memory und v11 Voice.

| Feature | Beschreibung |
|---------|--------------|
| Typen | DECISION, TASK, PREFERENCE, CONVERSATION, ENTITY, … |
| Status | ACTIVE, VERIFIED, DISPUTED, ARCHIVED, REJECTED |
| Tags & Links | Etiketten und Verknüpfungen zwischen Einträgen |
| Audit | Änderungsverlauf pro Eintrag |

### CLI

```bash
cd intelligence
python main.py init-v12
python main.py remember --type DECISION --text "Buzzard fokussiert zuerst auf Deutschland und EU." --source user
python main.py recall --query "Deutschland"
python main.py shared-timeline
python main.py memory-status --id 1 --status VERIFIED
```

**Hinweis:** v2 `memory <query>` durchsucht Produkt-/Marktbeobachtungen; v12 `recall` durchsucht Shared Memory.

## v11 Voice Interface

Lokale Sprach-Oberfläche mit Flask + Browser Speech API.

| Feature | Beschreibung |
|---------|--------------|
| Spracheingabe | Browser Speech Recognition (DE/TR) |
| Sprachausgabe | Speech Synthesis |
| REST | `POST /api/message`, `GET /api/health` |
| Backend | Routet zu v9 `Reporter` und v10 `Council` |

### Start

```bash
cd intelligence
pip install -r requirements.txt
python main.py voice
```

Öffne: http://127.0.0.1:8787

### Sprachbefehle (Beispiele)

- „Bericht“ / „Status“ → Management-Report (Auszug)
- „Warnungen“ / „Alerts“ → aktive v9-Warnungen
- „Posteingang“ / „Inbox“ → v10 Review-Posteingang
- „Hilfe“ → verfügbare Befehle

### Wichtig

- Kein eigenes Sprach-KI-Modell
- Keine persistente Konversationshistorie in v11
- Produktion: externer STT/TTS-Provider über Backend empfohlen
- Browser-Support für Speech Recognition variiert

## v10–v1

Council, Reporting, Discovery, … — unverändert nutzbar.

## Grenzen

- Keine Shop-/Katalog-Änderungen
- Voice-Server nur lokal (`127.0.0.1:8787`)

## Dateien

```
intelligence/
├── buzzard_intelligence/
│   └── shared_memory.py
├── voice/
│   ├── server.py
│   └── web/index.html
└── archive/
    ├── Buzzard_Intelligence_v11_Voice_Interface.zip
    └── Buzzard_Intelligence_v12_Shared_Memory.zip
```
