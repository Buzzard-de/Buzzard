import json
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now

class EventBus:
    def emit(self,event_type,actor,payload):
        with connect() as c:
            c.execute('INSERT INTO events(event_type,actor,payload,created_at) VALUES(?,?,?,?)',
                      (event_type,actor,json.dumps(payload,ensure_ascii=False),now()))

    def recent(self,limit=50):
        with connect() as c:
            return [dict(r) for r in c.execute('SELECT * FROM events ORDER BY id DESC LIMIT ?', (limit,)).fetchall()]
