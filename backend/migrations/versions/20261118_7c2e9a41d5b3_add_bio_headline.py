"""add bio headline

Revision ID: 7c2e9a41d5b3
Revises: 3b7c1d9e4f2a
"""

from alembic import op
import sqlalchemy as sa


revision = '7c2e9a41d5b3'
down_revision = '3b7c1d9e4f2a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('bios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('headline', sa.String(length=120), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('bios', schema=None) as batch_op:
        batch_op.drop_column('headline')
