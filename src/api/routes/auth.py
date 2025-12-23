"""
Authentication API Routes

Handles:
- User registration and login
- Organization management
- Team management
- Member invitations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.services.auth import (
    auth_service,
    get_current_user,
    get_current_user_optional,
    require_role,
)
from src.services.auth.dependencies import CurrentUser
from src.services.auth.schemas import (
    UserCreate, UserLogin, UserResponse, UserUpdate, TokenResponse,
    OrganizationCreate, OrganizationResponse, OrganizationUpdate, OrganizationWithRole,
    TeamCreate, TeamResponse, TeamWithMembers,
    InviteCreate, InviteResponse, InviteAccept,
    MemberRoleUpdate, UserWithRole,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# =============================================================================
# AUTHENTICATION
# =============================================================================

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    session: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    try:
        user = await auth_service.create_user(
            session, 
            email=data.email, 
            password=data.password, 
            name=data.name
        )
        await session.commit()
        
        access_token, expires_in = auth_service.create_access_token(user.id)
        refresh_token = auth_service.create_refresh_token(user.id)
        
        return TokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_db)
):
    """Login with email and password."""
    user = await auth_service.authenticate_user(session, data.email, data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    await session.commit()
    
    access_token, expires_in = auth_service.create_access_token(
        user.id, 
        org_id=user.current_org_id
    )
    refresh_token = auth_service.create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user.user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    user = current_user.user
    
    if data.name is not None:
        user.name = data.name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.notification_preferences is not None:
        user.notification_preferences = data.notification_preferences
    if data.dashboard_layout is not None:
        user.dashboard_layout = data.dashboard_layout
    
    await session.commit()
    return UserResponse.model_validate(user)


@router.post("/switch-org/{org_id}", response_model=TokenResponse)
async def switch_organization(
    org_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Switch to a different organization and get new token."""
    # Verify user has access to org
    role = await auth_service.get_user_role_in_org(session, current_user.id, org_id)
    if not role:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    # Update user's current org
    current_user.user.current_org_id = org_id
    await session.commit()
    
    # Create new token with org context
    access_token, expires_in = auth_service.create_access_token(current_user.id, org_id)
    
    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(current_user.user)
    )


# =============================================================================
# ORGANIZATIONS
# =============================================================================

@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Create a new organization."""
    try:
        org = await auth_service.create_organization(
            session,
            name=data.name,
            slug=data.slug,
            owner_id=current_user.id,
            description=data.description
        )
        await session.commit()
        return OrganizationResponse.model_validate(org)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/organizations", response_model=List[OrganizationWithRole])
async def list_my_organizations(
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all organizations the current user belongs to."""
    orgs = await auth_service.get_user_organizations(session, current_user.id)
    
    result = []
    for org, role in orgs:
        org_dict = {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "logo_url": org.logo_url,
            "plan": org.plan,
            "max_users": org.max_users,
            "max_teams": org.max_teams,
            "is_active": org.is_active,
            "created_at": org.created_at,
            "role": role,
        }
        result.append(OrganizationWithRole(**org_dict))
    
    return result


@router.get("/organizations/{org_id}", response_model=OrganizationWithRole)
async def get_organization(
    org_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get organization details."""
    role = await auth_service.get_user_role_in_org(session, current_user.id, org_id)
    if not role:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    org = await auth_service.get_organization_by_id(session, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org_dict = {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "logo_url": org.logo_url,
        "plan": org.plan,
        "max_users": org.max_users,
        "max_teams": org.max_teams,
        "is_active": org.is_active,
        "created_at": org.created_at,
        "role": role,
    }
    return OrganizationWithRole(**org_dict)


@router.get("/organizations/{org_id}/members", response_model=List[UserWithRole])
async def list_organization_members(
    org_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all members of an organization."""
    role = await auth_service.get_user_role_in_org(session, current_user.id, org_id)
    if not role:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    members = await auth_service.get_organization_members(session, org_id)
    
    result = []
    for user, member_role, joined_at in members:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "is_email_verified": user.is_email_verified,
            "github_username": user.github_username,
            "slack_username": user.slack_username,
            "current_org_id": user.current_org_id,
            "current_team_id": user.current_team_id,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "role": member_role,
            "joined_at": joined_at,
        }
        result.append(UserWithRole(**user_dict))
    
    return result


@router.patch("/organizations/{org_id}/members/{user_id}/role")
async def update_member_role(
    org_id: str,
    user_id: str,
    data: MemberRoleUpdate,
    current_user: CurrentUser = Depends(require_role(["owner", "admin"])),
    session: AsyncSession = Depends(get_db)
):
    """Update a member's role (admin only)."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Wrong organization context")
    
    try:
        await auth_service.update_member_role(session, org_id, user_id, data.role)
        await session.commit()
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/organizations/{org_id}/members/{user_id}")
async def remove_member(
    org_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_role(["owner", "admin"])),
    session: AsyncSession = Depends(get_db)
):
    """Remove a member from the organization (admin only)."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Wrong organization context")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    success = await auth_service.remove_member(session, org_id, user_id)
    await session.commit()
    
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"success": True}


# =============================================================================
# TEAMS
# =============================================================================

@router.get("/organizations/{org_id}/teams", response_model=List[TeamResponse])
async def list_teams(
    org_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all teams in an organization."""
    role = await auth_service.get_user_role_in_org(session, current_user.id, org_id)
    if not role:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    teams = await auth_service.get_organization_teams(session, org_id)
    return [TeamResponse.model_validate(t) for t in teams]


@router.post("/organizations/{org_id}/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    org_id: str,
    data: TeamCreate,
    current_user: CurrentUser = Depends(require_role(["owner", "admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    """Create a new team (manager+ only)."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Wrong organization context")
    
    team = await auth_service.create_team(
        session,
        org_id=org_id,
        name=data.name,
        slug=data.slug,
        creator_id=current_user.id,
        description=data.description
    )
    await session.commit()
    return TeamResponse.model_validate(team)


@router.post("/organizations/{org_id}/teams/{team_id}/members/{user_id}")
async def add_team_member(
    org_id: str,
    team_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(require_role(["owner", "admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    """Add a user to a team."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Wrong organization context")
    
    try:
        await auth_service.add_user_to_team(session, user_id, team_id)
        await session.commit()
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# INVITATIONS
# =============================================================================

@router.post("/organizations/{org_id}/invites", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    org_id: str,
    data: InviteCreate,
    current_user: CurrentUser = Depends(require_role(["owner", "admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    """Invite a user to the organization."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Wrong organization context")
    
    try:
        invite = await auth_service.create_invite(
            session,
            email=data.email,
            org_id=org_id,
            invited_by=current_user.id,
            role=data.role,
            team_id=data.team_id
        )
        await session.commit()
        return InviteResponse.model_validate(invite)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invites/accept", response_model=TokenResponse)
async def accept_invite(
    data: InviteAccept,
    session: AsyncSession = Depends(get_db)
):
    """Accept an invitation and create account."""
    try:
        user, org = await auth_service.accept_invite(
            session,
            token=data.token,
            name=data.name,
            password=data.password
        )
        await session.commit()
        
        access_token, expires_in = auth_service.create_access_token(user.id, org.id)
        refresh_token = auth_service.create_refresh_token(user.id)
        
        return TokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

