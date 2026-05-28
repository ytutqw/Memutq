"""add sharing fields to decks

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('decks', sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('decks', sa.Column('share_token', sa.String(64), nullable=True, unique=True))


def downgrade() -> None:
    op.drop_column('decks', 'share_token')
    op.drop_column('decks', 'is_public')