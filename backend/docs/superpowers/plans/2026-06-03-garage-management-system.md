# Garage Management System — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete FastAPI backend for a garage management system with auth, RBAC, job cards, performas, inventory, tools, HR, notifications, and audit logging.

**Architecture:** Modular monolith — single FastAPI app with domain modules (auth, hr, job_cards, performa, inventory, tools, notifications). Shared concerns (security, RBAC, audit, DB deps) live in `app/core/`. PostgreSQL for persistence, Redis for caching. Alembic for migrations.

**Tech Stack:** FastAPI, SQLAlchemy (async + asyncpg), PostgreSQL 17, Redis 7, Alembic, passlib[bcrypt], python-jose[cryptography], aiosmtplib, pydantic-settings

---

## File Structure

```
app/
├── core/
│   ├── __init__.py
│   ├── security.py        # JWT + password hashing
│   ├── rbac.py            # RequirePermission dependency
│   ├── audit.py           # create_audit_log helper
│   └── deps.py            # get_db, get_current_user
├── auth/
│   ├── __init__.py
│   ├── models.py          # User, Role, RolePermission, SystemSetting
│   ├── schemas.py         # Login/token/user/role schemas
│   ├── routes.py          # /auth, /roles, /settings endpoints
│   └── service.py         # Auth + role business logic
├── hr/
│   ├── __init__.py
│   ├── models.py          # Employee
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── job_cards/
│   ├── __init__.py
│   ├── models.py          # Owner, Vehicle, JobCard, JobCardMechanic, VehicleCondition
│   ├── schemas.py
│   ├── routes.py          # /job-cards, /owners, /vehicles
│   └── service.py         # State machine logic
├── performa/
│   ├── __init__.py
│   ├── models.py          # Performa, PerformaLineItem
│   ├── schemas.py
│   ├── routes.py
│   └── service.py         # VAT calc, PDF gen, email send
├── inventory/
│   ├── __init__.py
│   ├── models.py          # InventoryItem, StoreLocation, StockEntry
│   ├── schemas.py
│   ├── routes.py          # /inventory/items, /inventory/locations, /inventory/stock
│   └── service.py         # Stock deduction, threshold alerts
├── tools/
│   ├── __init__.py
│   ├── models.py          # Tool, ToolCheckout
│   ├── schemas.py
│   ├── routes.py
│   └── service.py         # Checkout/checkin, completion guard
├── notifications/
│   ├── __init__.py
│   ├── models.py          # Notification
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── audit/
│   ├── __init__.py
│   ├── models.py          # AuditLog
│   ├── schemas.py
│   └── routes.py          # Read-only list
├── config.py              # Modify: add JWT, SMTP, admin env vars
├── db.py                  # Modify: add get_db dependency, Base
└── main.py                # Modify: mount all routers
tests/
├── conftest.py            # Shared fixtures (async client, test DB, auth helpers)
├── test_auth.py
├── test_rbac.py
├── test_hr.py
├── test_job_cards.py
├── test_performa.py
├── test_inventory.py
├── test_tools.py
└── test_notifications.py
alembic/
├── env.py
├── versions/
└── alembic.ini
```

---

## Task 1: Install Dependencies & Configure Alembic

**Files:**
- Modify: `pyproject.toml`
- Modify: `app/config.py`
- Modify: `app/db.py`
- Create: `app/core/__init__.py`
- Create: `alembic.ini`
- Create: `alembic/env.py`
- Create: `alembic/script.py.mako`
- Create: `alembic/versions/.gitkeep`

- [ ] **Step 1: Add dependencies to pyproject.toml**

```toml
[project]
name = "backend"
version = "0.1.0"
description = "FastAPI backend for GMS"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "asyncpg>=0.30.0",
    "fastapi[standard]>=0.115.0",
    "pydantic-settings>=2.7.0",
    "redis>=5.2.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "uvicorn[standard]>=0.34.0",
    "alembic>=1.14.0",
    "passlib[bcrypt]>=1.7.4",
    "python-jose[cryptography]>=3.3.0",
    "aiosmtplib>=3.0.0",
    "python-multipart>=0.0.9",
    "httpx>=0.27.0",
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
]

[build-system]
requires = ["setuptools>=75.0"]
build-backend = "setuptools.build_meta"
```

- [ ] **Step 2: Install dependencies**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && pip install -e .`
Expected: All packages install successfully.

- [ ] **Step 3: Update app/config.py with all env vars**

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GMS Backend"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://gms:gms@postgres:5432/gms"
    redis_url: str = "redis://redis:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Default admin
    admin_phone: str = "+251900000000"
    admin_password: str = "admin123"

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Update app/db.py with Base and get_db**

```python
from collections.abc import AsyncIterator

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


settings = get_settings()

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)
async_session = async_sessionmaker(engine, expire_on_commit=False)
redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session() as session:
        yield session


async def get_redis() -> AsyncIterator[Redis]:
    yield redis_client


async def close_connections() -> None:
    await redis_client.aclose()
    await engine.dispose()
```

- [ ] **Step 5: Create app/core/__init__.py**

```python
```

(Empty file.)

- [ ] **Step 6: Initialize Alembic**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && alembic init alembic`
Expected: Creates `alembic/` directory and `alembic.ini`.

- [ ] **Step 7: Configure alembic/env.py for async**

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.db import Base

# Import all models so they register with Base.metadata
from app.auth.models import *  # noqa: F403
from app.hr.models import *  # noqa: F403
from app.job_cards.models import *  # noqa: F403
from app.performa.models import *  # noqa: F403
from app.inventory.models import *  # noqa: F403
from app.tools.models import *  # noqa: F403
from app.notifications.models import *  # noqa: F403
from app.audit.models import *  # noqa: F403

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
settings = get_settings()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(settings.database_url)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 8: Update alembic.ini sqlalchemy.url line**

Change the `sqlalchemy.url` line in `alembic.ini` to empty (we set it from code):
```ini
sqlalchemy.url =
```

- [ ] **Step 9: Commit**

```bash
git add pyproject.toml app/config.py app/db.py app/core/__init__.py alembic.ini alembic/
git commit -m "feat: add dependencies, configure Alembic and extended settings"
```

---

## Task 2: Core Security — JWT & Password Hashing

**Files:**
- Create: `app/core/security.py`
- Create: `tests/test_auth.py` (partial — security unit tests)
- Create: `tests/conftest.py`

- [ ] **Step 1: Write failing tests for password hashing and JWT**

Create `tests/conftest.py`:

```python
import asyncio
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db import Base, get_db
from app.main import app


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()
```

Create `tests/test_auth.py`:

```python
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token


def test_hash_and_verify_password():
    password = "testpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_access_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_access_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["role_id"] == "role-456"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_refresh_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["type"] == "refresh"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.security'`

- [ ] **Step 3: Implement app/core/security.py**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_auth.py -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/security.py tests/conftest.py tests/test_auth.py
git commit -m "feat: add JWT token creation and password hashing"
```

---

## Task 3: Auth Models, Schemas & User Service

**Files:**
- Create: `app/auth/__init__.py`
- Create: `app/auth/models.py`
- Create: `app/auth/schemas.py`
- Create: `app/auth/service.py`
- Modify: `tests/test_auth.py`

- [ ] **Step 1: Create app/auth/__init__.py**

```python
```

- [ ] **Step 2: Create app/auth/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship(back_populates="role")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    module: Mapped[str] = mapped_column(String(30), nullable=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False)
    can_read: Mapped[bool] = mapped_column(Boolean, default=False)
    can_update: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False)

    role: Mapped["Role"] = relationship(back_populates="permissions")

    __table_args__ = (
        {"sqlite_autoincrement": False},
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    role: Mapped["Role"] = relationship(back_populates="users")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
```

- [ ] **Step 3: Create app/auth/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- Auth ---
class LoginRequest(BaseModel):
    phone: str
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# --- User ---
class UserCreate(BaseModel):
    phone: str
    password: str = Field(min_length=8)
    full_name: str
    role_id: uuid.UUID


class UserUpdate(BaseModel):
    full_name: str | None = None
    role_id: uuid.UUID | None = None
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: uuid.UUID
    phone: str
    full_name: str
    role_id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Role ---
class RoleCreate(BaseModel):
    name: str
    is_superadmin: bool = False


class RoleUpdate(BaseModel):
    name: str | None = None


class PermissionSet(BaseModel):
    module: str
    can_create: bool = False
    can_read: bool = False
    can_update: bool = False
    can_delete: bool = False


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    is_superadmin: bool
    created_at: datetime
    permissions: list[PermissionSet] = []

    model_config = {"from_attributes": True}


# --- System Settings ---
class SettingUpdate(BaseModel):
    value: str


class SettingResponse(BaseModel):
    id: uuid.UUID
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create app/auth/service.py**

