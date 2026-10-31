import sqlite3
from pathlib import Path
from contextlib import closing


# Database location
ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "feedback.sqlite3"


def get_connection():
    """Create a SQLite database connection."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db():
    """Create the feedback table if it does not exist."""

    with closing(get_connection()) as conn:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS response_feedback (
                    message_id TEXT PRIMARY KEY,
                    rating TEXT CHECK (
                        rating IN ('up', 'down')
                    ),
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    rated_at TEXT
                )
            """)


def register_message(message_id: str):
    """Register a generated AI response."""

    with closing(get_connection()) as conn:
        with conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO response_feedback
                (message_id)
                VALUES (?)
                """,
                (message_id,)
            )


def save_feedback(message_id: str, rating: str) -> bool:
    """Save or update feedback for an existing response."""

    if rating not in ("up", "down"):
        raise ValueError("Invalid rating.")

    with closing(get_connection()) as conn:
        with conn:
            cursor = conn.execute(
                """
                UPDATE response_feedback
                SET rating = ?, rated_at = CURRENT_TIMESTAMP
                WHERE message_id = ?
                """,
                (rating, message_id)
            )

            return cursor.rowcount > 0


def get_feedback(message_id: str):
    """Retrieve the rating associated with a response."""

    with closing(get_connection()) as conn:
        row = conn.execute(
            """
            SELECT rating
            FROM response_feedback
            WHERE message_id = ?
            """,
            (message_id,)
        ).fetchone()

    return row[0] if row else None
