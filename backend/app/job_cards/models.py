import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class JobStatus(str, PyEnum):
    PENDING_INSPECTION = "pending_inspection"
    WAITING_FOR_APPROVAL = "waiting_for_approval"
    IN_REPAIR = "in_repair"
    WAITING_FOR_PARTS = "waiting_for_parts"
    READY_FOR_TESTING = "ready_for_testing"
    COMPLETED = "completed"


class PartName(str, PyEnum):
    TRUNK = "trunk"
    LH_BODY = "lh_body"
    RH_BODY = "rh_body"
    INTERIOR = "interior"
    FRONT_BODY = "front_body"
    PERIPHERAL = "peripheral"


class ConditionState(str, PyEnum):
    AVAILABLE = "available"
    DAMAGED = "damaged"
    NOT_AVAILABLE = "not_available"
    SCRATCH = "scratch"
    BROKEN = "broken"
    CRACK = "crack"
    DENT = "dent"
    BEND = "bend"


job_card_mechanics = Table(
    "job_card_mechanics",
    Base.metadata,
    Column("job_card_id", Uuid, ForeignKey("job_cards.id"), primary_key=True),
    Column("employee_id", Uuid, ForeignKey("employees.id"), primary_key=True),
)


class Owner(Base):
    __tablename__ = "owners"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="owner")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("owners.id"), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    engine_number: Mapped[str] = mapped_column(String(50), nullable=False)
    chassis_number: Mapped[str] = mapped_column(String(50), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["Owner"] = relationship(back_populates="vehicles")


class JobCard(Base):
    __tablename__ = "job_cards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("vehicles.id"), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("owners.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=JobStatus.PENDING_INSPECTION.value, nullable=False)
    mileage_km: Mapped[int] = mapped_column(Integer, nullable=False)
    private_paint: Mapped[bool] = mapped_column(Boolean, default=False)
    private_mechanic: Mapped[bool] = mapped_column(Boolean, default=False)
    insurance_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_materials: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    vehicle: Mapped["Vehicle"] = relationship()
    owner: Mapped["Owner"] = relationship()
    mechanics: Mapped[list] = relationship("Employee", secondary=job_card_mechanics)
    conditions: Mapped[list["VehicleCondition"]] = relationship(back_populates="job_card", cascade="all, delete-orphan")


class VehicleCondition(Base):
    __tablename__ = "vehicle_conditions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("job_cards.id"), nullable=False)
    part_name: Mapped[str] = mapped_column(String(30), nullable=False)
    condition_state: Mapped[str] = mapped_column(String(20), nullable=False)

    job_card: Mapped["JobCard"] = relationship(back_populates="conditions")

    __table_args__ = (
        UniqueConstraint("job_card_id", "part_name", name="uq_jobcard_part"),
    )
