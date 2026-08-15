import hashlib
import json
import uuid

from buzzard_ai_complete.ai_phone_assistant.memory.store import connect, now


class CustomerMemory:
    def __init__(self, con=None):
        self.con = con or connect()

    def hash_phone(self, phone):
        normalized = "".join(x for x in (phone or "") if x.isdigit() or x == "+")
        return hashlib.sha256(normalized.encode()).hexdigest()

    def find_or_create(self, phone, language="de", display_name=None):
        phone_hash = self.hash_phone(phone)
        row = self.con.execute(
            "SELECT customer_id FROM customers WHERE phone_hash=?",
            (phone_hash,),
        ).fetchone()
        if row:
            return row[0]
        customer_id = str(uuid.uuid4())
        self.con.execute(
            "INSERT INTO customers VALUES(?,?,?,?,?,?,?)",
            (customer_id, phone_hash, language, display_name, now(), now(), "active"),
        )
        self.con.commit()
        return customer_id

    def save_fact(
        self,
        customer_id,
        key,
        value,
        call_id=None,
        confidence=1.0,
        approved=False,
        expires_at=None,
    ):
        self.con.execute(
            """
            INSERT INTO memory_facts VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(customer_id,fact_key) DO UPDATE SET
              fact_value=excluded.fact_value,
              confidence=excluded.confidence,
              source_call_id=excluded.source_call_id,
              approved=excluded.approved,
              expires_at=excluded.expires_at
            """,
            (
                str(uuid.uuid4()),
                customer_id,
                key,
                json.dumps(value, ensure_ascii=False),
                confidence,
                call_id,
                int(approved),
                now(),
                expires_at,
            ),
        )
        self.con.commit()

    def approved_facts(self, customer_id):
        rows = self.con.execute(
            "SELECT fact_key,fact_value,confidence FROM memory_facts WHERE customer_id=? AND approved=1",
            (customer_id,),
        )
        return [
            {"key": key, "value": json.loads(value), "confidence": confidence}
            for key, value, confidence in rows
        ]

    def log_call(self, call_id, customer_id, language, outcome, summary):
        self.con.execute(
            "INSERT OR REPLACE INTO calls VALUES(?,?,?,?,?,?,?)",
            (call_id, customer_id, language, now(), now(), outcome, summary),
        )
        self.con.commit()

    def recent_calls(self, customer_id, limit=5):
        rows = self.con.execute(
            "SELECT call_id,language,started_at,outcome,summary FROM calls WHERE customer_id=? ORDER BY started_at DESC LIMIT ?",
            (customer_id, limit),
        )
        return [
            {
                "call_id": call_id,
                "language": language,
                "started_at": started_at,
                "outcome": outcome,
                "summary": summary,
            }
            for call_id, language, started_at, outcome, summary in rows
        ]

    def customer_count(self):
        row = self.con.execute("SELECT COUNT(*) FROM customers").fetchone()
        return row[0] if row else 0
