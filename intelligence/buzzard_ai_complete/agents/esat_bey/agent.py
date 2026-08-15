class EsatBey:
    name='esat_bey'; role='Defensive AI Security Specialist'
    def __init__(self,db): self.db=db
    def audit(self,actor,action,obj_type,obj_id,details=''):
        self.db.execute('INSERT INTO audit(actor,action,object_type,object_id,details) VALUES(?,?,?,?,?)',(actor,action,obj_type,str(obj_id),details))
    def scan_text(self,text):
        flags=[]
        for term in ('ignore previous instructions','password','api key','secret'):
            if term in text.lower(): flags.append(term)
        return {'risk':'HIGH' if flags else 'LOW','flags':flags}
