# Garage Management System — Backend Design Spec

## Overview

A FastAPI backend for an end-to-end garage management system. Handles vehicle intake, job tracking, quotations, multi-store inventory, tool accountability, and employee directory. Designed as a modular monolith with a dynamic RBAC system.

## Tech Stack

- **Framework:** FastAPI (async)
- **Database:** PostgreSQL 17 via SQLAlchemy (asyncpg)
- **Cache:** Redis 7
- **Auth:** Phone + password, JWT tokens
- **Email:** SMTP via aiosmtplib
- **PDF:** weasyprint or reportlab
- **Migrations:** Alembic
- **Containerization:** Docker Compose

## Project Structure

```
app/
├── core/
│   ├── security.py        # JWT creation/verification, password hashing
│   ├── rbac.py            # RBAC middleware + permission checker
│   ├── audit.py           # Audit log helper
│   └── deps.py            # FastAPI dependencies (get_db, get_current_user)
├── auth/
│   ├── models.py          # User, Role, RolePermission, SystemSetting
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── hr/
│   ├── models.py          # Employee
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── job_cards/
│   ├── models.py          # JobCard, VehicleCondition, Owner, Vehicle
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── performa/
│   ├── models.py          # Performa, PerformaLineItem
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── inventory/
│   ├── models.py          # InventoryItem, StoreLocation, StockEntry
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── tools/
│   ├── models.py          # Tool, ToolCheckout
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── notifications/
│   ├── models.py          # Notification
│   ├── schemas.py
│   ├── routes.py
│   └── service.py
├── config.py
├── db.py
└── main.py
```

## Data Model

### Auth & RBAC

**users**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| phone | VARCHAR(20) | Unique, indexed |
| hashed_password | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(100) | |
| role_id | UUID | FK → roles |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**roles**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(50) | Unique (e.g. "Super Admin", "Receptionist") |
| is_superadmin | BOOLEAN | Default false, bypasses all permission checks |
| created_at | TIMESTAMP | |

**role_permissions**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| role_id | UUID | FK → roles |
| module | VARCHAR(30) | Enum: job_cards, performa, inventory, tools, hr, users, reports, settings |
| can_create | BOOLEAN | Default false |
| can_read | BOOLEAN | Default false |
| can_update | BOOLEAN | Default false |
| can_delete | BOOLEAN | Default false |

Unique constraint on (role_id, module).

**system_settings**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| key | VARCHAR(50) | Unique (e.g. "vat_rate") |
| value | VARCHAR(255) | (e.g. "15.0") |
| updated_at | TIMESTAMP | |

### HR / Employee Directory

**employees**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| job_title | VARCHAR(50) | e.g. Mechanic, Electrician |
| phone | VARCHAR(20) | |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMP | |

Employees do NOT have login credentials. They are resources assigned to job cards and tool checkouts.

### Job Cards

**owners**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| phone | VARCHAR(20) | Unique, used for deduplication |
| created_at | TIMESTAMP | |

**vehicles**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| owner_id | UUID | FK → owners |
| model | VARCHAR(100) | |
| type | VARCHAR(50) | |
| engine_number | VARCHAR(50) | |
| chassis_number | VARCHAR(50) | |
| plate_number | VARCHAR(20) | Unique |
| created_at | TIMESTAMP | |

**job_cards**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| vehicle_id | UUID | FK → vehicles |
| owner_id | UUID | FK → owners |
| status | VARCHAR(30) | Enum, see state machine below |
| mileage_km | INTEGER | |
| private_paint | BOOLEAN | Default false |
| private_mechanic | BOOLEAN | Default false |
| insurance_provider | VARCHAR(100) | Nullable |
| description | TEXT | |
| remarks | TEXT | Nullable |
| requested_materials | TEXT | Nullable |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**job_card_mechanics** (association table)
| Column | Type | Notes |
|--------|------|-------|
| job_card_id | UUID | FK → job_cards, PK |
| employee_id | UUID | FK → employees, PK |

**vehicle_conditions**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_card_id | UUID | FK → job_cards |
| part_name | VARCHAR(30) | Enum: trunk, lh_body, rh_body, interior, front_body, peripheral |
| condition_state | VARCHAR(20) | Enum: available, damaged, not_available, scratch, broken, crack, dent, bend |

One state per part per job card. Unique constraint on (job_card_id, part_name).

### Performa (Quotation)

