import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class StoreLocation(Base):
    __tablename__ = "store_locations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    part_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicable_vehicle_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    supplier_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    min_stock_threshold: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    stock_entries: Mapped[list["StockEntry"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class StockEntry(Base):
    __tablename__ = "stock_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("inventory_items.id"), nullable=False)
    store_location_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("store_locations.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    item: Mapped["InventoryItem"] = relationship(back_populates="stock_entries")
    store_location: Mapped["StoreLocation"] = relationship()

    __table_args__ = (
        UniqueConstraint("item_id", "store_location_id", name="uq_stock_item_location"),
    )
