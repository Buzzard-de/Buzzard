import uuid
class TaskManager:
    def __init__(self,db): self.db=db
    def create(self,title,description,priority='NORMAL',assignee=None):
        tid=str(uuid.uuid4()); self.db.execute('INSERT INTO tasks(id,title,description,priority,status,assignee) VALUES(?,?,?,?,?,?)',(tid,title,description,priority,'PENDING',assignee)); return tid
    def assign(self,tid,agent): self.db.execute('UPDATE tasks SET assignee=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(agent,'ASSIGNED',tid))
    def complete(self,tid,result=None): self.db.execute('UPDATE tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',('DONE',tid))
    def list(self,status=None):
        q='SELECT * FROM tasks'; a=()
        if status: q+=' WHERE status=?'; a=(status,)
        return [dict(r) for r in self.db.execute(q+' ORDER BY created_at DESC',a,True)]