**performas**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_card_id | UUID | FK → job_cards |
| version | INTEGER | Starts at 1, increments on revision |
| subtotal | DECIMAL(12,2) | |
| vat_rate | DECIMAL(5,2) | Snapshot from system_settings at creation |
| vat_amount | DECIMAL(12,2) | |
| grand_total | DECIMAL(12,2) | |
| status | VARCHAR(20) | Enum: draft, sent, approved, rejected |
| client_email | VARCHAR(255) | |
| sent_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | |

**performa_line_items**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| performa_id | UUID | FK → performas |
| type | VARCHAR(15) | "repair" or "replacement" |
| description | VARCHAR(255) | |
| inventory_item_id | UUID | FK → inventory_items, nullable (only for replacements) |
| quantity | INTEGER | Default 1 |
| unit_price | DECIMAL(12,2) | Manual for repairs, auto-pulled for replacements |
| total_price | DECIMAL(12,2) | quantity * unit_price |

### Inventory

**store_locations**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | Unique (e.g. "Main Store", "Upper Store") |
| created_at | TIMESTAMP | |

**inventory_items**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| part_name | VARCHAR(100) | |
| applicable_vehicle_types | JSONB | Array of strings |
| unit_price | DECIMAL(12,2) | |
| supplier_info | VARCHAR(255) | Nullable |
| min_stock_threshold | INTEGER | Default 0 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**stock_entries**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| item_id | UUID | FK → inventory_items |
| store_location_id | UUID | FK → store_locations |
| quantity | INTEGER | Per-location stock count |

Unique constraint on (item_id, store_location_id).

### Tools

**tools**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| specifications | VARCHAR(255) | e.g. "160mm, curved" |
| total_quantity | INTEGER | |
| created_at | TIMESTAMP | |

**tool_checkouts**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tool_id | UUID | FK → tools |
| employee_id | UUID | FK → employees |
| job_card_id | UUID | FK → job_cards |
| quantity | INTEGER | |
| checked_out_at | TIMESTAMP | |
| checked_in_at | TIMESTAMP | Nullable (null = still checked out) |
| issued_by | UUID | FK → users |

### Notifications

**notifications**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users, nullable |
| role_id | UUID | FK → roles, nullable |
| title | VARCHAR(200) | |
| message | TEXT | |
| entity_type | VARCHAR(30) | e.g. "job_card", "inventory_item" |
| entity_id | UUID | Nullable |
| is_read | BOOLEAN | Default false |
| created_at | TIMESTAMP | |

### Audit Logs

**audit_logs**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| action | VARCHAR(50) | e.g. "job_card.status_change", "performa.edit" |
| entity_type | VARCHAR(30) | |
| entity_id | UUID | |
| details | JSONB | Freeform context (old/new values, etc.) |
| created_at | TIMESTAMP | Indexed |

No DELETE or UPDATE endpoints exposed for this table.

## Authentication Flow

1. **Login:** `POST /api/v1/auth/login` — `{phone, password}` → `{access_token, refresh_token}`
2. **Refresh:** `POST /api/v1/auth/refresh` — `{refresh_token}` → new `{access_token, refresh_token}`
3. **Token config:** Access token expires in 30 minutes. Refresh token expires in 7 days. Payload: `{user_id, role_id}`.
4. **No self-registration.** Super Admin creates users via `POST /api/v1/auth/users`.
5. **Password reset:** Super Admin resets passwords via `PATCH /api/v1/auth/users/{id}/password`.

### Password Hashing
bcrypt via `passlib`. Passwords must be at least 8 characters.

## RBAC Enforcement

### Predefined Modules
```
job_cards, performa, inventory, tools, hr, users, reports, settings
```

### Middleware Flow
Every protected route declares its requirement:
```python
@router.post("/", dependencies=[RequirePermission("job_cards", "create")])
```

`RequirePermission` dependency:
1. Extracts `user_id` from JWT
2. Loads user's role
3. If role `is_superadmin` → allow
4. Looks up `role_permissions` for role + module
5. Checks the relevant `can_create/can_read/can_update/can_delete` flag
6. Returns 403 if denied

### Seeding
On first run or via CLI command `python -m app.seed`:
- Creates "Super Admin" role with `is_superadmin=True`
- Creates default admin user from env vars: `ADMIN_PHONE`, `ADMIN_PASSWORD`

## Job Card State Machine

```
Pending Inspection → Waiting for Approval → In Repair → Ready for Testing → Completed
                                              ↕
                                        Waiting for Parts
```

