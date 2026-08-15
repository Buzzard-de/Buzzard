try:
    from fastapi import FastAPI, Header, HTTPException
except ImportError:
    FastAPI=None
from buzzard_ai_complete.config.settings import settings
from buzzard_ai_complete.database.db import Database
from buzzard_ai_complete.tasks.manager import TaskManager
from buzzard_ai_complete.agents.aslan_bey.agent import AslanBey

db=Database(settings.database_path); tasks=TaskManager(db); aslan=AslanBey(tasks,db)
app=FastAPI(title='Buzzard AI') if FastAPI else None
if app:
    def auth(token):
        if settings.api_token and token!=settings.api_token: raise HTTPException(401,'Unauthorized')
    @app.get('/health')
    def health(): return {'status':'ok'}
    @app.get('/tasks')
    def get_tasks(x_buzzard_token: str|None=Header(default=None)):
        auth(x_buzzard_token); return tasks.list()
