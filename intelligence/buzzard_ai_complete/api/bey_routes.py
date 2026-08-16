try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None
    BaseModel = None
    Field = None

from buzzard_ai_complete.runtime.bey_runtime import BeyRuntime

if APIRouter:

    class BeyTaskRequest(BaseModel):
        title: str = Field(..., min_length=1)
        description: str = ""
        priority: str = "NORMAL"

    class BeyScanRequest(BaseModel):
        text: str = Field(..., min_length=1)

    router = APIRouter(prefix="/bey", tags=["bey"])
    runtime = BeyRuntime()

    @router.get("/health")
    def bey_health():
        status = runtime.status()
        return {
            "status": "ok" if status["started"] else "starting",
            **status,
        }

    @router.get("/status")
    def bey_status():
        return runtime.status()

    @router.get("/dashboard")
    def bey_dashboard():
        return runtime.dashboard()

    @router.post("/tasks")
    def bey_create_task(req: BeyTaskRequest):
        task_id = runtime.aslan.create_research_task(req.title, req.description, req.priority)
        task = runtime.aslan.tasks.get(task_id)
        return {"task_id": task_id, "task": task}

    @router.post("/scan")
    def bey_scan(req: BeyScanRequest):
        return runtime.esat.scan_text(req.text)
else:
    router = None
