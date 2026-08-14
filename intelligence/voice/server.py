#!/usr/bin/env python3
"""
Buzzard Intelligence v11 — Voice Interface server.

Local Flask UI for speech input/output. Routes simple commands to the
existing intelligence stack (v9 reporting, v10 council).
"""

from pathlib import Path
import sys

INTELLIGENCE_ROOT = Path(__file__).resolve().parent.parent
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))

from flask import Flask, jsonify, request, send_from_directory

from buzzard_intelligence import CategoryDiscovery, Council, MemoryEngine, Reporter

VOICE_DIR = Path(__file__).resolve().parent
WEB_DIR = VOICE_DIR / "web"

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")


def _services():
    memory = MemoryEngine()
    discovery = CategoryDiscovery()
    reporter = Reporter(memory, discovery)
    council = Council()
    memory.init()
    discovery.init()
    reporter.init()
    council.init()
    return reporter, council


def _reply_for_message(text, language):
    lowered = text.casefold()
    reporter, council = _services()

    if any(word in lowered for word in ("warnung", "alert", "alarm")):
        body = reporter.alerts()
        return body.split("\n")[0] if body else "Keine aktiven Warnungen."

    if any(word in lowered for word in ("bericht", "report", "übersicht", "status")):
        lines = reporter.report().split("\n")
        return "\n".join(lines[:12])

    if any(word in lowered for word in ("posteingang", "inbox", "review", "council")):
        lines = council.inbox().split("\n")
        return "\n".join(lines[:8])

    if any(word in lowered for word in ("hilfe", "help", "befehl", "command")):
        if language.startswith("de"):
            return (
                "Verfügbare Sprachbefehle: Bericht, Warnungen, Posteingang, Hilfe. "
                "Beispiel: Sage 'Zeige den Bericht' oder 'Warnungen'."
            )
        return (
            "Available voice commands: report, alerts, inbox, help. "
            "Example: say 'Show report' or 'Alerts'."
        )

    if language.startswith("de"):
        return (
            f"Nachricht empfangen: {text}. "
            "Sage 'Bericht', 'Warnungen' oder 'Posteingang' für Intelligence-Ausgaben."
        )
    return (
        f"Message received: {text}. "
        "Say 'report', 'alerts', or 'inbox' for intelligence outputs."
    )


@app.get("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "Buzzard Intelligence v11 Voice",
            "stack": "v1-v10",
        }
    )


@app.post("/api/message")
def message():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    language = data.get("language", "de-DE")
    if not text:
        return jsonify({"ok": False, "error": "Leere Nachricht"}), 400

    reply = _reply_for_message(text, language)
    return jsonify({"ok": True, "language": language, "text": text, "reply": reply})


def main(host="127.0.0.1", port=8787):
    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    main()
