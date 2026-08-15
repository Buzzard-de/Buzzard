import json
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now

class MemoryStore:
    def put(self,namespace,key,value,source=None,confidence=0.0):
        if not 0 <= confidence <= 100: raise ValueError('confidence must be 0..100')
        value = value if isinstance(value,str) else json.dumps(value,ensure_ascii=False)
        with connect() as c:
            c.execute('''INSERT INTO memory(namespace,key,value,source,confidence,created_at,updated_at)
                         VALUES(?,?,?,?,?,?,?)
                         ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value,source=excluded.source,
                         confidence=excluded.confidence,updated_at=excluded.updated_at''',
                      (namespace,key,value,source,confidence,now(),now()))

    def get(self,namespace,key):
        with connect() as c:
            r=c.execute('SELECT * FROM memory WHERE namespace=? AND key=?',(namespace,key)).fetchone()
            return dict(r) if r else None

    def search(self,term,limit=20):
        with connect() as c:
            rows=c.execute('''SELECT * FROM memory WHERE namespace LIKE ? OR key LIKE ? OR value LIKE ?
                              ORDER BY confidence DESC, updated_at DESC LIMIT ?''',
                           (f'%{term}%',f'%{term}%',f'%{term}%',limit)).fetchall()
            return [dict(r) for r in rows]