```python
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import Role, RolePermission, SystemSetting, User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token


async def authenticate_user(db: AsyncSession, phone: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone, User.is_active == True))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.hashed_password):
        return user
    return None


def create_tokens(user: User) -> dict:
    data = {"user_id": str(user.id), "role_id": str(user.role_id)}
    return {
        "access_token": create_access_token(data),
        "refresh_token": create_refresh_token(data),
        "token_type": "bearer",
    }


async def create_user(db: AsyncSession, phone: str, password: str, full_name: str, role_id: uuid.UUID) -> User:
    user = User(
        phone=phone,
        hashed_password=hash_password(password),
        full_name=full_name,
        role_id=role_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def update_user(db: AsyncSession, user: User, **kwargs) -> User:
    for key, value in kwargs.items():
        if value is not None:
            setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    await db.commit()
    await db.refresh(user)
    return user


async def create_role(db: AsyncSession, name: str, is_superadmin: bool = False) -> Role:
    role = Role(name=name, is_superadmin=is_superadmin)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


async def get_role(db: AsyncSession, role_id: uuid.UUID) -> Role | None:
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    )
    return result.scalar_one_or_none()


async def list_roles(db: AsyncSession) -> list[Role]:
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).order_by(Role.name))
    return list(result.scalars().all())


async def set_role_permissions(db: AsyncSession, role_id: uuid.UUID, permissions: list[dict]) -> Role:
    # Delete existing permissions for this role
    role = await get_role(db, role_id)
    if not role:
        return None
    for perm in role.permissions:
        await db.delete(perm)
    # Add new permissions
    for perm_data in permissions:
        perm = RolePermission(role_id=role_id, **perm_data)
        db.add(perm)
    await db.commit()
    return await get_role(db, role_id)


async def check_permission(db: AsyncSession, role_id: uuid.UUID, module: str, action: str) -> bool:
    role = await get_role(db, role_id)
    if not role:
        return False
    if role.is_superadmin:
        return True
    for perm in role.permissions:
        if perm.module == module:
            return getattr(perm, f"can_{action}", False)
    return False


async def get_setting(db: AsyncSession, key: str) -> SystemSetting | None:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    return result.scalar_one_or_none()


async def upsert_setting(db: AsyncSession, key: str, value: str) -> SystemSetting:
    setting = await get_setting(db, key)
    if setting:
        setting.value = value
    else:
        setting = SystemSetting(key=key, value=value)
        db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting
```

- [ ] **Step 5: Write integration tests for auth endpoints**

Add to `tests/test_auth.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.auth.models import Role, User
from app.db import Base


# --- Unit tests (from Task 2) ---

def test_hash_and_verify_password():
    password = "testpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_access_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_access_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["role_id"] == "role-456"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_refresh_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["type"] == "refresh"


# --- Integration tests ---

@pytest_asyncio.fixture
async def seed_role(db_session):
    role = Role(name="Admin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    return role


@pytest_asyncio.fixture
async def seed_user(db_session, seed_role):
    user = User(
        phone="+251911000000",
        hashed_password=hash_password("password123"),
        full_name="Test Admin",
        role_id=seed_role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(seed_user):
    token = create_access_token({"user_id": str(seed_user.id), "role_id": str(seed_user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_user):
    response = await client.post("/api/v1/auth/login", json={
        "phone": "+251911000000",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, seed_user):
    response = await client.post("/api/v1/auth/login", json={
        "phone": "+251911000000",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, auth_headers, seed_role):
    response = await client.post("/api/v1/auth/users", json={
        "phone": "+251922000000",
        "password": "newpass123",
        "full_name": "New User",
        "role_id": str(seed_role.id),
    }, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["phone"] == "+251922000000"


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers, seed_user):
    response = await client.get("/api/v1/auth/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1
```

- [ ] **Step 6: Run tests — expect failure (routes don't exist yet)**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_auth.py -v`
Expected: Unit tests pass, integration tests FAIL (404 — routes not registered).

- [ ] **Step 7: Commit models, schemas, service**

```bash
git add app/auth/ tests/test_auth.py
git commit -m "feat: add auth models, schemas, and service layer"
```

---

## Task 4: Core Dependencies & RBAC Middleware

**Files:**
- Create: `app/core/deps.py`
- Create: `app/core/rbac.py`
- Create: `app/core/audit.py`
- Create: `app/audit/__init__.py`
- Create: `app/audit/models.py`
- Create: `app/audit/schemas.py`
- Create: `app/audit/routes.py`

- [ ] **Step 1: Create app/core/deps.py**

```python
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db import get_db
from app.auth.models import User
from app.auth.service import get_user

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    token_type = payload.get("type")
    if not user_id or token_type != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user(db, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user
```

- [ ] **Step 2: Create app/core/rbac.py**

```python
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db
from app.auth.models import User
from app.auth.service import check_permission


class RequirePermission:
    def __init__(self, module: str, action: str):
        self.module = module
        self.action = action

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has_perm = await check_permission(db, current_user.role_id, self.module, self.action)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.module}.{self.action}",
            )
        return current_user
```

- [ ] **Step 3: Create app/audit/models.py**

Create `app/audit/__init__.py` (empty).

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
```

- [ ] **Step 4: Create app/core/audit.py**

```python
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog


async def create_audit_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    details: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)
    await db.flush()
    return log
```

- [ ] **Step 5: Create app/audit/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Create app/audit/routes.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.audit.schemas import AuditLogResponse
from app.core.rbac import RequirePermission
from app.db import get_db

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("/", response_model=list[AuditLogResponse])
async def list_audit_logs(
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    _user=Depends(RequirePermission("settings", "read")),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    result = await db.execute(query)
    return list(result.scalars().all())
```

- [ ] **Step 7: Commit**

```bash
git add app/core/deps.py app/core/rbac.py app/core/audit.py app/audit/
git commit -m "feat: add RBAC middleware, audit logging, and core dependencies"
```

---

## Task 5: Auth Routes & Main App Wiring

**Files:**
- Create: `app/auth/routes.py`
- Modify: `app/main.py`
- Create: `tests/test_rbac.py`

- [ ] **Step 1: Create app/auth/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import schemas, service
from app.core.audit import create_audit_log
from app.core.deps import get_current_user
from app.core.rbac import RequirePermission
from app.db import get_db
from app.auth.models import User

router = APIRouter(prefix="/auth", tags=["auth"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])


# --- Auth ---

