import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Performa(Base):
    __tablename__ = "performas"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("job_cards.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    vat_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=15.0)
    vat_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    line_items: Mapped[list["PerformaLineItem"]] = relationship(back_populates="performa", cascade="all, delete-orphan")


class PerformaLineItem(Base):
    __tablename__ = "performa_line_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    performa_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("performas.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(15), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("inventory_items.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    performa: Mapped["Performa"] = relationship(back_populates="line_items")
