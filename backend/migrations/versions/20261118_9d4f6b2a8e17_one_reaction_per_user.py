"""one reaction per user per post

Revision ID: 9d4f6b2a8e17
Revises: 7c2e9a41d5b3
"""

from alembic import op


revision = '9d4f6b2a8e17'
down_revision = '7c2e9a41d5b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Avval bir foydalanuvchining bir postdagi ortiqcha reaksiyalarini o'chiramiz: eng oxirgisi qoladi.
    op.execute(
        """
        DELETE FROM reactions
        WHERE id NOT IN (
            SELECT MAX(id) FROM reactions GROUP BY post_id, user_id
        )
        """
    )
    with op.batch_alter_table('reactions', schema=None) as batch_op:
        batch_op.drop_constraint('uq_reactions_post_id', type_='unique')
        batch_op.create_unique_constraint('uq_reactions_post_user', ['post_id', 'user_id'])


def downgrade() -> None:
    with op.batch_alter_table('reactions', schema=None) as batch_op:
        batch_op.drop_constraint('uq_reactions_post_user', type_='unique')
        batch_op.create_unique_constraint('uq_reactions_post_id', ['post_id', 'user_id', 'emoji_id'])
