class ReportBuilder:
    def __init__(self,db): self.db=db
    def task_report(self,task_id):
        r=self.db.execute('SELECT * FROM tasks WHERE id=?',(task_id,),True); return dict(r[0]) if r else None
