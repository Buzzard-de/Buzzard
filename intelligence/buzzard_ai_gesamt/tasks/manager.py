import json

from buzzard_ai_gesamt.core.events import EventBus
from buzzard_ai_gesamt.core.time import now
from buzzard_ai_gesamt.database.db import connect

PRIORITIES={'CRITICAL':4,'HIGH':3,'NORMAL':2,'LOW':1}
STATUSES={'PENDING','IN_PROGRESS','COMPLETED','FAILED','ESCALATED','CANCELLED'}

class TaskManager:
    def __init__(self): self.events=EventBus()
    def create(self,title,description,priority='NORMAL',assigned_to=None,parent_id=None):
        priority=priority.upper()
        if priority not in PRIORITIES: raise ValueError('invalid priority')
        t=now()
        with connect() as c:
            cur=c.execute('''INSERT INTO tasks(title,description,priority,status,assigned_to,parent_id,created_at,updated_at)
                             VALUES(?,?,?,?,?,?,?,?)''',(title,description,priority,'PENDING',assigned_to,parent_id,t,t))
            task_id=cur.lastrowid
        self.events.emit('TASK_CREATED','aslan_bey',{'task_id':task_id,'assigned_to':assigned_to})
        return task_id
    def update(self,task_id,status=None,assigned_to=None,result=None):
        if status and status not in STATUSES: raise ValueError('invalid status')
        if result is not None and not isinstance(result, str):
            result = json.dumps(result, ensure_ascii=False)
        with connect() as c:
            r=c.execute('SELECT * FROM tasks WHERE id=?',(task_id,)).fetchone()
            if not r: raise KeyError('task not found')
            c.execute('''UPDATE tasks SET status=COALESCE(?,status),assigned_to=COALESCE(?,assigned_to),
                         result=COALESCE(?,result),updated_at=? WHERE id=?''',(status,assigned_to,result,now(),task_id))
        self.events.emit('TASK_UPDATED','aslan_bey',{'task_id':task_id,'status':status})
    def get(self,task_id):
        with connect() as c:
            r=c.execute('SELECT * FROM tasks WHERE id=?',(task_id,)).fetchone(); return dict(r) if r else None
    def list(self,status=None):
        q='SELECT * FROM tasks'; params=[]
        if status: q+=' WHERE status=?'; params.append(status)
        q+=' ORDER BY CASE priority WHEN "CRITICAL" THEN 4 WHEN "HIGH" THEN 3 WHEN "NORMAL" THEN 2 ELSE 1 END DESC, id DESC'
        with connect() as c: return [dict(r) for r in c.execute(q,params).fetchall()]
