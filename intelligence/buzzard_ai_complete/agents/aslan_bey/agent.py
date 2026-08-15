from dataclasses import dataclass, field
from typing import List, Dict, Any
from buzzard_ai_complete.tasks.manager import TaskManager
from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.database.db import connect, init_db
from buzzard_ai_complete.core.events import EventBus

@dataclass
class ManagedTask:
    task_id: str
    objective: str
    priority: str = "NORMAL"
    status: str = "PENDING"
    subtasks: List[Dict[str, Any]] = field(default_factory=list)

class AslanBey:
    name='aslan_bey'
    role='Müsteşar / AI Operasyon ve İstihbarat Koordinatörü'

    def __init__(self):
        init_db()
        self.tasks=TaskManager()
        self.dogu=DoguBey()
        self.events=EventBus()

    def create_research_task(self,title,description,priority='NORMAL'):
        return self.tasks.create(title,description,priority,assigned_to='dogu_bey')

    def decompose(self, task: ManagedTask):
        task.subtasks=[
            {'id':f'{task.task_id}-research','role':'dogu_bey','objective':task.objective},
            {'id':f'{task.task_id}-verify','role':'verification','objective':'Validate evidence and contradictions'},
            {'id':f'{task.task_id}-report','role':'reporting','objective':'Prepare management summary'},
        ]
        return task.subtasks

    def dispatch(self,task_id,url):
        task=self.tasks.get(task_id)
        if not task: raise KeyError('task not found')
        self.tasks.update(task_id,'IN_PROGRESS')
        result=self.dogu.research_url(url)
        status='COMPLETED' if 'error' not in result else 'FAILED'
        self.tasks.update(task_id,status,result=str(result))
        self.events.emit('TASK_DISPATCHED',self.name,{'task_id':task_id,'agent':'dogu_bey','url':url,'status':status})
        return result

    def execute(self, task: ManagedTask):
        # The orchestrator creates a real task record and then runs the intelligence step.
        real_id=self.create_research_task(task.task_id, task.objective, task.priority)
        task.subtasks=self.decompose(task)
        self.tasks.update(real_id,'IN_PROGRESS')
        result=self.dogu.research_question(task.objective, task_id=str(real_id))
        self.tasks.update(real_id,'COMPLETED',result=str(result))
        task.status='COMPLETED'
        return {'task':task,'task_record':self.tasks.get(real_id),'research':result}

    def audit_claims(self):
        with connect() as c:
            rows=c.execute('''SELECT c.id,c.entity,c.status,c.verification_score,COUNT(s.id) source_count
                              FROM claims c LEFT JOIN sources s ON s.claim_id=c.id
                              GROUP BY c.id ORDER BY c.updated_at DESC''').fetchall()
        findings=[]
        for r in rows:
            if r['status'] in ('CONFLICT','OUTDATED','REJECTED') or (r['status']=='PENDING' and r['source_count']==0):
                findings.append(dict(r))
        self.events.emit('CLAIM_AUDIT',self.name,{'issues':len(findings)})
        return findings

    def dashboard(self):
        return {'open_tasks':self.tasks.list('PENDING')+self.tasks.list('IN_PROGRESS'),
                'claim_issues':self.audit_claims()}
