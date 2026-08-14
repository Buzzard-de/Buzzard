import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import requests

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_ai_gateway_v21.db"

DEFAULT_AGENTS = [
    (
        "Market Intelligence",
        "Marktforschung",
        "Sammle belegte Marktsignale aus offenen Quellen. Erfinde keine Verkaufsdaten.",
    ),
    (
        "Category Intelligence",
        "Kategorie-Entdeckung",
        "Untersuche Kategoriebäume und Produktchancen mit Quellenangaben.",
    ),
    (
        "Competitor Intelligence",
        "Wettbewerbs-Intelligence",
        "Nutze nur legale und öffentlich zugängliche Wettbewerbsinformationen.",
    ),
    (
        "Supplier Intelligence",
        "Lieferantenforschung",
        "Prüfe Lieferantenvertrauen und Integrationsfähigkeit mit verifizierbaren Quellen.",
    ),
    (
        "Authenticity & Trust",
        "Authentizität",
        "Identifiziere Nachweis- und Verifizierungsbedarf für Produkt-/Markenauthentizität.",
    ),
    (
        "Profitability",
        "Rentabilität",
        "Analysiere Nettogewinn und Marge mathematisch auf Basis gegebener Kosten.",
    ),
    (
        "Risk & Compliance",
        "Risiko und Compliance",
        "Identifiziere Risikosignale; keine rechtlichen Urteile erfinden.",
    ),
    (
        "Council Manager",
        "Council-Manager",
        "Vergleiche Expertenmeinungen, zeige Widersprüche; keine automatische Endentscheidung.",
    ),
]


class AIGateway:
    def __init__(self, path=None):
        self.path = Path(path or DB_PATH)

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def init(self):
        with self.connect() as con:
            con.executescript(
                """
                CREATE TABLE IF NOT EXISTS providers(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    base_url TEXT NOT NULL,
                    model TEXT NOT NULL,
                    api_key_env TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agent_profiles(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    role TEXT NOT NULL,
                    system_instruction TEXT NOT NULL,
                    preferred_provider TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS runs(
                    id INTEGER PRIMARY KEY,
                    agent TEXT NOT NULL,
                    provider TEXT,
                    model TEXT,
                    prompt TEXT NOT NULL,
                    response TEXT,
                    status TEXT NOT NULL,
                    error TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

            now = self.now()
            for name, role, instruction in DEFAULT_AGENTS:
                con.execute(
                    """
                    INSERT OR IGNORE INTO agent_profiles
                    (name,role,system_instruction,created_at)
                    VALUES(?,?,?,?)
                    """,
                    (name, role, instruction, now),
                )

    def add_provider(self, name, base_url, model, api_key_env):
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO providers
                (name,base_url,model,api_key_env,created_at)
                VALUES(?,?,?,?,?)
                """,
                (name, base_url, model, api_key_env, self.now()),
            )
        return f"AI-Provider gespeichert: {name}"

    def providers(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT name,base_url,model,api_key_env,enabled
                FROM providers ORDER BY name
                """
            ).fetchall()

        if not rows:
            return "Noch kein AI-Provider konfiguriert."

        out = ["=== BUZZARD AI PROVIDERS ==="]
        for row in rows:
            out.append(
                f"- {row['name']} | Modell={row['model']} | "
                f"key_env={row['api_key_env']} | aktiv={bool(row['enabled'])}"
            )
        return "\n".join(out)

    def call_provider(self, provider_name, system_prompt, user_prompt):
        with self.connect() as con:
            provider = con.execute(
                """
                SELECT * FROM providers
                WHERE name=? AND enabled=1
                """,
                (provider_name,),
            ).fetchone()

        if not provider:
            raise RuntimeError("Aktiver Provider nicht gefunden.")

        api_key = os.getenv(provider["api_key_env"])
        if not api_key:
            raise RuntimeError(
                f"API-Schlüssel fehlt in Umgebungsvariable: {provider['api_key_env']}"
            )

        payload = {
            "model": provider["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        response = requests.post(
            provider["base_url"],
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=45,
        )
        response.raise_for_status()
        return response.json()

    def demo(self):
        self.add_provider(
            "example-provider",
            "https://api.example.com/v1/chat/completions",
            "example-model",
            "BUZZARD_AI_API_KEY",
        )
        return (
            "Gateway-Demo-Provider gespeichert. "
            "Für echte Aufrufe ist ein Adapter gemäß offizieller Provider-API erforderlich."
        )

    def agent_profiles(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT name,role,preferred_provider
                FROM agent_profiles
                ORDER BY name
                """
            ).fetchall()

        out = ["=== BUZZARD AI AGENT PROFILES ==="]
        for row in rows:
            out.append(
                f"- {row['name']} | Rolle={row['role']} | "
                f"Provider={row['preferred_provider'] or '-'}"
            )
        return "\n".join(out)
