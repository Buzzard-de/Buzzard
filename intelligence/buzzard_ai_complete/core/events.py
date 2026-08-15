import json
class EventBus:
    def __init__(self,db): self.db=db; self.handlers={}
    def on(self,event,handler): self.handlers.setdefault(event,[]).append(handler)
    def emit(self,event,payload):
        self.db.execute('INSERT INTO events(type,payload) VALUES(?,?)',(event,json.dumps(payload,ensure_ascii=False)))
        for h in self.handlers.get(event,[]): h(payload)
