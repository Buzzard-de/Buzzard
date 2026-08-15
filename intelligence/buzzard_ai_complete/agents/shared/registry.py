class AgentRegistry:
    def __init__(self,db): self.db=db
    def register(self,agent): self.db.execute('INSERT OR REPLACE INTO agents(id,name,role,status) VALUES(?,?,?,?)',(agent.name,agent.name,agent.role,'ACTIVE'))
    def list(self): return [dict(r) for r in self.db.execute('SELECT * FROM agents ORDER BY name',(),True)]
