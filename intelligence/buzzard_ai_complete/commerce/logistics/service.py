from buzzard_ai_complete.database.db import connect, init_db


class LogisticsService:
    def __init__(self):
        init_db()

    def add_rate(self, carrier, country, max_weight_kg, price, service, max_length_cm=0):
        with connect() as c:
            cur = c.execute(
                "INSERT INTO shipping_rates(carrier,country,max_weight_kg,max_length_cm,price,service) VALUES(?,?,?,?,?,?)",
                (carrier, country, float(max_weight_kg), float(max_length_cm), float(price), service),
            )
            return cur.lastrowid

    def quote(self, country, weight_kg, length_cm=0):
        with connect() as c:
            rows = c.execute(
                "SELECT * FROM shipping_rates WHERE active=1 AND country=? AND max_weight_kg>=? AND max_length_cm>=? ORDER BY price ASC",
                (country, float(weight_kg), float(length_cm)),
            ).fetchall()
            return [dict(r) for r in rows]
