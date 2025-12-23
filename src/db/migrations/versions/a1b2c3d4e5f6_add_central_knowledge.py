"""Add central knowledge table

Revision ID: a1b2c3d4e5f6
Revises: 13cb694df246
Create Date: 2025-12-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '13cb694df246'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create central_knowledge table."""
    op.create_table('central_knowledge',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, default='draft'),
        sa.Column('version', sa.Integer(), nullable=True, default=1),
        sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=768), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('last_edited_by', sa.String(length=36), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('related_documents', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['last_edited_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_central_knowledge_org', 'central_knowledge', ['organization_id'], unique=False)
    op.create_index('idx_central_knowledge_team', 'central_knowledge', ['team_id'], unique=False)
    op.create_index('idx_central_knowledge_status', 'central_knowledge', ['status'], unique=False)
    op.create_index('idx_central_knowledge_category', 'central_knowledge', ['category'], unique=False)
    op.create_index('idx_central_knowledge_created', 'central_knowledge', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop central_knowledge table."""
    op.drop_index('idx_central_knowledge_created', table_name='central_knowledge')
    op.drop_index('idx_central_knowledge_category', table_name='central_knowledge')
    op.drop_index('idx_central_knowledge_status', table_name='central_knowledge')
    op.drop_index('idx_central_knowledge_team', table_name='central_knowledge')
    op.drop_index('idx_central_knowledge_org', table_name='central_knowledge')
    op.drop_table('central_knowledge')

