try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
except ImportError:
    FastAPI=None
from buzzard_ai_gesamt.database.db import init_db
from buzzard_ai_gesamt.agents.aslan_bey import AslanBey
from buzzard_ai_gesamt.agents.esat_bey import EsatBey
from buzzard_ai_gesamt.agents.dogu_bey import DoguBey
from buzzard_ai_gesamt.core.registry import AgentRegistry
from buzzard_ai_gesamt.reports.builder import ReportBuilder

if FastAPI:
    app=FastAPI(title='Buzzard AI',version='1.0.0')
    init_db(); aslan=AslanBey(); dogu=DoguBey(); esat=EsatBey()
    class TaskIn(BaseModel):
        title:str; description:str; priority:str='NORMAL'
    @app.get('/health')
    def health(): return {'status':'ok','version':'1.0.0'}
    @app.get('/agents')
    def agents(): return AgentRegistry().all()
    @app.get('/dashboard')
    def dashboard(): return aslan.dashboard()
    @app.get('/report')
    def report(): return {'report':ReportBuilder().build_executive()}
    @app.post('/tasks')
    def create_task(item:TaskIn):
        try: return {'task_id':aslan.create_research_task(item.title,item.description,item.priority)}
        except ValueError as e: raise HTTPException(400,str(e))
else:
    app=None
