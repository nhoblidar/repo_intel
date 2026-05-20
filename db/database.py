"""
Database connection — async SQLAlchemy with connection pooling.
Supports both Supabase (recommended) and bare PostgreSQL.
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from db.models.models import Base

# ── Connection string ─────────────────────────────────────────────────────
# Priority order:
#   1. DATABASE_URL (full async URL — preferred for Supabase)
#   2. Individual env vars (fallback for bare Postgres)
#
# Supabase:
#   DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
#
# Local dev:
#   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/repointel

def _build_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if url:
        # Supabase sometimes provides postgres:// — fix the driver prefix
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Build from parts
    user     = os.getenv("DB_USER",     "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    host     = os.getenv("DB_HOST",     "localhost")
    port     = os.getenv("DB_PORT",     "5432")
    name     = os.getenv("DB_NAME",     "repointel")
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{name}"


DATABASE_URL = _build_url()

# ── Engine ────────────────────────────────────────────────────────────────
# NullPool is recommended for serverless / short-lived processes.
# For a long-running FastAPI server, use the default pool instead.
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",   # SQL logging
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Session dependency (FastAPI) ───────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency — inject an async DB session.

    Usage:
        @app.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Context manager (non-FastAPI use) ─────────────────────────────────────
@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """For use outside of FastAPI route handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Create all tables (dev / testing only) ────────────────────────────────
async def create_tables():
    """
    Creates all tables from the ORM models.
    In production, prefer running the SQL migration directly.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database tables created")


async def drop_tables():
    """Drop all tables — DESTRUCTIVE, dev only."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("⚠ All tables dropped")
