from buzzard_ai_complete.agents.aslan_bey.agent import AslanBey
from buzzard_ai_complete.agents.dogu_bey.agent import DoguBey
from buzzard_ai_complete.agents.esat_bey.agent import EsatBey
from buzzard_ai_complete.agents.shared.registry import AgentRegistry
from buzzard_ai_complete.config.settings import settings
from buzzard_ai_complete.database.db import Database
from buzzard_ai_complete.memory.store import MemoryStore
from buzzard_ai_complete.research.engine import ResearchEngine
from buzzard_ai_complete.sources.registry import SourceRegistry
from buzzard_ai_complete.tasks.manager import TaskManager


def build():
    db = Database(settings.database_path)
    sources = SourceRegistry(db)
    research = ResearchEngine(sources)
    memory = MemoryStore(db)
    tasks = TaskManager(db)
    dogu = DoguBey(research, memory, db)
    aslan = AslanBey(tasks, db)
    esat = EsatBey(db)
    registry = AgentRegistry(db)
    for agent in (dogu, aslan, esat):
        registry.register(agent)
    return {
        "db": db,
        "dogu_bey": dogu,
        "aslan_bey": aslan,
        "esat_bey": esat,
        "memory": memory,
        "tasks": tasks,
        "research": research,
        "agents": registry,
    }
