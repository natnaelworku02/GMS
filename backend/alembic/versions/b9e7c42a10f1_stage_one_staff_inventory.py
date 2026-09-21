"""add stage one staff and inventory classifications

Revision ID: b9e7c42a10f1
Revises: 8d2f0f3c1a9b
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b9e7c42a10f1"
down_revision: Union[str, Sequence[str], None] = "8d2f0f3c1a9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("work_category", sa.String(length=40), nullable=True))
    op.execute("""UPDATE employees SET work_category = CASE
        WHEN lower(job_title) LIKE '%electric%' THEN 'auto_electrician'
        WHEN lower(job_title) LIKE '%paint%' THEN 'painter'
        WHEN lower(job_title) LIKE '%strip%' OR lower(job_title) LIKE '%dismant%' THEN 'strip_and_fit'
        WHEN lower(job_title) LIKE '%bat lamera%' THEN 'bat_lamera'
        ELSE 'mechanic' END""")
    op.alter_column("employees", "work_category", nullable=False)
    op.add_column("job_card_mechanics", sa.Column("work_category", sa.String(length=40), nullable=True))
    op.execute("UPDATE job_card_mechanics SET work_category = 'mechanic'")
    op.alter_column("job_card_mechanics", "work_category", nullable=False)
    op.add_column("inventory_items", sa.Column("condition", sa.String(length=10), nullable=True))
    op.add_column("inventory_items", sa.Column("origin", sa.String(length=20), nullable=True))
    op.execute("UPDATE inventory_items SET condition = 'new', origin = 'original'")
    op.alter_column("inventory_items", "condition", nullable=False)
    op.alter_column("inventory_items", "origin", nullable=False)


def downgrade() -> None:
    op.drop_column("inventory_items", "origin")
    op.drop_column("inventory_items", "condition")
    op.drop_column("job_card_mechanics", "work_category")
    op.drop_column("employees", "work_category")
