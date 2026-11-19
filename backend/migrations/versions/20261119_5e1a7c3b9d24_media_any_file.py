"""blog media: video, audio and any file (kind, mime, size, original_name)

Revision ID: 5e1a7c3b9d24
Revises: 9d4f6b2a8e17
"""

from alembic import op
import sqlalchemy as sa


revision = '5e1a7c3b9d24'
down_revision = '9d4f6b2a8e17'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('media', schema=None) as batch_op:
        batch_op.add_column(sa.Column('kind', sa.String(length=10), server_default='image', nullable=False))
        batch_op.add_column(sa.Column('mime', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('size', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('original_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('media', schema=None) as batch_op:
        batch_op.drop_column('original_name')
        batch_op.drop_column('size')
        batch_op.drop_column('mime')
        batch_op.drop_column('kind')
