"""
Custom exception classes for better error handling.
"""
from typing import Optional, Any
from fastapi import HTTPException, status


class SupymemException(Exception):
    """Base exception for Supymem."""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[dict] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(SupymemException):
    """Authentication failed."""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


class AuthorizationError(SupymemException):
    """User not authorized for this action."""
    
    def __init__(self, message: str = "Not authorized", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)


class ResourceNotFoundError(SupymemException):
    """Requested resource not found."""
    
    def __init__(self, resource: str, identifier: Any, details: Optional[dict] = None):
        message = f"{resource} with id '{identifier}' not found"
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)


class ValidationError(SupymemException):
    """Request validation failed."""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class ConflictError(SupymemException):
    """Resource conflict (e.g., duplicate)."""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status.HTTP_409_CONFLICT, details)


class RateLimitError(SupymemException):
    """Rate limit exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS, details)


class ServiceUnavailableError(SupymemException):
    """External service unavailable."""
    
    def __init__(self, service: str, details: Optional[dict] = None):
        message = f"Service '{service}' is currently unavailable"
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class LLMError(SupymemException):
    """LLM request failed."""
    
    def __init__(self, message: str = "LLM request failed", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class VectorStoreError(SupymemException):
    """Vector store operation failed."""
    
    def __init__(self, message: str = "Vector store error", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class DatabaseError(SupymemException):
    """Database operation failed."""
    
    def __init__(self, message: str = "Database error", details: Optional[dict] = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


def to_http_exception(exc: SupymemException) -> HTTPException:
    """Convert custom exception to FastAPI HTTPException."""
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "message": exc.message,
            "details": exc.details
        }
    )
