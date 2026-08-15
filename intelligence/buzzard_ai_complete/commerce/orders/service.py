import uuid

from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class OrderService:
    def __init__(self):
        init_db()

    def create(self, country, items, shipping=0, fees=0, tax=0, currency="EUR"):
        subtotal = sum(float(i["unit_price"]) * int(i["quantity"]) for i in items)
        total = subtotal + float(shipping) + float(fees) + float(tax)
        order_no = "BZ-" + uuid.uuid4().hex[:12].upper()
        with connect() as c:
            cur = c.execute(
                "INSERT INTO orders(order_no,status,customer_country,currency,subtotal,shipping,fees,tax,total,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (order_no, "NEW", country, currency, subtotal, shipping, fees, tax, total, now(), now()),
            )
            oid = cur.lastrowid
            for item in items:
                c.execute(
                    "INSERT INTO order_items(order_id,sku,quantity,unit_price) VALUES(?,?,?,?)",
                    (oid, item["sku"], int(item["quantity"]), float(item["unit_price"])),
                )
        return order_no
