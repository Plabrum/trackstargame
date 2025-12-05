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
    Add multiple tracks to a pack with artist normalization.

    This function uses the normalized schema:
    1. Upserts tracks into the tracks table (by spotify_id)
    2. Extracts and upserts artists (by spotify_artist_id or name)
    3. Creates track_artists associations (preserving artist order)
    4. Creates pack_tracks associations

    Args:
        pack_id: UUID of the pack
        tracks: List of track dicts with required keys:
               - 'title', 'spotify_id'
               - 'artist_ids' (list), 'artist_names' (list) OR 'artist' (comma-separated string)
               Optional keys:
               - 'release_year', 'album_name', 'spotify_popularity', 'isrc'

    Returns:
        Number of tracks added to pack
    """
    if not tracks:
        return 0

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Step 1: Upsert tracks (without artist/genre fields)
        track_values = [
            (
                track['spotify_id'],
                track['title'],
                track.get('album_name'),
                track.get('album_image_url'),
                track.get('release_year'),
                track.get('spotify_popularity'),
                track.get('isrc')
            )
            for track in tracks
        ]

        execute_values(
            cursor,
            """
            INSERT INTO tracks (spotify_id, title, album_name, album_image_url, release_year, spotify_popularity, isrc)
            VALUES %s
            ON CONFLICT (spotify_id)
            DO UPDATE SET
                title = EXCLUDED.title,
                album_name = COALESCE(EXCLUDED.album_name, tracks.album_name),
                album_image_url = COALESCE(EXCLUDED.album_image_url, tracks.album_image_url),
                release_year = COALESCE(EXCLUDED.release_year, tracks.release_year),
                spotify_popularity = COALESCE(EXCLUDED.spotify_popularity, tracks.spotify_popularity),
                isrc = COALESCE(EXCLUDED.isrc, tracks.isrc),
                updated_at = NOW()
            """,
            track_values
        )

        # Step 2: Collect all unique artists from all tracks
        all_artists = {}  # {(spotify_artist_id, name): genres} or {(None, name): None}

        for track in tracks:
            # Get artist data from track (either new format or fallback)
            if 'artist_ids' in track and 'artist_names' in track:
                # New format with artist arrays
                artist_ids = track['artist_ids']
                artist_names = track['artist_names']
                for i, name in enumerate(artist_names):
                    spotify_id = artist_ids[i] if i < len(artist_ids) else None
                    key = (spotify_id, name)
                    if key not in all_artists:
                        all_artists[key] = None  # Genres will be backfilled later
            elif 'artist' in track:
                # Fallback: parse comma-separated string
                for name in track['artist'].split(','):
                    name = name.strip()
                    if name:
                        key = (None, name)
                        if key not in all_artists:
                            all_artists[key] = None

        # Step 3: Upsert artists
        artist_values = [
            (spotify_id, name) for (spotify_id, name) in all_artists.keys()
        ]

        execute_values(
            cursor,
            """
            INSERT INTO artists (spotify_artist_id, name)
            VALUES %s
            ON CONFLICT (spotify_artist_id)
            DO UPDATE SET
                name = COALESCE(EXCLUDED.name, artists.name)
            WHERE artists.spotify_artist_id IS NOT NULL
            """,
            [(sid, name) for (sid, name) in artist_values if sid is not None]
        )

        # Also insert artists without Spotify IDs (by name only - may create duplicates)
        name_only_artists = [(name,) for (sid, name) in artist_values if sid is None]
        if name_only_artists:
            execute_values(
                cursor,
                """
                INSERT INTO artists (name)
                VALUES %s
                ON CONFLICT DO NOTHING
                """,
                name_only_artists
            )

        # Step 4: Build artist lookup: {(spotify_id, name): artist_id}
        all_spotify_ids = [sid for (sid, _) in artist_values if sid is not None]
        all_names = [name for (_, name) in artist_values]

        cursor.execute(
            """
            SELECT id, spotify_artist_id, name FROM artists
            WHERE spotify_artist_id = ANY(%s) OR LOWER(name) = ANY(%s)
            """,
            (all_spotify_ids, [n.lower() for n in all_names])
        )

        artist_lookup = {}
        for row in cursor.fetchall():
            artist_id, spotify_id, name = row
            # Prioritize lookup by spotify_artist_id
            if spotify_id:
                artist_lookup[(spotify_id, name)] = artist_id
            # Also index by lowercase name for fallback
            artist_lookup[(None, name.lower())] = artist_id

        # Step 5: Get track IDs
        spotify_ids = [track['spotify_id'] for track in tracks]
        placeholders = ','.join(['%s'] * len(spotify_ids))
        cursor.execute(
            f"""
            SELECT id, spotify_id FROM tracks
            WHERE spotify_id IN ({placeholders})
            """,
            spotify_ids
        )
        track_id_lookup = {row[1]: row[0] for row in cursor.fetchall()}

        # Step 6: Create track_artists associations (preserving position)
        track_artist_values = []
        for track in tracks:
            track_id = track_id_lookup.get(track['spotify_id'])
            if not track_id:
                continue

            # Get artist list
            if 'artist_ids' in track and 'artist_names' in track:
                artist_list = list(zip(track['artist_ids'], track['artist_names']))
            elif 'artist' in track:
                artist_list = [(None, name.strip()) for name in track['artist'].split(',') if name.strip()]
            else:
                artist_list = []

            for position, (spotify_id, name) in enumerate(artist_list, start=1):
                # Lookup artist_id
                artist_id = artist_lookup.get((spotify_id, name))
                if not artist_id:
                    # Fallback to case-insensitive name lookup
                    artist_id = artist_lookup.get((None, name.lower()))

                if artist_id:
                    track_artist_values.append((track_id, artist_id, position))

        if track_artist_values:
            execute_values(
                cursor,
                """
                INSERT INTO track_artists (track_id, artist_id, position)
                VALUES %s
                ON CONFLICT (track_id, artist_id) DO NOTHING
                """,
                track_artist_values
            )

        # Step 7: Link tracks to pack
        link_values = [
            (pack_id, track_id_lookup[track['spotify_id']], i + 1)
            for i, track in enumerate(tracks)
            if track['spotify_id'] in track_id_lookup
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
        print(f"  - Created/updated {len(all_artists)} unique artists")
        print(f"  - Created {len(track_artist_values)} track-artist associations")
        return len(link_values)


def update_track_metadata(track_id: str, release_year: Optional[int] = None,
                         album_name: Optional[str] = None) -> None:
    """
    Update metadata for an existing track.

    Note: Genres are now managed at the artist level through the track_artists
    association. Use artist enrichment scripts to update genre data.

    Args:
        track_id: UUID of the track
        release_year: Release year (optional)
        album_name: Album name (optional)
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE tracks
            SET release_year = %s,
                album_name = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (release_year, album_name, track_id)
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
    Get all tracks for a specific pack using normalized schema.

    Args:
        pack_id: UUID of the pack

    Returns:
        List of track dicts with computed artist and genre data from normalized tables
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                t.id, t.title, t.spotify_id, t.release_year,
                t.album_name, t.spotify_popularity, t.isrc, t.created_at,
                -- Aggregate artist names (comma-separated, ordered by position)
                STRING_AGG(a.name, ', ' ORDER BY ta.position) as artist,
                -- Aggregate all genres from all artists (as array)
                ARRAY_AGG(DISTINCT genre ORDER BY genre) FILTER (WHERE genre IS NOT NULL) as genres,
                -- Get first artist's first genre as primary_genre
                (
                    SELECT ar.genres[1]
                    FROM track_artists tar
                    JOIN artists ar ON ar.id = tar.artist_id
                    WHERE tar.track_id = t.id
                    ORDER BY tar.position
                    LIMIT 1
                ) as primary_genre
            FROM pack_tracks pt
            JOIN tracks t ON t.id = pt.track_id
            LEFT JOIN track_artists ta ON ta.track_id = t.id
            LEFT JOIN artists a ON a.id = ta.artist_id
            LEFT JOIN LATERAL unnest(a.genres) AS genre ON true
            WHERE pt.pack_id = %s
            GROUP BY t.id, t.title, t.spotify_id, t.release_year,
                     t.album_name, t.spotify_popularity, t.isrc, t.created_at
            ORDER BY pt.position
            """,
            (pack_id,)
        )

        tracks = []
        for row in cursor.fetchall():
            tracks.append({
                'id': row[0],
                'title': row[1],
                'spotify_id': row[2],
                'release_year': row[3],
                'album_name': row[4],
                'spotify_popularity': row[5],
                'isrc': row[6],
                'created_at': row[7],
                'artist': row[8] or 'Unknown Artist',
                'genres': row[9] or [],
                'primary_genre': row[10]
            })

        cursor.close()
        return tracks
