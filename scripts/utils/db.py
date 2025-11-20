"""
Database utilities for populating Supabase with packs and tracks.
"""
import os
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Optional
from contextlib import contextmanager


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.

    Yields:
        psycopg2 connection object
    """
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    conn = psycopg2.connect(database_url)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def create_pack(name: str, description: Optional[str] = None, tags: Optional[List[str]] = None) -> str:
    """
    Create a new pack in the database.

    Args:
        name: Pack name
        description: Optional pack description
        tags: Optional list of tags for categorization (genre, decade, difficulty, etc.)

    Returns:
        The UUID of the created pack
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO packs (name, description, tags)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (name, description, tags or [])
        )

        pack_id = cursor.fetchone()[0]
        cursor.close()

        tags_str = f" with tags: {', '.join(tags)}" if tags else ""
        print(f"Created pack: {name}{tags_str} (ID: {pack_id})")
        return pack_id


def add_tracks_to_pack(pack_id: str, tracks: List[Dict[str, str]]) -> int:
    """
    Add multiple tracks to a pack.

    Args:
        pack_id: UUID of the pack
        tracks: List of track dicts with 'title', 'artist', 'spotify_id'

    Returns:
        Number of tracks added
    """
    if not tracks:
        return 0

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Prepare data for bulk insert
        values = [
            (pack_id, track['title'], track['artist'], track['spotify_id'])
            for track in tracks
        ]

        # Bulk insert
        execute_values(
            cursor,
            """
            INSERT INTO tracks (pack_id, title, artist, spotify_id)
            VALUES %s
            """,
            values
        )

        cursor.close()

        print(f"Added {len(tracks)} tracks to pack {pack_id}")
        return len(tracks)


def get_all_packs() -> List[Dict]:
    """
    Get all packs from the database.

    Returns:
        List of pack dicts with 'id', 'name', 'description', 'tags', 'track_count'
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                p.id,
                p.name,
                p.description,
                p.tags,
                p.created_at,
                COUNT(t.id) as track_count
            FROM packs p
            LEFT JOIN tracks t ON t.pack_id = p.id
            GROUP BY p.id, p.name, p.description, p.tags, p.created_at
            ORDER BY p.created_at DESC
            """
        )

        packs = []
        for row in cursor.fetchall():
            packs.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'tags': row[3] or [],
                'created_at': row[4],
                'track_count': row[5]
            })

        cursor.close()
        return packs


def get_pack_tracks(pack_id: str) -> List[Dict]:
    """
    Get all tracks for a specific pack.

    Args:
        pack_id: UUID of the pack

    Returns:
        List of track dicts
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, title, artist, spotify_id, created_at
            FROM tracks
            WHERE pack_id = %s
            ORDER BY created_at
            """,
            (pack_id,)
        )

        tracks = []
        for row in cursor.fetchall():
            tracks.append({
                'id': row[0],
                'title': row[1],
                'artist': row[2],
                'spotify_id': row[3],
                'created_at': row[4]
            })

        cursor.close()
        return tracks
