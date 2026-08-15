import json
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now
class MemoryStore:
    def put(self,namespace,key,value,source=None,confidence=0.0):
        if not 0<=confidence<=100: raise ValueError('confidence must be 0..100')
        value=value if isinstance(value,str) else json.dumps(value,ensure_ascii=False)
        t=now()
        with connect() as c:
            old=c.execute('SELECT * FROM memory WHERE namespace=? AND key=?',(namespace,key)).fetchone()
            if old:
                c.execute('INSERT INTO memory_history(memory_id,namespace,key,value,source,confidence,version,changed_at) VALUES(?,?,?,?,?,?,?,?)',(old['id'],old['namespace'],old['key'],old['value'],old['source'],old['confidence'],old['version'],t))
                c.execute('UPDATE memory SET value=?,source=?,confidence=?,version=version+1,valid_from=?,valid_to=NULL,updated_at=? WHERE id=?',(value,source,confidence,t,t,old['id']))
            else:
                c.execute('INSERT INTO memory(namespace,key,value,source,confidence,version,valid_from,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,?)',(namespace,key,value,source,confidence,1,t,t,t))
    def get(self,namespace,key):
        with connect() as c:
            r=c.execute('SELECT * FROM memory WHERE namespace=? AND key=?',(namespace,key)).fetchone(); return dict(r) if r else None
    def search(self,term,limit=20):
        with connect() as c:
            rows=c.execute('SELECT * FROM memory WHERE namespace LIKE ? OR key LIKE ? OR value LIKE ? ORDER BY confidence DESC,updated_at DESC LIMIT ?',(f'%{term}%',f'%{term}%',f'%{term}%',limit)).fetchall(); return [dict(r) for r in rows]
    def history(self,namespace,key):
        with connect() as c:
            m=c.execute('SELECT id FROM memory WHERE namespace=? AND key=?',(namespace,key)).fetchone()
            if not m:return []
            return [dict(r) for r in c.execute('SELECT * FROM memory_history WHERE memory_id=? ORDER BY version',(m['id'],)).fetchall()]
