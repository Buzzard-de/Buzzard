from pathlib import Path

GESAMT_DIR = Path(__file__).resolve().parent


def gesamt_status():
    roadmap = GESAMT_DIR / "docs" / "STATUS_AND_ROADMAP.md"
    lines = [
        "=== BUZZARD AI GESAMT — STATUS ===",
        "",
        "Implementiert im Stack:",
        "- Doğu Bey (v29): verify.py → verify-*, dogubey-*",
        "- Aslan Bey (v1): aslan.py → aslan-*",
        "- Esat Bey: Platzhalter (noch nicht implementiert)",
        "",
        "Zielstruktur-Platzhalter: api, config, core, database, memory,",
        "research, security, sources, tasks, tests, …",
        "",
    ]
    if roadmap.exists():
        lines.append(roadmap.read_text(encoding="utf-8"))
    else:
        lines.append("Roadmap-Dokument nicht gefunden.")
    return "\n".join(lines)
