class AslanBey:
    name='aslan_bey'; role='Müsteşar / Orchestrator'
    def __init__(self,tasks,db): self.tasks=tasks; self.db=db
    def delegate_research(self,title,description,priority='NORMAL'):
        tid=self.tasks.create(title,description,priority,'dogu_bey'); self.tasks.assign(tid,'dogu_bey'); return tid
    def review(self,task_id,decision,notes=''):
        self.db.execute('INSERT INTO audit(actor,action,object_type,object_id,details) VALUES(?,?,?,?,?)',(self.name,'review','task',task_id,f'{decision}: {notes}'))
        return {'task_id':task_id,'decision':decision,'notes':notes}
