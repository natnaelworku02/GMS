import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.config import get_settings

_backup_lock = asyncio.Lock()


def _database_url() -> str:
    return get_settings().database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _backup_dir() -> Path:
    path = Path(get_settings().backup_dir).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def list_backups() -> list[dict]:
    backups = []
    for path in sorted(_backup_dir().glob("gms-*.dump"), reverse=True):
        stat = path.stat()
        backups.append({
            "filename": path.name,
            "size_bytes": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc),
        })
    return backups


async def create_backup() -> dict:
    async with _backup_lock:
        now = datetime.now(timezone.utc)
        path = _backup_dir() / f"gms-{now.strftime('%Y%m%d-%H%M%S')}.dump"
        process = await asyncio.create_subprocess_exec(
            "pg_dump", "--format=custom", "--no-owner", "--dbname", _database_url(), "--file", str(path),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode != 0:
            path.unlink(missing_ok=True)
            raise RuntimeError(stderr.decode().strip() or "Database backup failed")
        await prune_backups()
        stat = path.stat()
        return {"filename": path.name, "size_bytes": stat.st_size, "created_at": now}


async def prune_backups() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=get_settings().backup_retention_days)
    for item in list_backups():
        if item["created_at"] < cutoff:
            (_backup_dir() / item["filename"]).unlink(missing_ok=True)


async def restore_backup(filename: str) -> None:
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name.endswith(".dump"):
        raise ValueError("Invalid backup filename")
    path = _backup_dir() / safe_name
    if not path.is_file():
        raise ValueError("Backup not found")
    async with _backup_lock:
        process = await asyncio.create_subprocess_exec(
            "pg_restore", "--clean", "--if-exists", "--no-owner", "--dbname", _database_url(), str(path),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(stderr.decode().strip() or "Database restore failed")


async def scheduled_backup_loop() -> None:
    while True:
        await asyncio.sleep(get_settings().backup_interval_hours * 60 * 60)
        try:
            await create_backup()
        except Exception:
            # Status endpoint exposes the absence of a recent successful backup.
            pass
