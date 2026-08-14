import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_market_v17.db"


class MarketEngine:
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
                CREATE TABLE IF NOT EXISTS markets(
                    id INTEGER PRIMARY KEY,
                    country_code TEXT NOT NULL,
                    market_name TEXT NOT NULL,
                    demand REAL,
                    competition REAL,
                    logistics REAL,
                    risk REAL,
                    data_completeness REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(country_code,market_name)
                );

                CREATE TABLE IF NOT EXISTS opportunities(
                    id INTEGER PRIMARY KEY,
                    country_code TEXT NOT NULL,
                    category TEXT NOT NULL,
                    product TEXT NOT NULL,
                    demand REAL,
                    competition REAL,
                    margin REAL,
                    logistics REAL,
                    risk REAL,
                    score REAL,
                    data_completeness REAL NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def completeness(self, values):
        return round(sum(value is not None for value in values) / len(values) * 100, 1)

    def add_market(self, country, market, demand, competition, logistics, risk):
        completeness = self.completeness([demand, competition, logistics, risk])
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO markets
                (country_code,market_name,demand,competition,logistics,risk,
                 data_completeness,created_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (country, market, demand, competition, logistics, risk, completeness, now),
            )
        return f"Markt gespeichert: {market} ({country}) | Datenabdeckung {completeness:.1f}%"

    def score(self, demand, competition, margin, logistics, risk):
        values = [demand, competition, margin, logistics, risk]
        if any(value is None for value in values):
            return None
        return round(
            demand * 0.30
            + (100 - competition) * 0.20
            + margin * 0.25
            + logistics * 0.15
            + (100 - risk) * 0.10,
            1,
        )

    def add_opportunity(
        self, country, category, product, demand, competition, margin, logistics, risk
    ):
        completeness = self.completeness([demand, competition, margin, logistics, risk])
        score = self.score(demand, competition, margin, logistics, risk)
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT INTO opportunities
                (country_code,category,product,demand,competition,margin,
                 logistics,risk,score,data_completeness,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    country,
                    category,
                    product,
                    demand,
                    competition,
                    margin,
                    logistics,
                    risk,
                    score,
                    completeness,
                    now,
                ),
            )
        label = f"{score:.1f}" if score is not None else "DATEN_UNZUREICHEND"
        return f"Chance gespeichert: {product} | {country} | Score={label} | Daten={completeness:.1f}%"

    def demo(self):
        self.add_market("DE", "Deutschland", 85, 70, 90, 15)
        self.add_market("TR", "Türkei", 78, 65, 70, 30)
        self.add_market("AE", "VAE", 82, 55, 68, 25)
        self.add_market("SA", "Saudi-Arabien", 80, 60, 62, 28)

        self.add_opportunity("DE", "Automotive", "5W-30 Motoröl", 88, 65, 80, 92, 15)
        self.add_opportunity("TR", "Automotive", "5W-30 Motor Yağı", 82, 58, 76, 72, 28)
        self.add_opportunity("AE", "Automotive", "5W-30 Engine Oil", 84, 50, 78, 68, 22)
        self.add_opportunity("SA", "Automotive", "5W-30 Engine Oil", 81, 57, 75, 61, 25)

    def report(self):
        with self.connect() as con:
            markets = con.execute(
                """
                SELECT country_code,market_name,demand,competition,
                       logistics,risk,data_completeness
                FROM markets ORDER BY data_completeness DESC,market_name
                """
            ).fetchall()

            opportunities = con.execute(
                """
                SELECT country_code,category,product,score,data_completeness,
                       demand,competition,margin,logistics,risk
                FROM opportunities
                ORDER BY score DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v17 MARKT- & LÄNDER-CHANCEN-BERICHT ===", "", "MÄRKTE"]
        for row in markets:
            out.append(
                f"- {row['market_name']} [{row['country_code']}] | "
                f"Nachfrage={row['demand'] if row['demand'] is not None else '-'} | "
                f"Wettbewerb={row['competition'] if row['competition'] is not None else '-'} | "
                f"Logistik={row['logistics'] if row['logistics'] is not None else '-'} | "
                f"Risiko={row['risk'] if row['risk'] is not None else '-'} | "
                f"Daten={row['data_completeness']:.1f}%"
            )

        out += ["", "PRODUKTCHANCEN"]
        for row in opportunities:
            score = (
                f"{row['score']:.1f}"
                if row["score"] is not None
                else "DATEN_UNZUREICHEND"
            )
            out.append(
                f"- {row['product']} | {row['category']} | {row['country_code']} | "
                f"Chance={score} | Daten={row['data_completeness']:.1f}%"
            )

        out += [
            "",
            "REGEL:",
            "Der Score ist ein Vergleichswerkzeug — keine Verkaufs- oder Gewinngarantie.",
            "Märkte mit unvollständigen Daten sollten nicht als endgültige Rangfolge behandelt werden.",
        ]
        return "\n".join(out)
