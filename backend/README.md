## GMS Backend

FastAPI backend with PostgreSQL and Redis, runnable through Docker Compose.

### Setup

```bash
cp .env.example .env
docker compose up --build
```

The API runs at `http://localhost:8000`.

During local development, Docker Compose runs Uvicorn with reload enabled and
bind-mounts `app`, `main.py`, and Alembic files. Python and HTML edits refresh
without rebuilding the image. Rebuild after changing dependencies or the
Dockerfile.

### Health checks

```bash
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
```

`/health/ready` verifies both PostgreSQL and Redis connectivity.

### Deployment configuration

Set these environment variables on the backend host:

```env
ENVIRONMENT=production
CORS_ORIGINS=https://gms-six-lyart.vercel.app
JWT_SECRET_KEY=<long-random-secret>
ADMIN_PHONE=<admin-phone>
ADMIN_PASSWORD=<strong-unique-password>
```

Set this environment variable in the Vercel project for Production and Preview,
then redeploy so Next.js embeds it in the browser bundle:

```env
NEXT_PUBLIC_API_URL=https://gms-vawp.onrender.com/api/v1
```

`CORS_ORIGINS` is a comma-separated allowlist without trailing slashes. Add a
preview domain explicitly when a Vercel preview deployment needs API access.

### Production Docker deployment

Use `docker-compose.prod.yml`, not the development Compose file. It publishes
only Caddy on ports 80/443; PostgreSQL and Redis have no host ports. Caddy
obtains and renews HTTPS certificates for `API_DOMAIN`.

Create a production `.env` with unique random values for `POSTGRES_PASSWORD`,
`REDIS_PASSWORD`, `JWT_SECRET_KEY`, and the administrator password. Set
`CORS_ORIGINS` to the exact frontend origin and `TRUSTED_HOSTS`/`API_DOMAIN` to
the API hostname. The application refuses to start in production with default
or weak values.

Before the first start, create `BACKUP_PATH` as a protected directory writable
by container user `10001`, then validate and launch the stack:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head
docker compose -f docker-compose.prod.yml run --rm api python -m app.seed
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

The production API runs as a non-root user with a read-only root filesystem,
limited CPU/memory, and `no-new-privileges`. `/health/ready` returns HTTP 503
unless both PostgreSQL and Redis are reachable.

### Seeded access roles

Run the idempotent seed after migrations:

```bash
python -m app.seed
```

The seed always creates and synchronizes these roles:

- `Super Admin`: unrestricted through the superadmin flag.
- `Inventory Manager`: inventory create, read, update, and delete only.
- `Tools Manager`: tools create, read, update, and delete only.
- `Job Card Officer`: job-card create/read/update, inventory read/use, tools
  read/checkout/return, and employee read access. It cannot delete job cards.

The administrator is created from `ADMIN_PHONE` and `ADMIN_PASSWORD`.
Operational users are optional and are created only when the corresponding
password is configured:

```env
SEED_INVENTORY_PHONE=+251900000101
SEED_INVENTORY_PASSWORD=<strong-unique-password>
SEED_TOOLS_PHONE=+251900000102
SEED_TOOLS_PASSWORD=<strong-unique-password>
SEED_JOB_CARDS_PHONE=+251900000103
SEED_JOB_CARDS_PASSWORD=<strong-unique-password>
```

Existing user passwords are never reset by rerunning the seed.
