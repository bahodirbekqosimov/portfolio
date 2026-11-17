"""add profile image and bio

Revision ID: 3b7c1d9e4f2a
Revises: e85205f81deb
"""

from alembic import op
import sqlalchemy as sa
import app.models.base


revision = '3b7c1d9e4f2a'
down_revision = 'e85205f81deb'
branch_labels = None
depends_on = None


def _singleton_columns() -> list:
    return [
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=False, nullable=False),
        sa.Column('created_at', app.models.base.UTCDateTime(timezone=True), nullable=False),
        sa.Column('updated_at', app.models.base.UTCDateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table('profile_images',
    sa.Column('file', sa.String(length=255), nullable=False),
    *_singleton_columns(),
    sa.CheckConstraint('id = 1', name=op.f('ck_profile_images_single_row')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_profile_images'))
    )
    op.create_table('bios',
    sa.Column('content', sa.Text(), nullable=False),
    *_singleton_columns(),
    sa.CheckConstraint('id = 1', name=op.f('ck_bios_single_row')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_bios'))
    )


def downgrade() -> None:
    op.drop_table('bios')
    op.drop_table('profile_images')
