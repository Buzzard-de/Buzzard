class DoguBey:
    name='dogu_bey'; role='Intelligence & OSINT Specialist'
    def __init__(self,research,memory,db): self.research=research; self.memory=memory; self.db=db
    def record_finding(self,key,value,source_id=None): return self.memory.put(key,value,source_id)
    def research_url(self,url,title=''):
        result=self.research.fetch(url); sid=self.research.register(url,title); return {'source_id':sid,'url':result.url,'status':result.status,'content':result.content}
