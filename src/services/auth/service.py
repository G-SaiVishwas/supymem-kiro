import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
import uuid

from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import User, Organization, OrganizationMember, Team, TeamMember, Invite
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = settings.secret_key
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30


class AuthService:
    """Authentication and user management service."""

    # =========================================================================
    # PASSWORD UTILITIES
    # =========================================================================

    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    # =========================================================================
    # JWT TOKEN UTILITIES
    # =========================================================================

    def create_access_token(self, user_id: str, org_id: Optional[str] = None) -> Tuple[str, int]:
        """Create a JWT access token."""
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": user_id,
            "org_id": org_id,
            "exp": expire,
            "type": "access"
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token, int(expires_delta.total_seconds())

    def create_refresh_token(self, user_id: str) -> str:
        """Create a refresh token."""
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh"
        }
        
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError as e:
            logger.warning("Token decode failed", error=str(e))
            return None

    # =========================================================================
    # USER OPERATIONS
    # =========================================================================

    async def create_user(
        self,
        session: AsyncSession,
        email: str,
        password: str,
        name: str
    ) -> User:
        """Create a new user."""
        # Check if user exists
        existing = await session.execute(
            select(User).where(User.email == email)
        )
        if existing.scalar_one_or_none():
            raise ValueError("User with this email already exists")

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=self.hash_password(password),
            name=name,
            is_email_verified=True,  # Skip email verification for now
        )
        session.add(user)
        await session.flush()
        
        logger.info("User created", user_id=user.id, email=email)
        return user

    async def authenticate_user(
        self,
        session: AsyncSession,
        email: str,
        password: str
    ) -> Optional[User]:
        """Authenticate a user with email and password."""
        result = await session.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.password_hash:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await session.flush()
        
        return user

    async def get_user_by_id(self, session: AsyncSession, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_email(self, session: AsyncSession, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    # =========================================================================
    # ORGANIZATION OPERATIONS
    # =========================================================================

    async def create_organization(
        self,
        session: AsyncSession,
        name: str,
        slug: str,
        owner_id: str,
        description: Optional[str] = None
    ) -> Organization:
        """Create a new organization with the creator as owner."""
        # Check slug uniqueness
        existing = await session.execute(
            select(Organization).where(Organization.slug == slug)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Organization with this slug already exists")

        # Create organization
        org = Organization(
            id=str(uuid.uuid4()),
            name=name,
            slug=slug,
            description=description,
        )
        session.add(org)
        await session.flush()

        # Add creator as owner
        membership = OrganizationMember(
            id=str(uuid.uuid4()),
            user_id=owner_id,
            organization_id=org.id,
            role="owner",
        )
        session.add(membership)

        # Create default team
        default_team = Team(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            name="General",
            slug="general",
            description="Default team for all members",
            is_default=True,
        )
        session.add(default_team)
        await session.flush()

        # Add owner to default team
        team_member = TeamMember(
            id=str(uuid.uuid4()),
            user_id=owner_id,
            team_id=default_team.id,
            role="admin",
        )
        session.add(team_member)

        # Update user's current org
        user = await self.get_user_by_id(session, owner_id)
        if user:
            user.current_org_id = org.id
            user.current_team_id = default_team.id

        await session.flush()
        
        logger.info("Organization created", org_id=org.id, owner_id=owner_id)
        return org

    async def get_user_organizations(
        self,
        session: AsyncSession,
        user_id: str
    ) -> list:
        """Get all organizations a user belongs to."""
        result = await session.execute(
            select(Organization, OrganizationMember.role)
            .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
            .where(OrganizationMember.user_id == user_id)
            .where(Organization.is_active == True)
        )
        return result.all()

    async def get_organization_by_id(
        self,
        session: AsyncSession,
        org_id: str
    ) -> Optional[Organization]:
        """Get an organization by ID."""
        result = await session.execute(
            select(Organization).where(Organization.id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_organization_by_slug(
        self,
        session: AsyncSession,
        slug: str
    ) -> Optional[Organization]:
        """Get an organization by slug."""
        result = await session.execute(
            select(Organization).where(Organization.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_user_role_in_org(
        self,
        session: AsyncSession,
        user_id: str,
        org_id: str
    ) -> Optional[str]:
        """Get a user's role in an organization."""
        result = await session.execute(
            select(OrganizationMember.role)
            .where(
                OrganizationMember.user_id == user_id,
                OrganizationMember.organization_id == org_id
            )
        )
        row = result.scalar_one_or_none()
        return row if row else None

    async def get_organization_members(
        self,
        session: AsyncSession,
        org_id: str
    ) -> list:
        """Get all members of an organization."""
        result = await session.execute(
            select(User, OrganizationMember.role, OrganizationMember.joined_at)
            .join(OrganizationMember, User.id == OrganizationMember.user_id)
            .where(OrganizationMember.organization_id == org_id)
            .where(User.is_active == True)
        )
        return result.all()

    # =========================================================================
    # TEAM OPERATIONS
    # =========================================================================

    async def create_team(
        self,
        session: AsyncSession,
        org_id: str,
        name: str,
        slug: str,
        creator_id: str,
        description: Optional[str] = None
    ) -> Team:
        """Create a new team within an organization."""
        team = Team(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name=name,
            slug=slug,
            description=description,
        )
        session.add(team)
        await session.flush()

        # Add creator as team admin
        team_member = TeamMember(
            id=str(uuid.uuid4()),
            user_id=creator_id,
            team_id=team.id,
            role="admin",
        )
        session.add(team_member)
        await session.flush()

        logger.info("Team created", team_id=team.id, org_id=org_id)
        return team

    async def get_organization_teams(
        self,
        session: AsyncSession,
        org_id: str
    ) -> list:
        """Get all teams in an organization."""
        result = await session.execute(
            select(Team)
            .where(Team.organization_id == org_id)
            .order_by(Team.name)
        )
        return result.scalars().all()

    async def get_user_teams(
        self,
        session: AsyncSession,
        user_id: str,
        org_id: str
    ) -> list:
        """Get all teams a user belongs to in an organization."""
        result = await session.execute(
            select(Team, TeamMember.role)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(TeamMember.user_id == user_id)
            .where(Team.organization_id == org_id)
        )
        return result.all()

    async def add_user_to_team(
        self,
        session: AsyncSession,
        user_id: str,
        team_id: str,
        role: str = "member"
    ) -> TeamMember:
        """Add a user to a team."""
        # Check if already a member
        existing = await session.execute(
            select(TeamMember)
            .where(TeamMember.user_id == user_id, TeamMember.team_id == team_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("User is already a member of this team")

        member = TeamMember(
            id=str(uuid.uuid4()),
            user_id=user_id,
            team_id=team_id,
            role=role,
        )
        session.add(member)
        await session.flush()
        return member

    # =========================================================================
    # INVITE OPERATIONS
    # =========================================================================

    async def create_invite(
        self,
        session: AsyncSession,
        email: str,
        org_id: str,
        invited_by: str,
        role: str = "member",
        team_id: Optional[str] = None
    ) -> Invite:
        """Create an invitation to join an organization."""
        # Check if user already exists in org
        existing_user = await self.get_user_by_email(session, email)
        if existing_user:
            existing_membership = await session.execute(
                select(OrganizationMember)
                .where(
                    OrganizationMember.user_id == existing_user.id,
                    OrganizationMember.organization_id == org_id
                )
            )
            if existing_membership.scalar_one_or_none():
                raise ValueError("User is already a member of this organization")

        # Check for pending invite
        existing_invite = await session.execute(
            select(Invite)
            .where(
                Invite.email == email,
                Invite.organization_id == org_id,
                Invite.status == "pending"
            )
        )
        if existing_invite.scalar_one_or_none():
            raise ValueError("An invite for this email is already pending")

        invite = Invite(
            id=str(uuid.uuid4()),
            email=email,
            organization_id=org_id,
            team_id=team_id,
            role=role,
            token=secrets.token_urlsafe(32),
            invited_by=invited_by,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        session.add(invite)
        await session.flush()

        logger.info("Invite created", invite_id=invite.id, email=email, org_id=org_id)
        return invite

    async def accept_invite(
        self,
        session: AsyncSession,
        token: str,
        name: str,
        password: str
    ) -> Tuple[User, Organization]:
        """Accept an invitation and create/update user."""
        # Find invite
        result = await session.execute(
            select(Invite)
            .where(Invite.token == token, Invite.status == "pending")
        )
        invite = result.scalar_one_or_none()
        
        if not invite:
            raise ValueError("Invalid or expired invitation")
        
        if invite.expires_at < datetime.utcnow():
            invite.status = "expired"
            await session.flush()
            raise ValueError("Invitation has expired")

        # Get or create user
        user = await self.get_user_by_email(session, invite.email)
        if not user:
            user = await self.create_user(session, invite.email, password, name)
        elif not user.password_hash:
            user.password_hash = self.hash_password(password)
            user.name = name

        # Add to organization
        org_member = OrganizationMember(
            id=str(uuid.uuid4()),
            user_id=user.id,
            organization_id=invite.organization_id,
            role=invite.role,
            invited_by=invite.invited_by,
        )
        session.add(org_member)

        # Add to team if specified
        if invite.team_id:
            team_member = TeamMember(
                id=str(uuid.uuid4()),
                user_id=user.id,
                team_id=invite.team_id,
                role="member",
            )
            session.add(team_member)
        else:
            # Add to default team
            default_team = await session.execute(
                select(Team)
                .where(Team.organization_id == invite.organization_id, Team.is_default == True)
            )
            team = default_team.scalar_one_or_none()
            if team:
                team_member = TeamMember(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    team_id=team.id,
                    role="member",
                )
                session.add(team_member)

        # Update invite status
        invite.status = "accepted"
        invite.accepted_at = datetime.utcnow()

        # Set user's current org
        user.current_org_id = invite.organization_id

        await session.flush()

        # Get organization
        org = await self.get_organization_by_id(session, invite.organization_id)

        logger.info("Invite accepted", user_id=user.id, org_id=invite.organization_id)
        return user, org

    # =========================================================================
    # MEMBER MANAGEMENT
    # =========================================================================

    async def update_member_role(
        self,
        session: AsyncSession,
        org_id: str,
        user_id: str,
        new_role: str
    ) -> OrganizationMember:
        """Update a member's role in an organization."""
        result = await session.execute(
            select(OrganizationMember)
            .where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        
        if not member:
            raise ValueError("Member not found")
        
        member.role = new_role
        await session.flush()
        return member

    async def remove_member(
        self,
        session: AsyncSession,
        org_id: str,
        user_id: str
    ) -> bool:
        """Remove a member from an organization."""
        # Remove from all teams in org
        teams = await self.get_organization_teams(session, org_id)
        for team in teams:
            await session.execute(
                select(TeamMember)
                .where(TeamMember.team_id == team.id, TeamMember.user_id == user_id)
            )
        
        # Remove from org
        result = await session.execute(
            select(OrganizationMember)
            .where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        
        if member:
            await session.delete(member)
            await session.flush()
            return True
        return False


# Singleton instance
auth_service = AuthService()