@router.post("/login", response_model=schemas.TokenResponse)
async def login(body: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await service.authenticate_user(db, body.phone, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return service.create_tokens(user)


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh(body: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    from app.core.security import decode_token
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await service.get_user(db, uuid.UUID(payload["user_id"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return service.create_tokens(user)


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Users ---

@router.post("/users", response_model=schemas.UserResponse, status_code=201)
async def create_user(
    body: schemas.UserCreate,
    current_user: User = Depends(RequirePermission("users", "create")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.create_user(db, body.phone, body.password, body.full_name, body.role_id)
    await create_audit_log(db, current_user.id, "user.create", "user", user.id)
    await db.commit()
    return user


@router.get("/users", response_model=list[schemas.UserResponse])
async def list_users(
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_users(db)


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user(
    user_id: uuid.UUID,
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: schemas.UserUpdate,
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated = await service.update_user(db, user, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "user.update", "user", user.id)
    await db.commit()
    return updated


@router.patch("/users/{user_id}/password")
async def reset_password(
    user_id: uuid.UUID,
    body: schemas.PasswordReset,
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await service.reset_password(db, user, body.new_password)
    await create_audit_log(db, current_user.id, "user.password_reset", "user", user.id)
    await db.commit()
    return {"detail": "Password reset successfully"}


# --- Roles ---

@roles_router.post("/", response_model=schemas.RoleResponse, status_code=201)
async def create_role(
    body: schemas.RoleCreate,
    current_user: User = Depends(RequirePermission("users", "create")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.create_role(db, body.name, body.is_superadmin)
    await create_audit_log(db, current_user.id, "role.create", "role", role.id)
    await db.commit()
    return role


@roles_router.get("/", response_model=list[schemas.RoleResponse])
async def list_roles(
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_roles(db)


@roles_router.get("/{role_id}", response_model=schemas.RoleResponse)
async def get_role(
    role_id: uuid.UUID,
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@roles_router.put("/{role_id}/permissions", response_model=schemas.RoleResponse)
async def set_permissions(
    role_id: uuid.UUID,
    body: list[schemas.PermissionSet],
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.set_role_permissions(db, role_id, [p.model_dump() for p in body])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await create_audit_log(db, current_user.id, "role.permissions_update", "role", role_id)
    await db.commit()
    return role


# --- System Settings ---

@settings_router.get("/", response_model=list[schemas.SettingResponse])
async def list_settings(
    _user=Depends(RequirePermission("settings", "read")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.auth.models import SystemSetting
    result = await db.execute(select(SystemSetting))
    return list(result.scalars().all())


@settings_router.put("/{key}", response_model=schemas.SettingResponse)
async def update_setting(
    key: str,
    body: schemas.SettingUpdate,
    current_user: User = Depends(RequirePermission("settings", "update")),
    db: AsyncSession = Depends(get_db),
):
    setting = await service.upsert_setting(db, key, body.value)
    await create_audit_log(db, current_user.id, "setting.update", "setting", setting.id)
    await db.commit()
    return setting
```

- [ ] **Step 2: Update app/main.py to mount routers**

```python
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import close_connections, engine, redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_connections()


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

# --- Mount routers ---
from app.auth.routes import router as auth_router, roles_router, settings_router
from app.audit.routes import router as audit_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(roles_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "GMS Backend API"}


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, Any]:
    checks: dict[str, bool] = {
        "postgres": False,
        "redis": False,
    }

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        checks["postgres"] = True
    except SQLAlchemyError:
        checks["postgres"] = False

    try:
        checks["redis"] = bool(await redis_client.ping())
    except RedisError:
        checks["redis"] = False

    return {
        "status": "ok" if all(checks.values()) else "degraded",
        "checks": checks,
    }
```

- [ ] **Step 3: Run integration tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_auth.py -v`
Expected: All tests PASS (unit + integration).

- [ ] **Step 4: Write RBAC tests**

Create `tests/test_rbac.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, RolePermission, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def limited_role(db_session):
    role = Role(name="Receptionist", is_superadmin=False)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    # Only grant job_cards read
    perm = RolePermission(role_id=role.id, module="job_cards", can_read=True)
    db_session.add(perm)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def limited_user(db_session, limited_role):
    user = User(
        phone="+251933000000",
        hashed_password=hash_password("password123"),
        full_name="Receptionist",
        role_id=limited_role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def limited_headers(limited_user):
    token = create_access_token({"user_id": str(limited_user.id), "role_id": str(limited_user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_rbac_denies_unauthorized_access(client: AsyncClient, limited_headers):
    response = await client.get("/api/v1/auth/users", headers=limited_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_rbac_no_token_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/auth/users")
    assert response.status_code in (401, 403)
```

- [ ] **Step 5: Run all tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/ -v`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add app/auth/routes.py app/main.py tests/test_rbac.py
git commit -m "feat: add auth routes, RBAC enforcement, and wire up main app"
```

---

## Task 6: HR / Employee Directory Module

**Files:**
- Create: `app/hr/__init__.py`
- Create: `app/hr/models.py`
- Create: `app/hr/schemas.py`
- Create: `app/hr/service.py`
- Create: `app/hr/routes.py`
- Create: `tests/test_hr.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/hr/__init__.py** (empty)

- [ ] **Step 2: Create app/hr/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_title: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
```

- [ ] **Step 3: Create app/hr/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    name: str
    job_title: str
    phone: str


class EmployeeUpdate(BaseModel):
    name: str | None = None
    job_title: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    name: str
    job_title: str
    phone: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create app/hr/service.py**

```python
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.hr.models import Employee


async def create_employee(db: AsyncSession, name: str, job_title: str, phone: str) -> Employee:
    employee = Employee(name=name, job_title=job_title, phone=phone)
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee


async def get_employee(db: AsyncSession, employee_id: uuid.UUID) -> Employee | None:
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    return result.scalar_one_or_none()


async def list_employees(db: AsyncSession, active_only: bool = False) -> list[Employee]:
    query = select(Employee).order_by(Employee.name)
    if active_only:
        query = query.where(Employee.is_active == True)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_employee(db: AsyncSession, employee: Employee, **kwargs) -> Employee:
    for key, value in kwargs.items():
        if value is not None:
            setattr(employee, key, value)
    await db.commit()
    await db.refresh(employee)
    return employee
```

- [ ] **Step 5: Create app/hr/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.hr import schemas, service
from app.auth.models import User

router = APIRouter(prefix="/hr/employees", tags=["hr"])


@router.post("/", response_model=schemas.EmployeeResponse, status_code=201)
async def create_employee(
    body: schemas.EmployeeCreate,
    current_user: User = Depends(RequirePermission("hr", "create")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.create_employee(db, body.name, body.job_title, body.phone)
    await create_audit_log(db, current_user.id, "employee.create", "employee", emp.id)
    await db.commit()
    return emp


@router.get("/", response_model=list[schemas.EmployeeResponse])
async def list_employees(
    active_only: bool = False,
    _user=Depends(RequirePermission("hr", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_employees(db, active_only)


@router.get("/{employee_id}", response_model=schemas.EmployeeResponse)
async def get_employee(
    employee_id: uuid.UUID,
    _user=Depends(RequirePermission("hr", "read")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.patch("/{employee_id}", response_model=schemas.EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    body: schemas.EmployeeUpdate,
    current_user: User = Depends(RequirePermission("hr", "update")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    updated = await service.update_employee(db, emp, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "employee.update", "employee", emp.id)
    await db.commit()
    return updated
```

- [ ] **Step 6: Mount HR router in app/main.py**

Add after the existing router imports:
```python
from app.hr.routes import router as hr_router
app.include_router(hr_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_hr.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def admin_role(db_session):
    role = Role(name="HRAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    return role


@pytest_asyncio.fixture
async def admin_user(db_session, admin_role):
    user = User(
        phone="+251944000000",
        hashed_password=hash_password("password123"),
        full_name="HR Admin",
        role_id=admin_role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_headers(admin_user):
    token = create_access_token({"user_id": str(admin_user.id), "role_id": str(admin_user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_employee(client: AsyncClient, admin_headers):
    response = await client.post("/api/v1/hr/employees", json={
        "name": "John Mechanic",
        "job_title": "Mechanic",
        "phone": "+251900111111",
    }, headers=admin_headers)
    assert response.status_code == 201
    assert response.json()["name"] == "John Mechanic"


@pytest.mark.asyncio
async def test_list_employees(client: AsyncClient, admin_headers):
    # Create one first
    await client.post("/api/v1/hr/employees", json={
        "name": "Jane Electrician",
        "job_title": "Electrician",
        "phone": "+251900222222",
    }, headers=admin_headers)
    response = await client.get("/api/v1/hr/employees", headers=admin_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_update_employee(client: AsyncClient, admin_headers):
    create_resp = await client.post("/api/v1/hr/employees", json={
        "name": "Bob",
        "job_title": "Mechanic",
        "phone": "+251900333333",
    }, headers=admin_headers)
    emp_id = create_resp.json()["id"]
    response = await client.patch(f"/api/v1/hr/employees/{emp_id}", json={
        "is_active": False,
    }, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_hr.py -v`
Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add app/hr/ tests/test_hr.py app/main.py
git commit -m "feat: add HR employee directory module"
```

---

## Task 7: Job Card Module — Models, Owners & Vehicles

**Files:**
- Create: `app/job_cards/__init__.py`
- Create: `app/job_cards/models.py`
- Create: `app/job_cards/schemas.py`
- Create: `app/job_cards/service.py`
- Create: `app/job_cards/routes.py`
- Create: `tests/test_job_cards.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/job_cards/__init__.py** (empty)

- [ ] **Step 2: Create app/job_cards/models.py**

```python
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, Table, Column
from sqlalchemy.dialects.postgresql import UUID
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
    Column("job_card_id", UUID(as_uuid=True), ForeignKey("job_cards.id"), primary_key=True),
    Column("employee_id", UUID(as_uuid=True), ForeignKey("employees.id"), primary_key=True),
)


class Owner(Base):
    __tablename__ = "owners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="owner")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("owners.id"), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    engine_number: Mapped[str] = mapped_column(String(50), nullable=False)
    chassis_number: Mapped[str] = mapped_column(String(50), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["Owner"] = relationship(back_populates="vehicles")


class JobCard(Base):
    __tablename__ = "job_cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("owners.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=JobStatus.PENDING_INSPECTION.value, nullable=False)
    mileage_km: Mapped[int] = mapped_column(Integer, nullable=False)
    private_paint: Mapped[bool] = mapped_column(Boolean, default=False)
    private_mechanic: Mapped[bool] = mapped_column(Boolean, default=False)
    insurance_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_materials: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    vehicle: Mapped["Vehicle"] = relationship()
    owner: Mapped["Owner"] = relationship()
    mechanics: Mapped[list] = relationship("Employee", secondary=job_card_mechanics)
    conditions: Mapped[list["VehicleCondition"]] = relationship(back_populates="job_card", cascade="all, delete-orphan")


class VehicleCondition(Base):
    __tablename__ = "vehicle_conditions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False)
    part_name: Mapped[str] = mapped_column(String(30), nullable=False)
    condition_state: Mapped[str] = mapped_column(String(20), nullable=False)

    job_card: Mapped["JobCard"] = relationship(back_populates="conditions")

    __table_args__ = (
        {"sqlite_autoincrement": False},
    )
```

- [ ] **Step 3: Create app/job_cards/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel

from app.job_cards.models import ConditionState, JobStatus, PartName


# --- Owner ---
class OwnerCreate(BaseModel):
    name: str
    phone: str


class OwnerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class OwnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Vehicle ---
class VehicleCreate(BaseModel):
    owner_id: uuid.UUID
    model: str
    type: str
    engine_number: str
    chassis_number: str
    plate_number: str


class VehicleUpdate(BaseModel):
    model: str | None = None
    type: str | None = None
    engine_number: str | None = None
    chassis_number: str | None = None
    plate_number: str | None = None


class VehicleResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    model: str
    type: str
    engine_number: str
    chassis_number: str
    plate_number: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Vehicle Condition ---
class VehicleConditionInput(BaseModel):
    part_name: PartName
    condition_state: ConditionState


class VehicleConditionResponse(BaseModel):
    id: uuid.UUID
    part_name: str
    condition_state: str

    model_config = {"from_attributes": True}


# --- Job Card ---
class JobCardCreate(BaseModel):
    vehicle_id: uuid.UUID
    owner_id: uuid.UUID
    mileage_km: int
    private_paint: bool = False
    private_mechanic: bool = False
    insurance_provider: str | None = None
    description: str
    remarks: str | None = None
    requested_materials: str | None = None
    conditions: list[VehicleConditionInput] = []
    mechanic_ids: list[uuid.UUID] = []


class JobCardUpdate(BaseModel):
    mileage_km: int | None = None
    private_paint: bool | None = None
    private_mechanic: bool | None = None
    insurance_provider: str | None = None
    description: str | None = None
    remarks: str | None = None
    requested_materials: str | None = None


class StatusUpdate(BaseModel):
    status: JobStatus


class JobCardResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    owner_id: uuid.UUID
    status: str
    mileage_km: int
    private_paint: bool
    private_mechanic: bool
    insurance_provider: str | None
    description: str
    remarks: str | None
    requested_materials: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    conditions: list[VehicleConditionResponse] = []

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create app/job_cards/service.py**

```python
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.hr.models import Employee
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle, VehicleCondition, job_card_mechanics


# --- Valid transitions ---
VALID_TRANSITIONS: dict[str, list[str]] = {
    JobStatus.PENDING_INSPECTION.value: [JobStatus.WAITING_FOR_APPROVAL.value],
    JobStatus.WAITING_FOR_APPROVAL.value: [JobStatus.IN_REPAIR.value],
    JobStatus.IN_REPAIR.value: [JobStatus.WAITING_FOR_PARTS.value, JobStatus.READY_FOR_TESTING.value],
    JobStatus.WAITING_FOR_PARTS.value: [JobStatus.IN_REPAIR.value],
    JobStatus.READY_FOR_TESTING.value: [JobStatus.COMPLETED.value],
}


# --- Owner ---
async def create_owner(db: AsyncSession, name: str, phone: str) -> Owner:
    owner = Owner(name=name, phone=phone)
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


async def get_owner(db: AsyncSession, owner_id: uuid.UUID) -> Owner | None:
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    return result.scalar_one_or_none()


async def list_owners(db: AsyncSession) -> list[Owner]:
    result = await db.execute(select(Owner).order_by(Owner.name))
    return list(result.scalars().all())


async def update_owner(db: AsyncSession, owner: Owner, **kwargs) -> Owner:
    for key, value in kwargs.items():
        if value is not None:
            setattr(owner, key, value)
    await db.commit()
    await db.refresh(owner)
    return owner


# --- Vehicle ---
async def create_vehicle(db: AsyncSession, **kwargs) -> Vehicle:
    vehicle = Vehicle(**kwargs)
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicle(db: AsyncSession, vehicle_id: uuid.UUID) -> Vehicle | None:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    return result.scalar_one_or_none()


async def list_vehicles(db: AsyncSession, owner_id: uuid.UUID | None = None) -> list[Vehicle]:
    query = select(Vehicle).order_by(Vehicle.created_at.desc())
    if owner_id:
        query = query.where(Vehicle.owner_id == owner_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_vehicle(db: AsyncSession, vehicle: Vehicle, **kwargs) -> Vehicle:
    for key, value in kwargs.items():
        if value is not None:
            setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


# --- Job Card ---
async def create_job_card(
    db: AsyncSession,
    created_by: uuid.UUID,
    conditions: list[dict],
    mechanic_ids: list[uuid.UUID],
    **kwargs,
) -> JobCard:
    job_card = JobCard(created_by=created_by, **kwargs)
    db.add(job_card)
    await db.flush()

    # Add conditions
    for cond in conditions:
        vc = VehicleCondition(job_card_id=job_card.id, **cond)
        db.add(vc)

    # Assign mechanics
    if mechanic_ids:
        for mech_id in mechanic_ids:
            await db.execute(job_card_mechanics.insert().values(
                job_card_id=job_card.id, employee_id=mech_id
            ))

    await db.commit()
    return await get_job_card(db, job_card.id)


async def get_job_card(db: AsyncSession, job_card_id: uuid.UUID) -> JobCard | None:
    result = await db.execute(
        select(JobCard)
        .options(selectinload(JobCard.conditions))
        .where(JobCard.id == job_card_id)
    )
    return result.scalar_one_or_none()


async def list_job_cards(db: AsyncSession, status: str | None = None) -> list[JobCard]:
    query = select(JobCard).options(selectinload(JobCard.conditions)).order_by(JobCard.created_at.desc())
    if status:
        query = query.where(JobCard.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_job_card(db: AsyncSession, job_card: JobCard, **kwargs) -> JobCard:
    for key, value in kwargs.items():
        if value is not None:
            setattr(job_card, key, value)
    await db.commit()
    return await get_job_card(db, job_card.id)


async def update_status(db: AsyncSession, job_card: JobCard, new_status: str) -> JobCard:
    current = job_card.status
    valid_next = VALID_TRANSITIONS.get(current, [])

    if new_status not in valid_next:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid transition from '{current}' to '{new_status}'. Valid: {valid_next}",
        )

    # Guard: completion requires all tools returned
    if new_status == JobStatus.COMPLETED.value:
        from app.tools.models import ToolCheckout
        result = await db.execute(
            select(ToolCheckout).where(
                ToolCheckout.job_card_id == job_card.id,
                ToolCheckout.checked_in_at.is_(None),
            )
        )
        unreturned = list(result.scalars().all())
        if unreturned:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot complete: {len(unreturned)} unreturned tool checkout(s)",
            )

    job_card.status = new_status
    await db.commit()
    return await get_job_card(db, job_card.id)
```

- [ ] **Step 5: Create app/job_cards/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.job_cards import schemas, service

router = APIRouter(tags=["job-cards"])
owners_router = APIRouter(prefix="/owners", tags=["owners"])
vehicles_router = APIRouter(prefix="/vehicles", tags=["vehicles"])


# --- Owners ---

@owners_router.post("/", response_model=schemas.OwnerResponse, status_code=201)
async def create_owner(
    body: schemas.OwnerCreate,
    _user=Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_owner(db, body.name, body.phone)


@owners_router.get("/", response_model=list[schemas.OwnerResponse])
async def list_owners(
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_owners(db)


@owners_router.get("/{owner_id}", response_model=schemas.OwnerResponse)
async def get_owner(
    owner_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    owner = await service.get_owner(db, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner


@owners_router.patch("/{owner_id}", response_model=schemas.OwnerResponse)
async def update_owner(
    owner_id: uuid.UUID,
    body: schemas.OwnerUpdate,
    _user=Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    owner = await service.get_owner(db, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return await service.update_owner(db, owner, **body.model_dump(exclude_unset=True))


# --- Vehicles ---

@vehicles_router.post("/", response_model=schemas.VehicleResponse, status_code=201)
async def create_vehicle(
    body: schemas.VehicleCreate,
    _user=Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_vehicle(db, **body.model_dump())


@vehicles_router.get("/", response_model=list[schemas.VehicleResponse])
async def list_vehicles(
    owner_id: uuid.UUID | None = None,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_vehicles(db, owner_id)


@vehicles_router.get("/{vehicle_id}", response_model=schemas.VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    vehicle = await service.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


# --- Job Cards ---

job_cards_router = APIRouter(prefix="/job-cards", tags=["job-cards"])


@job_cards_router.post("/", response_model=schemas.JobCardResponse, status_code=201)
async def create_job_card(
    body: schemas.JobCardCreate,
    current_user: User = Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.create_job_card(
        db,
        created_by=current_user.id,
        conditions=[c.model_dump() for c in body.conditions],
        mechanic_ids=body.mechanic_ids,
        vehicle_id=body.vehicle_id,
        owner_id=body.owner_id,
        mileage_km=body.mileage_km,
        private_paint=body.private_paint,
        private_mechanic=body.private_mechanic,
        insurance_provider=body.insurance_provider,
        description=body.description,
        remarks=body.remarks,
        requested_materials=body.requested_materials,
    )
    await create_audit_log(db, current_user.id, "job_card.create", "job_card", jc.id)
    await db.commit()
    return jc


@job_cards_router.get("/", response_model=list[schemas.JobCardResponse])
async def list_job_cards(
    status: str | None = None,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_job_cards(db, status)


@job_cards_router.get("/{job_card_id}", response_model=schemas.JobCardResponse)
async def get_job_card(
    job_card_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    return jc


@job_cards_router.patch("/{job_card_id}", response_model=schemas.JobCardResponse)
async def update_job_card(
    job_card_id: uuid.UUID,
    body: schemas.JobCardUpdate,
    current_user: User = Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    updated = await service.update_job_card(db, jc, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "job_card.update", "job_card", jc.id)
    await db.commit()
    return updated


@job_cards_router.patch("/{job_card_id}/status", response_model=schemas.JobCardResponse)
async def update_status(
    job_card_id: uuid.UUID,
    body: schemas.StatusUpdate,
    current_user: User = Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    updated = await service.update_status(db, jc, body.status.value)
    await create_audit_log(
        db, current_user.id, "job_card.status_change", "job_card", jc.id,
        details={"from": jc.status, "to": body.status.value},
    )
    await db.commit()
    return updated
```

- [ ] **Step 6: Mount job card routers in app/main.py**

Add:
```python
from app.job_cards.routes import owners_router, vehicles_router, job_cards_router
app.include_router(owners_router, prefix="/api/v1")
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(job_cards_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_job_cards.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.hr.models import Employee
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def setup_data(db_session):
    role = Role(name="JCAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(
        phone="+251955000000",
        hashed_password=hash_password("password123"),
        full_name="JC Admin",
        role_id=role.id,
    )
    db_session.add(user)

    mechanic = Employee(name="Ali", job_title="Mechanic", phone="+251900444444")
    db_session.add(mechanic)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(mechanic)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user,
        "mechanic": mechanic,
    }


@pytest.mark.asyncio
async def test_owner_crud(client: AsyncClient, setup_data):
    h = setup_data["headers"]
    resp = await client.post("/api/v1/owners", json={"name": "Ahmed", "phone": "+251911111111"}, headers=h)
    assert resp.status_code == 201
    owner_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/owners/{owner_id}", headers=h)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ahmed"


@pytest.mark.asyncio
async def test_vehicle_crud(client: AsyncClient, setup_data):
    h = setup_data["headers"]
    owner_resp = await client.post("/api/v1/owners", json={"name": "Sara", "phone": "+251922222222"}, headers=h)
    owner_id = owner_resp.json()["id"]

    resp = await client.post("/api/v1/vehicles", json={
        "owner_id": owner_id,
        "model": "Land Cruiser",
        "type": "SUV",
        "engine_number": "ENG001",
        "chassis_number": "CHS001",
        "plate_number": "AA-12345",
    }, headers=h)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_job_card_create_and_status_transitions(client: AsyncClient, setup_data):
    h = setup_data["headers"]
    # Create owner and vehicle
    owner = await client.post("/api/v1/owners", json={"name": "Test", "phone": "+251933333333"}, headers=h)
    owner_id = owner.json()["id"]
    vehicle = await client.post("/api/v1/vehicles", json={
        "owner_id": owner_id,
        "model": "Yaris",
        "type": "Sedan",
        "engine_number": "ENG002",
        "chassis_number": "CHS002",
        "plate_number": "BB-54321",
    }, headers=h)
    vehicle_id = vehicle.json()["id"]

    # Create job card
    jc_resp = await client.post("/api/v1/job-cards", json={
        "vehicle_id": vehicle_id,
        "owner_id": owner_id,
        "mileage_km": 50000,
        "description": "Full service",
        "conditions": [
            {"part_name": "trunk", "condition_state": "available"},
            {"part_name": "lh_body", "condition_state": "dent"},
        ],
        "mechanic_ids": [str(setup_data["mechanic"].id)],
    }, headers=h)
    assert jc_resp.status_code == 201
    jc_id = jc_resp.json()["id"]
    assert jc_resp.json()["status"] == "pending_inspection"

    # Invalid transition: pending_inspection -> in_repair (should fail)
    resp = await client.patch(f"/api/v1/job-cards/{jc_id}/status", json={"status": "in_repair"}, headers=h)
    assert resp.status_code == 422
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_job_cards.py -v`
Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add app/job_cards/ tests/test_job_cards.py app/main.py
git commit -m "feat: add job card module with owners, vehicles, and state machine"
```

---

## Task 8: Inventory Module

**Files:**
- Create: `app/inventory/__init__.py`
- Create: `app/inventory/models.py`
- Create: `app/inventory/schemas.py`
- Create: `app/inventory/service.py`
- Create: `app/inventory/routes.py`
- Create: `tests/test_inventory.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/inventory/__init__.py** (empty)

- [ ] **Step 2: Create app/inventory/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class StoreLocation(Base):
    __tablename__ = "store_locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicable_vehicle_types: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    supplier_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    min_stock_threshold: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    stock_entries: Mapped[list["StockEntry"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class StockEntry(Base):
    __tablename__ = "stock_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    store_location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("store_locations.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    item: Mapped["InventoryItem"] = relationship(back_populates="stock_entries")
    store_location: Mapped["StoreLocation"] = relationship()

    __table_args__ = (
        UniqueConstraint("item_id", "store_location_id", name="uq_stock_item_location"),
    )
```

- [ ] **Step 3: Create app/inventory/schemas.py**

```python
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


# --- Store Location ---
class StoreLocationCreate(BaseModel):
    name: str


class StoreLocationResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Inventory Item ---
class InventoryItemCreate(BaseModel):
    part_name: str
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal
    supplier_info: str | None = None
    min_stock_threshold: int = 0


class InventoryItemUpdate(BaseModel):
    part_name: str | None = None
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal | None = None
    supplier_info: str | None = None
    min_stock_threshold: int | None = None


class StockEntryResponse(BaseModel):
    id: uuid.UUID
    store_location_id: uuid.UUID
    quantity: int

    model_config = {"from_attributes": True}


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    part_name: str
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal
    supplier_info: str | None
    min_stock_threshold: int
    created_at: datetime
    stock_entries: list[StockEntryResponse] = []

    model_config = {"from_attributes": True}


# --- Stock ---
class StockUpdate(BaseModel):
    item_id: uuid.UUID
    store_location_id: uuid.UUID
    quantity: int
```

- [ ] **Step 4: Create app/inventory/service.py**

```python
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.inventory.models import InventoryItem, StockEntry, StoreLocation


async def create_location(db: AsyncSession, name: str) -> StoreLocation:
    loc = StoreLocation(name=name)
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


async def list_locations(db: AsyncSession) -> list[StoreLocation]:
    result = await db.execute(select(StoreLocation).order_by(StoreLocation.name))
    return list(result.scalars().all())


async def create_item(db: AsyncSession, **kwargs) -> InventoryItem:
    item = InventoryItem(**kwargs)
    db.add(item)
    await db.commit()
    return await get_item(db, item.id)


async def get_item(db: AsyncSession, item_id: uuid.UUID) -> InventoryItem | None:
    result = await db.execute(
        select(InventoryItem).options(selectinload(InventoryItem.stock_entries)).where(InventoryItem.id == item_id)
    )
    return result.scalar_one_or_none()


async def list_items(db: AsyncSession) -> list[InventoryItem]:
    result = await db.execute(
        select(InventoryItem).options(selectinload(InventoryItem.stock_entries)).order_by(InventoryItem.part_name)
    )
    return list(result.scalars().all())


async def update_item(db: AsyncSession, item: InventoryItem, **kwargs) -> InventoryItem:
    for key, value in kwargs.items():
        if value is not None:
            setattr(item, key, value)
    await db.commit()
    return await get_item(db, item.id)


async def set_stock(db: AsyncSession, item_id: uuid.UUID, store_location_id: uuid.UUID, quantity: int) -> StockEntry:
    result = await db.execute(
        select(StockEntry).where(
            StockEntry.item_id == item_id,
            StockEntry.store_location_id == store_location_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.quantity = quantity
    else:
        entry = StockEntry(item_id=item_id, store_location_id=store_location_id, quantity=quantity)
        db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def deduct_stock(db: AsyncSession, item_id: uuid.UUID, store_location_id: uuid.UUID, quantity: int) -> StockEntry:
    result = await db.execute(
        select(StockEntry).where(
            StockEntry.item_id == item_id,
            StockEntry.store_location_id == store_location_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry or entry.quantity < quantity:
        return None
    entry.quantity -= quantity
    await db.flush()
    return entry


async def get_aggregate_stock(db: AsyncSession, item_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(StockEntry.quantity), 0)).where(StockEntry.item_id == item_id)
    )
    return result.scalar()


async def check_low_stock(db: AsyncSession, item_id: uuid.UUID) -> bool:
    item = await get_item(db, item_id)
    if not item or item.min_stock_threshold == 0:
        return False
    total = await get_aggregate_stock(db, item_id)
    return total < item.min_stock_threshold
```

- [ ] **Step 5: Create app/inventory/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.inventory import schemas, service

locations_router = APIRouter(prefix="/inventory/locations", tags=["inventory"])
items_router = APIRouter(prefix="/inventory/items", tags=["inventory"])
stock_router = APIRouter(prefix="/inventory/stock", tags=["inventory"])


# --- Store Locations ---

@locations_router.post("/", response_model=schemas.StoreLocationResponse, status_code=201)
async def create_location(
    body: schemas.StoreLocationCreate,
    _user=Depends(RequirePermission("inventory", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_location(db, body.name)


@locations_router.get("/", response_model=list[schemas.StoreLocationResponse])
async def list_locations(
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_locations(db)


# --- Inventory Items ---

@items_router.post("/", response_model=schemas.InventoryItemResponse, status_code=201)
async def create_item(
    body: schemas.InventoryItemCreate,
    current_user: User = Depends(RequirePermission("inventory", "create")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.create_item(db, **body.model_dump())
    await create_audit_log(db, current_user.id, "inventory.create", "inventory_item", item.id)
    await db.commit()
    return item


@items_router.get("/", response_model=list[schemas.InventoryItemResponse])
async def list_items(
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_items(db)


@items_router.get("/{item_id}", response_model=schemas.InventoryItemResponse)
async def get_item(
    item_id: uuid.UUID,
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@items_router.patch("/{item_id}", response_model=schemas.InventoryItemResponse)
async def update_item(
    item_id: uuid.UUID,
    body: schemas.InventoryItemUpdate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated = await service.update_item(db, item, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "inventory.update", "inventory_item", item.id)
    await db.commit()
    return updated


# --- Stock ---

@stock_router.put("/", response_model=schemas.StockEntryResponse)
async def set_stock(
    body: schemas.StockUpdate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    entry = await service.set_stock(db, body.item_id, body.store_location_id, body.quantity)
    await create_audit_log(db, current_user.id, "stock.set", "inventory_item", body.item_id,
                           details={"store": str(body.store_location_id), "quantity": body.quantity})
    await db.commit()
    return entry
```

- [ ] **Step 6: Mount inventory routers in app/main.py**

Add:
```python
from app.inventory.routes import locations_router as inv_locations_router, items_router as inv_items_router, stock_router
app.include_router(inv_locations_router, prefix="/api/v1")
app.include_router(inv_items_router, prefix="/api/v1")
app.include_router(stock_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_inventory.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def inv_setup(db_session):
    role = Role(name="StoreManager", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    user = User(phone="+251966000000", hashed_password=hash_password("password123"), full_name="Store Mgr", role_id=role.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}}


@pytest.mark.asyncio
async def test_create_location_and_item(client: AsyncClient, inv_setup):
    h = inv_setup["headers"]
    loc = await client.post("/api/v1/inventory/locations", json={"name": "Main Store"}, headers=h)
    assert loc.status_code == 201
    loc_id = loc.json()["id"]

    item = await client.post("/api/v1/inventory/items", json={
        "part_name": "Headlight",
        "applicable_vehicle_types": ["Land Cruiser", "Yaris"],
        "unit_price": "150.00",
        "min_stock_threshold": 5,
    }, headers=h)
    assert item.status_code == 201
    item_id = item.json()["id"]

    # Set stock
    stock = await client.put("/api/v1/inventory/stock", json={
        "item_id": item_id,
        "store_location_id": loc_id,
        "quantity": 20,
    }, headers=h)
    assert stock.status_code == 200
    assert stock.json()["quantity"] == 20

    # Verify stock in item detail
    detail = await client.get(f"/api/v1/inventory/items/{item_id}", headers=h)
    assert detail.status_code == 200
    assert len(detail.json()["stock_entries"]) == 1
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_inventory.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/inventory/ tests/test_inventory.py app/main.py
git commit -m "feat: add multi-store inventory module"
```

---

## Task 9: Performa Module

**Files:**
- Create: `app/performa/__init__.py`
- Create: `app/performa/models.py`
- Create: `app/performa/schemas.py`
- Create: `app/performa/service.py`
- Create: `app/performa/routes.py`
- Create: `tests/test_performa.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/performa/__init__.py** (empty)

- [ ] **Step 2: Create app/performa/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Performa(Base):
    __tablename__ = "performas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False)
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

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    performa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("performas.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(15), nullable=False)  # "repair" or "replacement"
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    performa: Mapped["Performa"] = relationship(back_populates="line_items")
```

- [ ] **Step 3: Create app/performa/schemas.py**

```python
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class LineItemCreate(BaseModel):
    type: str  # "repair" or "replacement"
    description: str
    inventory_item_id: uuid.UUID | None = None
    quantity: int = 1
    unit_price: Decimal


class LineItemResponse(BaseModel):
    id: uuid.UUID
    type: str
    description: str
    inventory_item_id: uuid.UUID | None
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}


class PerformaCreate(BaseModel):
    job_card_id: uuid.UUID
    client_email: str | None = None
    line_items: list[LineItemCreate]


class PerformaResponse(BaseModel):
    id: uuid.UUID
    job_card_id: uuid.UUID
    version: int
    subtotal: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    grand_total: Decimal
    status: str
    client_email: str | None
    sent_at: datetime | None
    created_at: datetime
    line_items: list[LineItemResponse] = []

    model_config = {"from_attributes": True}


class PerformaStatusUpdate(BaseModel):
    status: str  # "approved" or "rejected"


class PerformaSendRequest(BaseModel):
    client_email: str
```

- [ ] **Step 4: Create app/performa/service.py**

```python
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.service import get_setting
from app.performa.models import Performa, PerformaLineItem


async def create_performa(db: AsyncSession, job_card_id: uuid.UUID, client_email: str | None, line_items: list[dict]) -> Performa:
    # Get VAT rate from settings
    vat_setting = await get_setting(db, "vat_rate")
    vat_rate = Decimal(vat_setting.value) if vat_setting else Decimal("15.0")

    # Get next version for this job card
    result = await db.execute(
        select(Performa).where(Performa.job_card_id == job_card_id).order_by(Performa.version.desc())
    )
    latest = result.scalar_one_or_none()
    version = (latest.version + 1) if latest else 1

    performa = Performa(
        job_card_id=job_card_id,
        version=version,
        client_email=client_email,
        vat_rate=vat_rate,
    )
    db.add(performa)
    await db.flush()

    subtotal = Decimal("0")
    for item_data in line_items:
        total_price = Decimal(str(item_data["unit_price"])) * item_data["quantity"]
        line_item = PerformaLineItem(
            performa_id=performa.id,
            type=item_data["type"],
            description=item_data["description"],
            inventory_item_id=item_data.get("inventory_item_id"),
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=total_price,
        )
        db.add(line_item)
        subtotal += total_price

    vat_amount = subtotal * vat_rate / Decimal("100")
    performa.subtotal = subtotal
    performa.vat_amount = vat_amount
    performa.grand_total = subtotal + vat_amount

    await db.commit()
    return await get_performa(db, performa.id)


async def get_performa(db: AsyncSession, performa_id: uuid.UUID) -> Performa | None:
    result = await db.execute(
        select(Performa).options(selectinload(Performa.line_items)).where(Performa.id == performa_id)
    )
    return result.scalar_one_or_none()


async def list_performas(db: AsyncSession, job_card_id: uuid.UUID | None = None) -> list[Performa]:
    query = select(Performa).options(selectinload(Performa.line_items)).order_by(Performa.created_at.desc())
    if job_card_id:
        query = query.where(Performa.job_card_id == job_card_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_status(db: AsyncSession, performa: Performa, status: str) -> Performa:
    performa.status = status
    await db.commit()
    return await get_performa(db, performa.id)


async def revise_performa(db: AsyncSession, performa_id: uuid.UUID, line_items: list[dict]) -> Performa:
    original = await get_performa(db, performa_id)
    if not original:
        return None
    return await create_performa(db, original.job_card_id, original.client_email, line_items)
```

- [ ] **Step 5: Create app/performa/routes.py**

```python
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.performa import schemas, service

router = APIRouter(prefix="/performas", tags=["performa"])


@router.post("/", response_model=schemas.PerformaResponse, status_code=201)
async def create_performa(
    body: schemas.PerformaCreate,
    current_user: User = Depends(RequirePermission("performa", "create")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.create_performa(
        db,
        body.job_card_id,
        body.client_email,
        [item.model_dump() for item in body.line_items],
    )
    await create_audit_log(db, current_user.id, "performa.create", "performa", performa.id)
    await db.commit()
    return performa


@router.get("/", response_model=list[schemas.PerformaResponse])
async def list_performas(
    job_card_id: uuid.UUID | None = None,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_performas(db, job_card_id)


@router.get("/{performa_id}", response_model=schemas.PerformaResponse)
async def get_performa(
    performa_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")
    return performa


@router.patch("/{performa_id}/status", response_model=schemas.PerformaResponse)
async def update_status(
    performa_id: uuid.UUID,
    body: schemas.PerformaStatusUpdate,
    current_user: User = Depends(RequirePermission("performa", "update")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be 'approved' or 'rejected'")
    updated = await service.update_status(db, performa, body.status)
    await create_audit_log(db, current_user.id, "performa.status_change", "performa", performa_id,
                           details={"new_status": body.status})
    await db.commit()
    return updated


@router.post("/{performa_id}/send", response_model=schemas.PerformaResponse)
async def send_performa(
    performa_id: uuid.UUID,
    body: schemas.PerformaSendRequest,
    current_user: User = Depends(RequirePermission("performa", "update")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")

    # TODO: PDF generation + SMTP email sending will be implemented in a later task
    # For now, just update the status and email
    performa.client_email = body.client_email
    performa.status = "sent"
    performa.sent_at = datetime.now(timezone.utc)
    await db.commit()

    await create_audit_log(db, current_user.id, "performa.send", "performa", performa_id,
                           details={"email": body.client_email})
    await db.commit()
    return await service.get_performa(db, performa_id)


@router.post("/{performa_id}/revise", response_model=schemas.PerformaResponse, status_code=201)
async def revise_performa(
    performa_id: uuid.UUID,
    body: schemas.PerformaCreate,
    current_user: User = Depends(RequirePermission("performa", "create")),
    db: AsyncSession = Depends(get_db),
):
    revised = await service.revise_performa(
        db, performa_id, [item.model_dump() for item in body.line_items]
    )
    if not revised:
        raise HTTPException(status_code=404, detail="Original performa not found")
    await create_audit_log(db, current_user.id, "performa.revise", "performa", revised.id,
                           details={"original_id": str(performa_id)})
    await db.commit()
    return revised
```

- [ ] **Step 6: Mount performa router in app/main.py**

Add:
```python
from app.performa.routes import router as performa_router
app.include_router(performa_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_performa.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, SystemSetting, User
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def performa_setup(db_session):
    role = Role(name="PerfAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251977000000", hashed_password=hash_password("password123"), full_name="Perf Admin", role_id=role.id)
    db_session.add(user)

    # VAT setting
    setting = SystemSetting(key="vat_rate", value="15.0")
    db_session.add(setting)

    owner = Owner(name="Client A", phone="+251900555555")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    vehicle = Vehicle(owner_id=owner.id, model="Corolla", type="Sedan", engine_number="E1", chassis_number="C1", plate_number="CC-11111")
    db_session.add(vehicle)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(vehicle)

    job_card = JobCard(
        vehicle_id=vehicle.id, owner_id=owner.id, status=JobStatus.PENDING_INSPECTION.value,
        mileage_km=30000, description="Test job", created_by=user.id,
    )
    db_session.add(job_card)
    await db_session.commit()
    await db_session.refresh(job_card)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "job_card_id": str(job_card.id),
    }


@pytest.mark.asyncio
async def test_create_performa_with_vat(client: AsyncClient, performa_setup):
    h = performa_setup["headers"]
    resp = await client.post("/api/v1/performas", json={
        "job_card_id": performa_setup["job_card_id"],
        "client_email": "client@example.com",
        "line_items": [
            {"type": "repair", "description": "Full body paint", "unit_price": "1000.00", "quantity": 1},
            {"type": "repair", "description": "Interior cleaning", "unit_price": "500.00", "quantity": 1},
        ],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["version"] == 1
    assert float(data["subtotal"]) == 1500.0
    assert float(data["vat_rate"]) == 15.0
    assert float(data["vat_amount"]) == 225.0
    assert float(data["grand_total"]) == 1725.0
    assert len(data["line_items"]) == 2


@pytest.mark.asyncio
async def test_revise_performa_increments_version(client: AsyncClient, performa_setup):
    h = performa_setup["headers"]
    # Create v1
    resp1 = await client.post("/api/v1/performas", json={
        "job_card_id": performa_setup["job_card_id"],
        "line_items": [{"type": "repair", "description": "Paint", "unit_price": "1000.00"}],
    }, headers=h)
    perf_id = resp1.json()["id"]

    # Revise
    resp2 = await client.post(f"/api/v1/performas/{perf_id}/revise", json={
        "job_card_id": performa_setup["job_card_id"],
        "line_items": [{"type": "repair", "description": "Paint reduced", "unit_price": "800.00"}],
    }, headers=h)
    assert resp2.status_code == 201
    assert resp2.json()["version"] == 2
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_performa.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/performa/ tests/test_performa.py app/main.py
git commit -m "feat: add performa module with VAT calculation and revision flow"
```

---

## Task 10: Tool Management Module

**Files:**
- Create: `app/tools/__init__.py`
- Create: `app/tools/models.py`
- Create: `app/tools/schemas.py`
- Create: `app/tools/service.py`
- Create: `app/tools/routes.py`
- Create: `tests/test_tools.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/tools/__init__.py** (empty)

- [ ] **Step 2: Create app/tools/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    specifications: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ToolCheckout(Base):
    __tablename__ = "tool_checkouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tools.id"), nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    checked_out_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    issued_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
```

- [ ] **Step 3: Create app/tools/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class ToolCreate(BaseModel):
    name: str
    specifications: str | None = None
    total_quantity: int


class ToolUpdate(BaseModel):
    name: str | None = None
    specifications: str | None = None
    total_quantity: int | None = None


class ToolResponse(BaseModel):
    id: uuid.UUID
    name: str
    specifications: str | None
    total_quantity: int
    available_quantity: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class CheckoutCreate(BaseModel):
    tool_id: uuid.UUID
    employee_id: uuid.UUID
    job_card_id: uuid.UUID
    quantity: int


class CheckoutResponse(BaseModel):
    id: uuid.UUID
    tool_id: uuid.UUID
    employee_id: uuid.UUID
    job_card_id: uuid.UUID
    quantity: int
    checked_out_at: datetime
    checked_in_at: datetime | None
    issued_by: uuid.UUID

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create app/tools/service.py**

```python
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.models import Tool, ToolCheckout


async def create_tool(db: AsyncSession, name: str, specifications: str | None, total_quantity: int) -> Tool:
    tool = Tool(name=name, specifications=specifications, total_quantity=total_quantity)
    db.add(tool)
    await db.commit()
    await db.refresh(tool)
    return tool


async def get_tool(db: AsyncSession, tool_id: uuid.UUID) -> Tool | None:
    result = await db.execute(select(Tool).where(Tool.id == tool_id))
    return result.scalar_one_or_none()


async def get_checked_out_quantity(db: AsyncSession, tool_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(ToolCheckout.quantity), 0)).where(
            ToolCheckout.tool_id == tool_id,
            ToolCheckout.checked_in_at.is_(None),
        )
    )
    return result.scalar()


async def list_tools(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Tool).order_by(Tool.name))
    tools = list(result.scalars().all())
    tool_dicts = []
    for tool in tools:
        checked_out = await get_checked_out_quantity(db, tool.id)
        tool_dict = {
            "id": tool.id,
            "name": tool.name,
            "specifications": tool.specifications,
            "total_quantity": tool.total_quantity,
            "available_quantity": tool.total_quantity - checked_out,
            "created_at": tool.created_at,
        }
        tool_dicts.append(tool_dict)
    return tool_dicts


async def update_tool(db: AsyncSession, tool: Tool, **kwargs) -> Tool:
    for key, value in kwargs.items():
        if value is not None:
            setattr(tool, key, value)
    await db.commit()
    await db.refresh(tool)
    return tool


async def checkout_tool(
    db: AsyncSession,
    tool_id: uuid.UUID,
    employee_id: uuid.UUID,
    job_card_id: uuid.UUID,
    quantity: int,
    issued_by: uuid.UUID,
) -> ToolCheckout:
    tool = await get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    checked_out = await get_checked_out_quantity(db, tool_id)
    available = tool.total_quantity - checked_out
    if quantity > available:
        raise HTTPException(status_code=422, detail=f"Insufficient tools. Available: {available}")

    checkout = ToolCheckout(
        tool_id=tool_id,
        employee_id=employee_id,
        job_card_id=job_card_id,
        quantity=quantity,
        issued_by=issued_by,
    )
    db.add(checkout)
    await db.commit()
    await db.refresh(checkout)
    return checkout


async def return_tool(db: AsyncSession, checkout_id: uuid.UUID) -> ToolCheckout:
    result = await db.execute(select(ToolCheckout).where(ToolCheckout.id == checkout_id))
    checkout = result.scalar_one_or_none()
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    if checkout.checked_in_at:
        raise HTTPException(status_code=422, detail="Already returned")
    checkout.checked_in_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(checkout)
    return checkout


async def list_checkouts(db: AsyncSession, job_card_id: uuid.UUID | None = None, unreturned_only: bool = False) -> list[ToolCheckout]:
    query = select(ToolCheckout).order_by(ToolCheckout.checked_out_at.desc())
    if job_card_id:
        query = query.where(ToolCheckout.job_card_id == job_card_id)
    if unreturned_only:
        query = query.where(ToolCheckout.checked_in_at.is_(None))
    result = await db.execute(query)
    return list(result.scalars().all())
```

- [ ] **Step 5: Create app/tools/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.tools import schemas, service

tools_router = APIRouter(prefix="/tools", tags=["tools"])
checkouts_router = APIRouter(prefix="/tools/checkouts", tags=["tools"])


@tools_router.post("/", response_model=schemas.ToolResponse, status_code=201)
async def create_tool(
    body: schemas.ToolCreate,
    current_user: User = Depends(RequirePermission("tools", "create")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.create_tool(db, body.name, body.specifications, body.total_quantity)
    await create_audit_log(db, current_user.id, "tool.create", "tool", tool.id)
    await db.commit()
    # Return with available_quantity
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**tool.__dict__, "available_quantity": tool.total_quantity - checked_out}


@tools_router.get("/", response_model=list[schemas.ToolResponse])
async def list_tools(
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_tools(db)


@tools_router.get("/{tool_id}", response_model=schemas.ToolResponse)
async def get_tool(
    tool_id: uuid.UUID,
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**tool.__dict__, "available_quantity": tool.total_quantity - checked_out}


@tools_router.patch("/{tool_id}", response_model=schemas.ToolResponse)
async def update_tool(
    tool_id: uuid.UUID,
    body: schemas.ToolUpdate,
    current_user: User = Depends(RequirePermission("tools", "update")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    updated = await service.update_tool(db, tool, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "tool.update", "tool", tool.id)
    await db.commit()
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**updated.__dict__, "available_quantity": updated.total_quantity - checked_out}


# --- Checkouts ---

@checkouts_router.post("/", response_model=schemas.CheckoutResponse, status_code=201)
async def checkout_tool(
    body: schemas.CheckoutCreate,
    current_user: User = Depends(RequirePermission("tools", "create")),
    db: AsyncSession = Depends(get_db),
):
    checkout = await service.checkout_tool(
        db, body.tool_id, body.employee_id, body.job_card_id, body.quantity, current_user.id,
    )
    await create_audit_log(db, current_user.id, "tool.checkout", "tool", body.tool_id,
                           details={"checkout_id": str(checkout.id), "quantity": body.quantity})
    await db.commit()
    return checkout


@checkouts_router.patch("/{checkout_id}/return", response_model=schemas.CheckoutResponse)
async def return_tool(
    checkout_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("tools", "update")),
    db: AsyncSession = Depends(get_db),
):
    checkout = await service.return_tool(db, checkout_id)
    await create_audit_log(db, current_user.id, "tool.return", "tool", checkout.tool_id,
                           details={"checkout_id": str(checkout_id)})
    await db.commit()
    return checkout


@checkouts_router.get("/", response_model=list[schemas.CheckoutResponse])
async def list_checkouts(
    job_card_id: uuid.UUID | None = None,
    unreturned_only: bool = False,
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_checkouts(db, job_card_id, unreturned_only)
```

- [ ] **Step 6: Mount tool routers in app/main.py**

Add:
```python
from app.tools.routes import tools_router, checkouts_router
app.include_router(tools_router, prefix="/api/v1")
app.include_router(checkouts_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_tools.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.hr.models import Employee
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def tools_setup(db_session):
    role = Role(name="ToolsAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251988000000", hashed_password=hash_password("password123"), full_name="Tools Admin", role_id=role.id)
    db_session.add(user)

    mechanic = Employee(name="Hassan", job_title="Mechanic", phone="+251900666666")
    db_session.add(mechanic)

    owner = Owner(name="Tool Client", phone="+251900777777")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    vehicle = Vehicle(owner_id=owner.id, model="Hilux", type="Pickup", engine_number="E3", chassis_number="C3", plate_number="DD-99999")
    db_session.add(vehicle)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(mechanic)
    await db_session.refresh(vehicle)

    job_card = JobCard(
        vehicle_id=vehicle.id, owner_id=owner.id, status=JobStatus.IN_REPAIR.value,
        mileage_km=80000, description="Repair work", created_by=user.id,
    )
    db_session.add(job_card)
    await db_session.commit()
    await db_session.refresh(job_card)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "mechanic_id": str(mechanic.id),
        "job_card_id": str(job_card.id),
    }


@pytest.mark.asyncio
async def test_tool_checkout_and_return(client: AsyncClient, tools_setup):
    h = tools_setup["headers"]

    # Create tool
    tool_resp = await client.post("/api/v1/tools", json={
        "name": "Wrench Set",
        "specifications": "6-piece, metric",
        "total_quantity": 3,
    }, headers=h)
    assert tool_resp.status_code == 201
    tool_id = tool_resp.json()["id"]
    assert tool_resp.json()["available_quantity"] == 3

    # Checkout
    co_resp = await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id,
        "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"],
        "quantity": 2,
    }, headers=h)
    assert co_resp.status_code == 201
    checkout_id = co_resp.json()["id"]

    # Check available quantity reduced
    tool_detail = await client.get(f"/api/v1/tools/{tool_id}", headers=h)
    assert tool_detail.json()["available_quantity"] == 1

    # Return
    ret_resp = await client.patch(f"/api/v1/tools/checkouts/{checkout_id}/return", headers=h)
    assert ret_resp.status_code == 200
    assert ret_resp.json()["checked_in_at"] is not None


@pytest.mark.asyncio
async def test_checkout_exceeds_available(client: AsyncClient, tools_setup):
    h = tools_setup["headers"]
    tool_resp = await client.post("/api/v1/tools", json={
        "name": "Screwdriver",
        "total_quantity": 1,
    }, headers=h)
    tool_id = tool_resp.json()["id"]

    # Checkout all
    await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id,
        "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"],
        "quantity": 1,
    }, headers=h)

    # Try to checkout again — should fail
    resp = await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id,
        "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"],
        "quantity": 1,
    }, headers=h)
    assert resp.status_code == 422
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_tools.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/tools/ tests/test_tools.py app/main.py
git commit -m "feat: add tool management with checkout/return and availability tracking"
```

---

## Task 11: Notifications Module

**Files:**
- Create: `app/notifications/__init__.py`
- Create: `app/notifications/models.py`
- Create: `app/notifications/schemas.py`
- Create: `app/notifications/service.py`
- Create: `app/notifications/routes.py`
- Create: `tests/test_notifications.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create app/notifications/__init__.py** (empty)

- [ ] **Step 2: Create app/notifications/models.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    role_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
```

- [ ] **Step 3: Create app/notifications/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    role_id: uuid.UUID | None
    title: str
    message: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create app/notifications/service.py**

```python
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.models import Notification


async def create_notification(
    db: AsyncSession,
    title: str,
    message: str,
    user_id: uuid.UUID | None = None,
    role_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        role_id=role_id,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def list_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    unread: bool = False,
) -> list[Notification]:
    query = select(Notification).where(
        or_(
            Notification.user_id == user_id,
            Notification.role_id == role_id,
        )
    ).order_by(Notification.created_at.desc())
    if unread:
        query = query.where(Notification.is_read == False)
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, notification_id: uuid.UUID) -> Notification | None:
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
    return notif
```

- [ ] **Step 5: Create app/notifications/routes.py**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.deps import get_current_user
from app.db import get_db
from app.notifications import schemas, service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[schemas.NotificationResponse])
async def list_notifications(
    unread: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_notifications(db, current_user.id, current_user.role_id, unread)


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = await service.mark_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif
```

- [ ] **Step 6: Mount notification router in app/main.py**

Add:
```python
from app.notifications.routes import router as notifications_router
app.include_router(notifications_router, prefix="/api/v1")
```

- [ ] **Step 7: Write tests**

Create `tests/test_notifications.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.notifications.models import Notification
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def notif_setup(db_session):
    role = Role(name="NotifAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251999000000", hashed_password=hash_password("password123"), full_name="Notif User", role_id=role.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Create a notification for this user
    notif = Notification(user_id=user.id, title="Low Stock", message="Headlight stock below threshold", entity_type="inventory_item")
    db_session.add(notif)
    await db_session.commit()
    await db_session.refresh(notif)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "notification_id": str(notif.id),
    }


@pytest.mark.asyncio
async def test_list_notifications(client: AsyncClient, notif_setup):
    resp = await client.get("/api/v1/notifications", headers=notif_setup["headers"])
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_mark_notification_read(client: AsyncClient, notif_setup):
    nid = notif_setup["notification_id"]
    resp = await client.patch(f"/api/v1/notifications/{nid}/read", headers=notif_setup["headers"])
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    # Unread filter should exclude it
    resp2 = await client.get("/api/v1/notifications?unread=true", headers=notif_setup["headers"])
    ids = [n["id"] for n in resp2.json()]
    assert nid not in ids
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/test_notifications.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/notifications/ tests/test_notifications.py app/main.py
git commit -m "feat: add notifications module with polling-based read/unread"
```

---

## Task 12: Database Seed Command & Final Wiring

**Files:**
- Create: `app/seed.py`
- Modify: `app/.env.example`

- [ ] **Step 1: Create app/seed.py**

```python
import asyncio

from sqlalchemy import select

from app.auth.models import Role, SystemSetting, User
from app.config import get_settings
from app.core.security import hash_password
from app.db import async_session


async def seed():
    settings = get_settings()
    async with async_session() as db:
        # Check if Super Admin role exists
        result = await db.execute(select(Role).where(Role.name == "Super Admin"))
        role = result.scalar_one_or_none()

        if not role:
            role = Role(name="Super Admin", is_superadmin=True)
            db.add(role)
            await db.flush()
            print("Created 'Super Admin' role")

        # Check if admin user exists
        result = await db.execute(select(User).where(User.phone == settings.admin_phone))
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                phone=settings.admin_phone,
                hashed_password=hash_password(settings.admin_password),
                full_name="System Administrator",
                role_id=role.id,
            )
            db.add(admin)
            print(f"Created admin user with phone: {settings.admin_phone}")

        # Seed default settings
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "vat_rate"))
        if not result.scalar_one_or_none():
            db.add(SystemSetting(key="vat_rate", value="15.0"))
            print("Created default VAT rate setting: 15.0%")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 2: Update .env.example with all env vars**

```
API_PORT=8000

POSTGRES_DB=gms
POSTGRES_USER=gms
POSTGRES_PASSWORD=gms
POSTGRES_PORT=5432

REDIS_PORT=6379

DATABASE_URL=postgresql+asyncpg://gms:gms@postgres:5432/gms
REDIS_URL=redis://redis:6379/0
APP_NAME=GMS Backend
ENVIRONMENT=development

# JWT
JWT_SECRET_KEY=change-me-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Default Admin
ADMIN_PHONE=+251900000000
ADMIN_PASSWORD=admin123

# SMTP (for performa emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && python -m pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 4: Generate initial Alembic migration**

Run: `cd /Users/macbook/Desktop/Nate/GMS/backend && alembic revision --autogenerate -m "initial schema"`
Expected: Migration file created in `alembic/versions/`.

- [ ] **Step 5: Commit**

```bash
git add app/seed.py .env.example alembic/
git commit -m "feat: add seed command, update env example, generate initial migration"
```

---

## Summary

| Task | Module | What it builds |
|------|--------|---------------|
| 1 | Setup | Dependencies, Alembic, config |
| 2 | Core | JWT + password hashing |
| 3 | Auth | Models, schemas, service |
| 4 | Core | RBAC middleware, audit logging |
| 5 | Auth | Routes, main app wiring |
| 6 | HR | Employee directory CRUD |
| 7 | Job Cards | Owners, vehicles, job cards with state machine |
| 8 | Inventory | Multi-store inventory with stock tracking |
| 9 | Performa | Quotations with VAT, versioning, send stub |
| 10 | Tools | Tool checkout/return with availability |
| 11 | Notifications | In-app notifications with polling |
| 12 | Seed | Admin seeding, migration, final wiring |
