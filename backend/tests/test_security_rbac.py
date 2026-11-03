import uuid

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from httpx import AsyncClient
from sqlalchemy import select

from app.audit.models import AuditLog
from app.auth.models import Role, RolePermission, User
from app.core.deps import get_current_user
from app.core.rbac import RequirePermission
from app.core.security import create_access_token, hash_password
from app.main import app


PUBLIC_API_ROUTES = {
    ("/api/v1/auth/login", "POST"),
    ("/api/v1/auth/refresh", "POST"),
    ("/api/v1/auth/logout", "POST"),
}


def dependency_calls(dependant):
    for dependency in dependant.dependencies:
        yield dependency.call
        yield from dependency_calls(dependency)


def test_every_api_route_has_an_authentication_contract():
    uncovered: list[str] = []
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/api/v1"):
            continue
        for method in route.methods:
            if (route.path, method) in PUBLIC_API_ROUTES:
                continue
            calls = list(dependency_calls(route.dependant))
            if not any(call is get_current_user or isinstance(call, RequirePermission) for call in calls):
                uncovered.append(f"{method} {route.path}")
    assert uncovered == []


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"user_id": str(user.id), "role_id": str(user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_every_declared_route_permission_denies_wrong_role_and_allows_correct_and_superadmin(db_session):
    permission_checks: dict[str, set[str]] = {}
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/api/v1"):
            continue
        for call in dependency_calls(route.dependant):
            if isinstance(call, RequirePermission):
                permission_checks.setdefault(call.module, set()).add(call.action)

    correct_role = Role(name="Route Contract Role")
    wrong_role = Role(name="Wrong Route Role")
    super_role = Role(name="Route Super Admin", is_superadmin=True)
    db_session.add_all([correct_role, wrong_role, super_role])
    await db_session.flush()
    for module, actions in permission_checks.items():
        db_session.add(RolePermission(
            role_id=correct_role.id,
            module=module,
            can_create="create" in actions,
            can_read="read" in actions,
            can_update="update" in actions,
            can_delete="delete" in actions,
        ))
    correct_user = User(phone="+251900010001", hashed_password=hash_password("password123"), full_name="Correct", role_id=correct_role.id)
    wrong_user = User(phone="+251900010002", hashed_password=hash_password("password123"), full_name="Wrong", role_id=wrong_role.id)
    super_user = User(phone="+251900010003", hashed_password=hash_password("password123"), full_name="Super", role_id=super_role.id)
    db_session.add_all([correct_user, wrong_user, super_user])
    await db_session.commit()

    for module, actions in permission_checks.items():
        for action in actions:
            dependency = RequirePermission(module, action)
            assert await dependency(correct_user, db_session) is correct_user
            assert await dependency(super_user, db_session) is super_user
            with pytest.raises(HTTPException) as denied:
                await dependency(wrong_user, db_session)
            assert denied.value.status_code == 403


@pytest.mark.asyncio
async def test_separated_modules_enforce_runtime_access(client: AsyncClient, db_session):
    modules = {"users", "roles", "payments", "invoices", "backups", "audit", "settings"}
    correct_role = Role(name="Separated Reader")
    wrong_role = Role(name="No Access")
    super_role = Role(name="Runtime Super", is_superadmin=True)
    db_session.add_all([correct_role, wrong_role, super_role])
    await db_session.flush()
    for module in modules:
        db_session.add(RolePermission(role_id=correct_role.id, module=module, can_read=True))
    correct_user = User(phone="+251900020001", hashed_password=hash_password("password123"), full_name="Reader", role_id=correct_role.id)
    wrong_user = User(phone="+251900020002", hashed_password=hash_password("password123"), full_name="Denied", role_id=wrong_role.id)
    super_user = User(phone="+251900020003", hashed_password=hash_password("password123"), full_name="Admin", role_id=super_role.id)
    db_session.add_all([correct_user, wrong_user, super_user])
    await db_session.commit()

    missing_id = uuid.uuid4()
    endpoints = {
        "/api/v1/auth/users": 200,
        "/api/v1/roles/": 200,
        f"/api/v1/payments/invoice/{missing_id}": 404,
        "/api/v1/invoices/": 200,
        "/api/v1/backups/": 200,
        "/api/v1/audit-logs/": 200,
        "/api/v1/settings/": 200,
    }
    for endpoint, allowed_status in endpoints.items():
        assert (await client.get(endpoint)).status_code == 403
        assert (await client.get(endpoint, headers=auth_headers(wrong_user))).status_code == 403
        assert (await client.get(endpoint, headers=auth_headers(correct_user))).status_code == allowed_status
        assert (await client.get(endpoint, headers=auth_headers(super_user))).status_code == allowed_status


@pytest.mark.asyncio
async def test_non_superadmin_cannot_escalate_privileges_or_manage_superadmin(client: AsyncClient, db_session):
    actor_role = Role(name="Delegated User Manager")
    elevated_role = Role(name="Financial Controller")
    super_role = Role(name="Protected Super", is_superadmin=True)
    db_session.add_all([actor_role, elevated_role, super_role])
    await db_session.flush()
    for module in ("users", "roles"):
        db_session.add(RolePermission(
            role_id=actor_role.id,
            module=module,
            can_create=True,
            can_read=True,
            can_update=True,
            can_delete=True,
        ))
    db_session.add(RolePermission(role_id=elevated_role.id, module="payments", can_update=True))
    actor = User(phone="+251900030001", hashed_password=hash_password("password123"), full_name="Manager", role_id=actor_role.id)
    protected = User(phone="+251900030002", hashed_password=hash_password("password123"), full_name="Protected", role_id=super_role.id)
    elevated_user = User(phone="+251900030004", hashed_password=hash_password("password123"), full_name="Controller", role_id=elevated_role.id)
    db_session.add_all([actor, protected, elevated_user])
    await db_session.commit()
    headers = auth_headers(actor)

    assign_elevated = await client.post("/api/v1/auth/users", json={
        "phone": "+251900030003",
        "password": "StrongPass123!",
        "full_name": "Escalated User",
        "role_id": str(elevated_role.id),
    }, headers=headers)
    assert assign_elevated.status_code == 403

    create_super_role = await client.post(
        "/api/v1/roles/",
        json={"name": "Unauthorized Super", "is_superadmin": True},
        headers=headers,
    )
    assert create_super_role.status_code == 403

    grant_payment = await client.put(
        f"/api/v1/roles/{actor_role.id}/permissions",
        json=[{"module": "payments", "can_update": True}],
        headers=headers,
    )
    assert grant_payment.status_code == 403

    reset_super_password = await client.patch(
        f"/api/v1/auth/users/{protected.id}/password",
        json={"new_password": "AnotherPass123!"},
        headers=headers,
    )
    assert reset_super_password.status_code == 403

    reset_elevated_password = await client.patch(
        f"/api/v1/auth/users/{elevated_user.id}/password",
        json={"new_password": "AnotherPass123!"},
        headers=headers,
    )
    assert reset_elevated_password.status_code == 403


@pytest.mark.asyncio
async def test_final_active_superadmin_cannot_be_deactivated_demoted_or_deleted(client: AsyncClient, db_session):
    super_role = Role(name="Final Super", is_superadmin=True)
    standard_role = Role(name="Standard")
    db_session.add_all([super_role, standard_role])
    await db_session.flush()
    admin = User(phone="+251900040001", hashed_password=hash_password("password123"), full_name="Final Admin", role_id=super_role.id)
    db_session.add(admin)
    await db_session.commit()
    headers = auth_headers(admin)

    deactivate = await client.patch(
        f"/api/v1/auth/users/{admin.id}", json={"is_active": False}, headers=headers,
    )
    assert deactivate.status_code == 409
    demote = await client.patch(
        f"/api/v1/auth/users/{admin.id}", json={"role_id": str(standard_role.id)}, headers=headers,
    )
    assert demote.status_code == 409
    delete = await client.delete(f"/api/v1/auth/users/{admin.id}", headers=headers)
    assert delete.status_code == 409


@pytest.mark.asyncio
async def test_audit_logs_are_append_only(db_session):
    role = Role(name="Audit Owner", is_superadmin=True)
    db_session.add(role)
    await db_session.flush()
    user = User(phone="+251900050001", hashed_password=hash_password("password123"), full_name="Audit Owner", role_id=role.id)
    db_session.add(user)
    await db_session.flush()
    user_id = user.id
    first = AuditLog(user_id=user_id, action="original", entity_type="user", entity_id=user_id)
    db_session.add(first)
    await db_session.commit()

    first.action = "changed"
    with pytest.raises(ValueError, match="append-only"):
        await db_session.commit()
    await db_session.rollback()

    second = AuditLog(user_id=user_id, action="second", entity_type="user", entity_id=user_id)
    db_session.add(second)
    await db_session.commit()
    await db_session.delete(second)
    with pytest.raises(ValueError, match="append-only"):
        await db_session.commit()
    await db_session.rollback()

    actions = set((await db_session.scalars(select(AuditLog.action))).all())
    assert actions == {"original", "second"}
