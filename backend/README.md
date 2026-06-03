## GMS Backend

FastAPI backend with PostgreSQL and Redis, runnable through Docker Compose.

### Setup

```bash
cp .env.example .env
docker compose up --build
```

The API runs at `http://localhost:8000`.

### Health checks

```bash
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
```

`/health/ready` verifies both PostgreSQL and Redis connectivity.
