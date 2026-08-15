from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class CompetitorService:
    def __init__(self):
        init_db()

    def record_price(self, sku, competitor, url, price, currency="EUR"):
        with connect() as c:
            cur = c.execute(
                "INSERT INTO competitor_prices(sku,competitor,url,price,currency,observed_at) VALUES(?,?,?,?,?,?)",
                (sku, competitor, url, float(price), currency, now()),
            )
            return cur.lastrowid

    def prices(self, sku):
        with connect() as c:
            return [
                dict(r)
                for r in c.execute(
                    "SELECT * FROM competitor_prices WHERE sku=? ORDER BY observed_at DESC",
                    (sku,),
                ).fetchall()
            ]
