from buzzard_ai_complete.database.db import connect
from buzzard_ai_complete.core.time import now
class AgentRegistry:
    def register(self,name,role,status='ACTIVE'):
        with connect() as c:
            c.execute('INSERT INTO agents(name,role,status,created_at) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET role=excluded.role,status=excluded.status',(name,role,status,now()))
    def all(self):
        with connect() as c: return [dict(r) for r in c.execute('SELECT * FROM agents ORDER BY name').fetchall()]
