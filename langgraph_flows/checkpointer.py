"""Postgres checkpointer for durable LangGraph state (survives crashes)."""
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

from settings import get_settings


_pool: ConnectionPool | None = None


def get_checkpointer() -> PostgresSaver:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=get_settings().langgraph_database_url,
            min_size=2,
            max_size=10,
            kwargs={"autocommit": True, "prepare_threshold": 0},
        )
        with _pool.connection() as conn:
            PostgresSaver(conn).setup()
    return PostgresSaver(_pool)
