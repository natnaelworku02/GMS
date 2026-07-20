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
