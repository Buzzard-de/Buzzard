import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_demand_v26.db"


class DemandForecast:
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
                CREATE TABLE IF NOT EXISTS observations(
                    id INTEGER PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    period TEXT NOT NULL,
                    value REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(product_id,period)
                );

                CREATE TABLE IF NOT EXISTS forecasts(
                    id INTEGER PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    window_size INTEGER NOT NULL,
                    baseline REAL,
                    recent_average REAL,
                    trend_pct REAL,
                    forecast_value REAL,
                    confidence REAL,
                    direction TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add_observation(self, product_id, value, period):
        if value < 0:
            return "Nachfragewert darf nicht negativ sein."
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO observations
                (product_id,period,value,created_at)
                VALUES(?,?,?,?)
                """,
                (product_id, period, value, now),
            )
        return f"Nachfrage-Beobachtung gespeichert: {product_id} / {period} = {value}"

    def forecast(self, product_id, window=7):
        window = max(2, min(90, window))
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT period,value
                FROM observations
                WHERE product_id=?
                ORDER BY period
                """,
                (product_id,),
            ).fetchall()

        values = [float(row["value"]) for row in rows]

        if len(values) < 3:
            return (
                f"{product_id}: DATEN UNZUREICHEND. "
                f"Für eine Prognose werden mindestens 3 Beobachtungen benötigt."
            )

        baseline = (
            mean(values[:-min(window, len(values))])
            if len(values) > window
            else mean(values[:-1])
        )
        recent = mean(values[-min(window, len(values)) :])

        if baseline == 0:
            trend = None
            forecast_value = recent
        else:
            trend = (recent - baseline) / baseline * 100
            capped = max(-50, min(100, trend))
            forecast_value = recent * (1 + capped / 100)

        if baseline and abs(trend if trend is not None else 0) < 3:
            direction = "STABLE"
        elif trend is not None and trend > 0:
            direction = "RISING"
        elif trend is not None:
            direction = "FALLING"
        else:
            direction = "STABLE"

        confidence = min(0.95, 0.35 + len(values) * 0.03)

        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT INTO forecasts
                (product_id,window_size,baseline,recent_average,trend_pct,
                 forecast_value,confidence,direction,created_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    product_id,
                    window,
                    baseline,
                    recent,
                    trend,
                    forecast_value,
                    confidence,
                    direction,
                    now,
                ),
            )

        trend_text = f"{trend:.2f}%" if trend is not None else "N/A"
        return (
            f"=== NACHFRAGE-PROGNOSE: {product_id} ===\n"
            f"Beobachtungen={len(values)}\n"
            f"Letzter-Durchschnitt={recent:.2f}\n"
            f"Trend={trend_text}\n"
            f"Richtung={direction}\n"
            f"Prognose={forecast_value:.2f}\n"
            f"Modell-Konfidenz={confidence:.2f}\n"
            f"HINWEIS: Prognose basiert nur auf eingegebenen Nachfrage-Signalen."
        )

    def demo(self):
        vals = [82, 88, 91, 96, 103, 108, 115, 121, 126, 134, 140, 147, 153, 160]
        for i, value in enumerate(vals, 1):
            self.add_observation("DEMO-EAN-001", value, f"2026-07-{i:02d}")
        self.forecast("DEMO-EAN-001", 7)

    def report(self):
        with self.connect() as con:
            products = con.execute(
                """
                SELECT product_id,COUNT(*) n,MIN(period) first_period,
                       MAX(period) last_period
                FROM observations
                GROUP BY product_id
                ORDER BY product_id
                """
            ).fetchall()

            forecasts = con.execute(
                """
                SELECT product_id,forecast_value,trend_pct,confidence,
                       direction,created_at
                FROM forecasts
                ORDER BY created_at DESC
                LIMIT 100
                """
            ).fetchall()

        out = ["=== BUZZARD v26 DEMAND FORECASTING BERICHT ===", "", "DATENABDECKUNG"]
        for row in products:
            out.append(
                f"- {row['product_id']} | Beobachtungen={row['n']} | "
                f"{row['first_period']} -> {row['last_period']}"
            )

        out += ["", "LETZTE PROGNOSEN"]
        for row in forecasts:
            trend = f"{row['trend_pct']:.2f}%" if row["trend_pct"] is not None else "N/A"
            out.append(
                f"- {row['product_id']} | Richtung={row['direction']} | "
                f"Prognose={row['forecast_value']:.2f} | Trend={trend} | "
                f"Konfidenz={row['confidence']:.2f}"
            )

        out += [
            "",
            "REGELN:",
            "Prognosen sind Entscheidungshilfe, keine Verkaufsgarantie.",
            "Saisonalität, Kampagnen, Out-of-Stock und Preisänderungen müssen separat modelliert werden.",
            "Bei wenig Daten macht das System keine hohe Konfidenz-Aussage.",
        ]
        return "\n".join(out)
