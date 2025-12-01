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
    Add multiple tracks to a pack (with deduplication).

    This function uses the normalized schema:
    1. Upserts tracks into the tracks table (by spotify_id)
    2. Creates associations in pack_tracks table

    Args:
        pack_id: UUID of the pack
        tracks: List of track dicts with 'title', 'artist', 'spotify_id'
               and optionally 'release_year', 'album_name', 'primary_genre',
               'genres', 'spotify_popularity', 'isrc'

    Returns:
        Number of tracks added to pack
    """
    if not tracks:
        return 0

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Step 1: Upsert tracks (insert or update if spotify_id exists)
        track_values = [
            (
                track['spotify_id'],
                track['title'],
                track['artist'],
                track.get('album_name'),
                track.get('release_year'),
                track.get('primary_genre'),
                track.get('genres'),  # Array field
                track.get('spotify_popularity'),
                track.get('isrc')
            )
            for track in tracks
        ]

        execute_values(
            cursor,
            """
            INSERT INTO tracks (spotify_id, title, artist, album_name, release_year, primary_genre, genres, spotify_popularity, isrc)
            VALUES %s
            ON CONFLICT (spotify_id)
            DO UPDATE SET
                title = EXCLUDED.title,
                artist = EXCLUDED.artist,
                album_name = COALESCE(EXCLUDED.album_name, tracks.album_name),
                release_year = COALESCE(EXCLUDED.release_year, tracks.release_year),
                primary_genre = COALESCE(EXCLUDED.primary_genre, tracks.primary_genre),
                genres = COALESCE(EXCLUDED.genres, tracks.genres),
                spotify_popularity = COALESCE(EXCLUDED.spotify_popularity, tracks.spotify_popularity),
                isrc = COALESCE(EXCLUDED.isrc, tracks.isrc),
                updated_at = NOW()
            """,
            track_values
        )

        # Step 2: Get track IDs for linking
        spotify_ids = [track['spotify_id'] for track in tracks]
        placeholders = ','.join(['%s'] * len(spotify_ids))

        cursor.execute(
            f"""
            SELECT id, spotify_id FROM tracks
            WHERE spotify_id IN ({placeholders})
            """,
            spotify_ids
        )

        id_lookup = {row[1]: row[0] for row in cursor.fetchall()}

        # Step 3: Link tracks to pack
        link_values = [
            (pack_id, id_lookup[track['spotify_id']], i + 1)
            for i, track in enumerate(tracks)
            if track['spotify_id'] in id_lookup
        ]

        execute_values(
            cursor,
            """
            INSERT INTO pack_tracks (pack_id, track_id, position)
            VALUES %s
            ON CONFLICT (pack_id, track_id) DO NOTHING
            """,
            link_values
        )

        cursor.close()

        print(f"Added {len(link_values)} tracks to pack {pack_id}")
        return len(link_values)


def update_track_metadata(track_id: str, release_year: Optional[int] = None,
                         album_name: Optional[str] = None,
                         primary_genre: Optional[str] = None) -> None:
    """
    Update metadata for an existing track.

    Args:
        track_id: UUID of the track
        release_year: Release year (optional)
        album_name: Album name (optional)
        primary_genre: Primary genre (optional)
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE tracks
            SET release_year = %s,
                album_name = %s,
                primary_genre = %s
            WHERE id = %s
            """,
            (release_year, album_name, primary_genre, track_id)
        )

        cursor.close()


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
            SELECT id, title, artist, spotify_id, release_year, album_name, genres, created_at
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
                'release_year': row[4],
                'album_name': row[5],
                'genres': row[6],
                'created_at': row[7]
            })

        cursor.close()
        return tracks
