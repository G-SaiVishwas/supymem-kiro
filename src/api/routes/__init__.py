from .knowledge import router as knowledge_router
from .tasks import router as tasks_router
from .decisions import router as decisions_router
from .analytics import router as analytics_router
from .automation import router as automation_router
from .intent import router as intent_router
from .constraints import router as constraints_router

__all__ = [
    "knowledge_router",
    "tasks_router",
    "decisions_router",
    "analytics_router",
    "automation_router",
    "intent_router",
    "constraints_router"
]
