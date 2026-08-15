try:
 from fastapi import FastAPI,HTTPException,Header
 from pydantic import BaseModel
except ImportError: FastAPI=None
from buzzard_ai_complete.database.db import init_db
from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.core.registry import AgentRegistry
from buzzard_ai_complete.reports.builder import ReportBuilder
from buzzard_ai_complete.monitoring.health import health
from buzzard_ai_complete.security.auth import authorize
if FastAPI:
 app=FastAPI(title='Buzzard AI',version='2.0.0'); init_db(); aslan=AslanBey(); dogu=DoguBey(); esat=EsatBey()
 class TaskIn(BaseModel): title:str; description:str; priority:str='NORMAL'
 class DispatchIn(BaseModel): task_id:int; url:str
 def guard(token):
  if not authorize(token): raise HTTPException(401,'Unauthorized')
 @app.get('/health')
 def health_route(): return health()
 @app.get('/agents')
 def agents(): return AgentRegistry().all()
 @app.get('/dashboard')
 def dashboard(): return aslan.dashboard()
 @app.get('/report')
 def report(): return {'report':ReportBuilder().build_executive()}
 @app.post('/tasks')
 def create_task(item:TaskIn,x_buzzard_token:str|None=Header(default=None)):
  guard(x_buzzard_token)
  try:return {'task_id':aslan.create_research_task(item.title,item.description,item.priority)}
  except ValueError as e: raise HTTPException(400,str(e))
 @app.post('/dispatch')
 def dispatch(item:DispatchIn,x_buzzard_token:str|None=Header(default=None)):
  guard(x_buzzard_token); return aslan.dispatch(item.task_id,item.url)
 @app.post('/security/scan')
 def scan(item:dict,x_buzzard_token:str|None=Header(default=None)):
  guard(x_buzzard_token); return esat.scan_text(str(item.get('text','')))
else: app=None