### Transition Rules
| From | To | Precondition |
|------|----|-------------|
| Pending Inspection | Waiting for Approval | At least one performa attached |
| Waiting for Approval | In Repair | Performa status = approved; inventory deducted for replacement items |
| In Repair | Waiting for Parts | Manual (stockout occurred) |
| Waiting for Parts | In Repair | Manual (parts arrived) |
| In Repair | Ready for Testing | Manual |
| Ready for Testing | Completed | All tool checkouts for this job card are returned |

Invalid transitions return 422 with a message explaining the unmet precondition.

### Inventory Deduction on Approval
When a performa is approved and the job moves to `In Repair`:
1. For each replacement line item, deduct quantity from the selected store location's `stock_entries`.
2. If insufficient stock at the selected location, return 422 with details.
3. After deduction, check if any item's aggregate stock (sum across all locations) is below `min_stock_threshold`. If so, create a notification for users with `inventory` read permission.

## Performa Flow

1. **Create:** `POST /api/v1/performas` — linked to a job card, with line items.
   - Repair items: manual description + cost.
   - Replacement items: linked to `inventory_item_id`, price auto-pulled.
2. **Calculate:** Subtotal from line items. VAT rate from `system_settings`. Grand total = subtotal + VAT.
3. **Send:** `POST /api/v1/performas/{id}/send` — generates PDF, sends via SMTP. Status → `sent`.
4. **Approve/Reject:** `PATCH /api/v1/performas/{id}/status` — user updates based on client response.
5. **Revise:** `POST /api/v1/performas/{id}/revise` — duplicates performa with incremented version, user edits line items.

### PDF Generation
Render performa as PDF with: company header, client/vehicle info, line items table, subtotal, VAT breakdown, grand total. Library: weasyprint or reportlab.

### Email
SMTP via `aiosmtplib`. Config from env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`. Plain email with PDF attachment.

## Tool Management

### Checkout
`POST /api/v1/tools/checkouts` — Store Manager selects mechanic, job card, tool, quantity. System validates available quantity (`total_quantity - sum of unreturned checkout quantities`). Returns 422 if insufficient.

### Check-in
`PATCH /api/v1/tools/checkouts/{id}/return` — sets `checked_in_at`, restoring available quantity.

### Completion Guard
When job card transitions to `Completed`, query `tool_checkouts WHERE job_card_id = X AND checked_in_at IS NULL`. If any exist, block the transition with 422 listing unreturned tools.

## Notifications

Simple polling-based system. No WebSockets.

**Triggers:**
- Low stock threshold breached → notify users with `inventory` read permission
- Unreturned tools on job completion attempt → notify HR/Admin users
- Performa status change → notify job card creator

**API:**
- `GET /api/v1/notifications?unread=true` — list notifications for current user (by user_id or role_id match)
- `PATCH /api/v1/notifications/{id}/read` — mark as read

## API Routes Summary

All routes under `/api/v1/` prefix.

| Prefix | Module | Key Endpoints |
|--------|--------|---------------|
| `/auth` | Auth | login, refresh, CRUD users, reset password |
| `/roles` | RBAC | CRUD roles, manage permissions |
| `/hr/employees` | HR | CRUD employees |
| `/job-cards` | Job Cards | CRUD job cards, update status, manage conditions, assign mechanics |
| `/owners` | Job Cards | CRUD owners |
| `/vehicles` | Job Cards | CRUD vehicles |
| `/performas` | Performa | CRUD performas, send, approve/reject, revise |
| `/inventory/items` | Inventory | CRUD items |
| `/inventory/locations` | Inventory | CRUD store locations |
| `/inventory/stock` | Inventory | View/update stock per location |
| `/tools` | Tools | CRUD tools |
| `/tools/checkouts` | Tools | Checkout, return, list |
| `/notifications` | Notifications | List, mark read |
| `/settings` | Settings | Get/update system settings |
| `/audit-logs` | Audit | List (read-only) |

## Environment Variables

```
# App
APP_NAME=GMS Backend
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://gms:gms@postgres:5432/gms
REDIS_URL=redis://redis:6379/0

# Auth
JWT_SECRET_KEY=<random-secret>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_PHONE=+251900000000
ADMIN_PASSWORD=<initial-admin-password>

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

## Dependencies to Add

```
alembic
passlib[bcrypt]
python-jose[cryptography]
aiosmtplib
weasyprint
python-multipart
```
