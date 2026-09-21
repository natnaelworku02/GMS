"""add vehicle-first proformas and inventory movements

Revision ID: c2f6a18d4b77
Revises: b9e7c42a10f1
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c2f6a18d4b77"
down_revision: Union[str, Sequence[str], None] = "b9e7c42a10f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("performas", sa.Column("vehicle_id", sa.Uuid(), nullable=True))
    op.add_column("performas", sa.Column("series_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_performas_vehicle", "performas", "vehicles", ["vehicle_id"], ["id"])
    op.execute("UPDATE performas SET vehicle_id = job_cards.vehicle_id FROM job_cards WHERE performas.job_card_id = job_cards.id")
    op.execute("UPDATE performas SET series_id = id")
    op.alter_column("performas", "vehicle_id", nullable=False)
    op.alter_column("performas", "series_id", nullable=False)
    op.alter_column("performas", "job_card_id", nullable=True)
    op.create_index("ix_performas_series_id", "performas", ["series_id"])

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("store_location_id", sa.Uuid(), nullable=False),
        sa.Column("job_card_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("movement_type", sa.String(length=30), nullable=False),
        sa.Column("quantity_change", sa.Integer(), nullable=False),
        sa.Column("quantity_before", sa.Integer(), nullable=False),
        sa.Column("quantity_after", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["store_location_id"], ["store_locations.id"]),
        sa.ForeignKeyConstraint(["job_card_id"], ["job_cards.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("inventory_movements")
    op.drop_index("ix_performas_series_id", table_name="performas")
    op.drop_constraint("fk_performas_vehicle", "performas", type_="foreignkey")
    op.drop_column("performas", "series_id")
    op.drop_column("performas", "vehicle_id")
    op.alter_column("performas", "job_card_id", nullable=False)
