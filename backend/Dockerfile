FROM postgres:17-alpine AS postgres_tools

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for weasyprint
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libglib2.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Database backup and restore tooling comes from the matching PostgreSQL image.
COPY --from=postgres_tools /lib/ld-musl-x86_64.so.1 /opt/pgtools/lib/ld-musl-x86_64.so.1
COPY --from=postgres_tools /usr/lib/ /opt/pgtools/lib/
COPY --from=postgres_tools /usr/local/lib/ /opt/pgtools/lib/
COPY --from=postgres_tools /usr/local/bin/pg_dump /opt/pgtools/bin/pg_dump
COPY --from=postgres_tools /usr/local/bin/pg_restore /opt/pgtools/bin/pg_restore

RUN printf '#!/bin/sh\nexec /opt/pgtools/lib/ld-musl-x86_64.so.1 --library-path /opt/pgtools/lib /opt/pgtools/bin/pg_dump "$@"\n' > /usr/local/bin/pg_dump \
    && printf '#!/bin/sh\nexec /opt/pgtools/lib/ld-musl-x86_64.so.1 --library-path /opt/pgtools/lib /opt/pgtools/bin/pg_restore "$@"\n' > /usr/local/bin/pg_restore \
    && chmod +x /usr/local/bin/pg_dump /usr/local/bin/pg_restore

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e .

COPY app ./app
COPY main.py ./
COPY alembic.ini ./
COPY alembic ./alembic

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
