import json
class MemoryStore:
    def __init__(self,db): self.db=db
    def put(self,key,value,source_id=None):
        row=self.db.execute('SELECT MAX(version) v FROM memory WHERE key=?',(key,),True)[0]; v=(row['v'] or 0)+1
        self.db.execute('INSERT INTO memory(key,value,source_id,version) VALUES(?,?,?,?)',(key,json.dumps(value,ensure_ascii=False),source_id,v)); return v
    def latest(self,key):
        rows=self.db.execute('SELECT * FROM memory WHERE key=? ORDER BY version DESC LIMIT 1',(key,),True); return json.loads(rows[0]['value']) if rows else None
    def history(self,key):
        return [dict(r) for r in self.db.execute('SELECT * FROM memory WHERE key=? ORDER BY version',(key,),True)]
