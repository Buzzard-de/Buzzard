from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class MarketService:
    def __init__(self):
        init_db()

    def signal(self, keyword, signal_type, value, source=None):
        with connect() as c:
            cur = c.execute(
                "INSERT INTO market_signals(keyword,signal_type,value,source,observed_at) VALUES(?,?,?,?,?)",
                (keyword, signal_type, float(value), source, now()),
            )
            return cur.lastrowid

    def history(self, keyword):
        with connect() as c:
            return [
                dict(r)
                for r in c.execute(
                    "SELECT * FROM market_signals WHERE keyword=? ORDER BY observed_at DESC",
                    (keyword,),
                ).fetchall()
            ]
