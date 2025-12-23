from typing import Optional, List
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.database.models import User
from .service import auth_service

# Security scheme
security = HTTPBearer(auto_error=False)


class CurrentUser:
    """Container for current user and their context."""
    def __init__(
        self,
        user: User,
        org_id: Optional[str] = None,
        role: Optional[str] = None
    ):
        self.user = user
        self.org_id = org_id
        self.role = role
        
    @property
    def id(self) -> str:
        return self.user.id
    
    @property
    def email(self) -> str:
        return self.user.email
    
    @property
    def name(self) -> str:
        return self.user.name
    
    def has_role(self, required_roles: List[str]) -> bool:
        """Check if user has any of the required roles."""
        return self.role in required_roles
    
    def is_admin(self) -> bool:
        """Check if user is admin or owner."""
        return self.role in ["owner", "admin"]
    
    def can_manage_members(self) -> bool:
        """Check if user can manage team members."""
        return self.role in ["owner", "admin", "manager"]


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> CurrentUser:
    """Get the current authenticated user. Raises 401 if not authenticated."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    
    user = await auth_service.get_user_by_id(session, user_id)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get role in current org if org_id is set
    role = None
    if org_id:
        role = await auth_service.get_user_role_in_org(session, user_id, org_id)
    
    return CurrentUser(user=user, org_id=org_id, role=role)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> Optional[CurrentUser]:
    """Get the current user if authenticated, None otherwise."""
    
    if not credentials:
        return None
    
    try:
        return await get_current_user(request, credentials, session)
    except HTTPException:
        return None


def require_role(required_roles: List[str]):
    """Dependency factory that requires specific roles."""
    
    async def role_checker(
        current_user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No organization context. Please select an organization.",
            )
        
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(required_roles)}",
            )
        
        return current_user
    
    return role_checker


def require_org_admin():
    """Require owner or admin role."""
    return require_role(["owner", "admin"])


def require_org_manager():
    """Require owner, admin, or manager role."""
    return require_role(["owner", "admin", "manager"])


def require_org_member():
    """Require at least member role (not viewer)."""
    return require_role(["owner", "admin", "manager", "member"])

