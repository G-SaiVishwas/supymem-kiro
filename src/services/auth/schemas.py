from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    notification_preferences: Optional[dict] = None
    dashboard_layout: Optional[dict] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    is_email_verified: bool = False
    github_username: Optional[str] = None
    slack_username: Optional[str] = None
    current_org_id: Optional[str] = None
    current_team_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithRole(UserResponse):
    role: str
    joined_at: datetime


# ============================================================================
# AUTH SCHEMAS
# ============================================================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


# ============================================================================
# ORGANIZATION SCHEMAS
# ============================================================================

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None
    allowed_domains: Optional[List[str]] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    plan: str = "free"
    max_users: int
    max_teams: int
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationWithRole(OrganizationResponse):
    role: str
    member_count: Optional[int] = None
    team_count: Optional[int] = None


# ============================================================================
# TEAM SCHEMAS
# ============================================================================

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None


class TeamResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    description: Optional[str] = None
    is_default: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TeamWithMembers(TeamResponse):
    member_count: int = 0
    members: Optional[List[UserWithRole]] = None


# ============================================================================
# INVITE SCHEMAS
# ============================================================================

class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "member"
    team_id: Optional[str] = None


class InviteResponse(BaseModel):
    id: str
    email: str
    organization_id: str
    team_id: Optional[str] = None
    role: str
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class InviteAccept(BaseModel):
    token: str
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)


# ============================================================================
# MEMBER MANAGEMENT SCHEMAS
# ============================================================================

class MemberRoleUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(owner|admin|manager|member|viewer)$")


class MemberRemove(BaseModel):
    user_id: str

