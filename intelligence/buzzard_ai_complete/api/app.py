try:
    from fastapi import FastAPI, Header, HTTPException
    from pydantic import BaseModel
except ImportError:
    FastAPI = None

from buzzard_ai_complete.api.service import BuzzardService
from buzzard_ai_complete.commerce.api.routes import router as commerce_router
from buzzard_ai_complete.config.settings import API_TOKEN, APP_VERSION
from buzzard_ai_complete.logistics.api.routes import router as logistics_router
from buzzard_ai_complete.monitoring.health import health
from buzzard_ai_complete.order_engine.api.routes import router as orders_router
from buzzard_ai_complete.customer_billing.api.routes import router as billing_router
from buzzard_ai_complete.crm.api.routes import router as crm_router

if FastAPI:
    app = FastAPI(title="Buzzard AI COMPLETE API", version=APP_VERSION)
    service = BuzzardService()
    if commerce_router is not None:
        app.include_router(commerce_router)
    if logistics_router is not None:
        app.include_router(logistics_router)
    if orders_router is not None:
        app.include_router(orders_router)
    if billing_router is not None:
        app.include_router(billing_router)
    if crm_router is not None:
        app.include_router(crm_router)

    class TaskRequest(BaseModel):
        task_id: str
        objective: str
        priority: str = "NORMAL"

    def authorize(token):
        if API_TOKEN and token != API_TOKEN:
            raise HTTPException(status_code=401, detail="Unauthorized")

    @app.get("/health")
    def get_health():
        return health()

    @app.post("/tasks")
    def create_task(req: TaskRequest, authorization: str | None = Header(default=None)):
        authorize(authorization)
        return service.submit(req.task_id, req.objective, req.priority)
else:
    app = None
