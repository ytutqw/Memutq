"""add image fields to cards

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cards', sa.Column('front_image', sa.String(255), nullable=True))
    op.add_column('cards', sa.Column('back_image', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('cards', 'back_image')
    op.drop_column('cards', 'front_image')