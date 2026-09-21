"""add job card inventory usage table

Revision ID: 8d2f0f3c1a9b
Revises: 467ce28edcf1
Create Date: 2026-08-19 13:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d2f0f3c1a9b"
down_revision: Union[str, Sequence[str], None] = "467ce28edcf1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "job_card_inventory_usage",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_card_id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("store_location_id", sa.Uuid(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_card_id"], ["job_cards.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("job_card_inventory_usage")
