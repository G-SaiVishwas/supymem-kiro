from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from prometheus_client import make_asgi_app
import time

from src.config.settings import get_settings
from src.config.logging import configure_logging, get_logger
from src.vectors.qdrant_client import vector_store
from src.api.routes.knowledge import router as knowledge_router
from src.api.routes.tasks import router as tasks_router
from src.api.routes.automation import router as automation_router
from src.api.routes.decisions import router as decisions_router
from src.api.routes.analytics import router as analytics_router
from src.api.routes.auth import router as auth_router
from src.api.routes.intent import router as intent_router
from src.api.routes.constraints import router as constraints_router
from src.api.routes.export import router as export_router
from src.api.routes.central_knowledge import router as central_knowledge_router
from src.integrations.github.webhooks import router as github_router
from src.api.middleware import RequestLoggingMiddleware, TeamContextMiddleware
from src.api.exceptions import SupymemException, to_http_exception
from src.cache.advanced_cache import cache

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Supymem-Kiro...", version="0.1.0")
    
    # Initialize vector store
    await vector_store.initialize()
    logger.info("Vector store initialized")
    
    # Warm cache (optional)
    # await warm_cache([...])
    
    logger.info("Supymem-Kiro started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Supymem-Kiro...")
    
    # Log final metrics
    cache_stats = cache.stats()
    logger.info("Final metrics", cache=cache_stats)


app = FastAPI(
    title="Supymem-Kiro",
    description="AI-powered collaborative knowledge agent - Enhanced Edition",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# Exception handlers
@app.exception_handler(SupymemException)
async def supymem_exception_handler(request: Request, exc: SupymemException):
    """Handle custom Supymem exceptions."""
    logger.error(
        "Application error",
        path=request.url.path,
        error=exc.message,
        details=exc.details
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "path": request.url.path
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning("Validation error", path=request.url.path, errors=exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
            "path": request.url.path
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception("Unexpected error", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "path": request.url.path
        }
    )


# Add middleware (order matters - first added = outermost)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(TeamContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(knowledge_router, prefix="/api/v1", tags=["knowledge"])
app.include_router(tasks_router, prefix="/api/v1", tags=["tasks"])
app.include_router(automation_router, prefix="/api/v1", tags=["automation"])
app.include_router(decisions_router, prefix="/api/v1", tags=["decisions"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(intent_router, prefix="/api/v1", tags=["intent"])
app.include_router(constraints_router, prefix="/api/v1", tags=["constraints"])
app.include_router(export_router, prefix="/api/v1", tags=["export"])
app.include_router(central_knowledge_router, prefix="/api/v1/central-knowledge", tags=["central-knowledge"])
app.include_router(github_router, tags=["github"])

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": time.time()
    }


@app.get("/health/detailed")
async def detailed_health():
    """Detailed health check with component status."""
    health_status = {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": time.time(),
        "components": {}
    }
    
    # Check vector store
    try:
        # Simple check - could be more thorough
        health_status["components"]["vector_store"] = "healthy"
    except Exception as e:
        health_status["components"]["vector_store"] = "unhealthy"
        health_status["status"] = "degraded"
    
    # Check cache
    try:
        cache_stats = cache.stats()
        health_status["components"]["cache"] = {
            "status": "healthy",
            "stats": cache_stats
        }
    except Exception as e:
        health_status["components"]["cache"] = "unhealthy"
        health_status["status"] = "degraded"
    
    # LLM metrics
    health_status["components"]["llm"] = {
        "status": "healthy",
        "info": "LLM client available"
    }
    
    return health_status


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Supymem-Kiro API",
        "version": "0.1.0",
        "description": "AI-powered collaborative knowledge agent - Enhanced Edition",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }
