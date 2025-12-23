import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.config.logging import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and timing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Log request
        logger.info(
            "Request started",
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log response
        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )

        # Add timing header
        response.headers["X-Process-Time"] = str(round(duration_ms, 2))

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts: dict = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_minute = int(time.time() / 60)
        key = f"{client_ip}:{current_minute}"

        # Clean old entries
        old_keys = [k for k in self.request_counts if not k.endswith(f":{current_minute}")]
        for k in old_keys:
            del self.request_counts[k]

        # Check rate limit
        count = self.request_counts.get(key, 0)
        if count >= self.requests_per_minute:
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                requests=count,
            )
            return Response(
                content='{"detail": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
            )

        # Increment counter
        self.request_counts[key] = count + 1

        return await call_next(request)


class TeamContextMiddleware(BaseHTTPMiddleware):
    """Middleware to extract team context from headers or query params."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Try to get team_id from various sources
        team_id = (
            request.headers.get("X-Team-ID")
            or request.query_params.get("team_id")
            or "default"
        )

        # Store in request state for access in endpoints
        request.state.team_id = team_id

        return await call_next(request)
