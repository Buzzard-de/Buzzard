from buzzard_ai_complete.database.db import connect
from buzzard_ai_complete.core.time import now
class Audit:
    def log(self,actor,action,detail):
        with connect() as c: c.execute('INSERT INTO events(event_type,actor,payload,created_at) VALUES(?,?,?,?)',('AUDIT',actor,f'{{"action": {action!r}, "detail": {detail!r}}}',now()))
    def recent(self,limit=100):
        with connect() as c: return [dict(r) for r in c.execute('SELECT * FROM events WHERE event_type="AUDIT" ORDER BY id DESC LIMIT ?',(limit,)).fetchall()]
