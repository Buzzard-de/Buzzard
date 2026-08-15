from buzzard_ai_gesamt.tasks.manager import TaskManager
from buzzard_ai_gesamt.agents.dogu_bey.agent import DoguBey
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.events import EventBus
from buzzard_ai_gesamt.core.time import now

class AslanBey:
    name='aslan_bey'; role='Müsteşar / AI Operasyon ve İstihbarat Koordinatörü'
    def __init__(self): self.tasks=TaskManager(); self.dogu=DoguBey(); self.events=EventBus()
    def create_research_task(self,title,description,priority='NORMAL'):
        return self.tasks.create(title,description,priority,assigned_to='dogu_bey')
    def dispatch(self,task_id,url):
        task=self.tasks.get(task_id)
        if not task: raise KeyError('task not found')
        self.tasks.update(task_id,'IN_PROGRESS')
        result=self.dogu.research_url(url)
        status='COMPLETED' if 'error' not in result else 'FAILED'
        self.tasks.update(task_id,status,result=str(result))
        self.events.emit('TASK_DISPATCHED',self.name,{'task_id':task_id,'agent':'dogu_bey','url':url,'status':status})
        return result
    def audit_claims(self):
        with connect() as c:
            rows=c.execute('''SELECT c.id,c.entity,c.status,c.verification_score,COUNT(s.id) source_count
                              FROM claims c LEFT JOIN sources s ON s.claim_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC''').fetchall()
        findings=[]
        for r in rows:
            if r['status'] in ('CONFLICT','OUTDATED','REJECTED') or (r['status']=='PENDING' and r['source_count']==0):
                findings.append(dict(r))
        self.events.emit('CLAIM_AUDIT','aslan_bey',{'issues':len(findings)})
        return findings
    def dashboard(self):
        return {'open_tasks':self.tasks.list('PENDING')+self.tasks.list('IN_PROGRESS'), 'claim_issues':self.audit_claims()}
