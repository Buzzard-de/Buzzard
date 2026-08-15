from urllib.parse import urlparse
class SourceRegistry:
    def __init__(self,db): self.db=db
    def add(self,url,title='',quality=0.5):
        domain=urlparse(url).netloc.lower(); self.db.execute('INSERT OR IGNORE INTO sources(url,title,domain,quality) VALUES(?,?,?,?)',(url,title,domain,quality)); r=self.db.execute('SELECT id FROM sources WHERE url=?',(url,),True)[0]; return r['id']
    def get(self,source_id):
        r=self.db.execute('SELECT * FROM sources WHERE id=?',(source_id,),True); return dict(r[0]) if r else None
