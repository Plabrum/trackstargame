#!/usr/bin/env python3
"""
Backfill missing genre data using Last.fm API.

This script finds tracks without genre data and fetches genre information
from Last.fm to fill in the gaps.
"""
import os
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from psycopg2.extras import Json
from utils.db import get_db_connection

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Also load from parent directory
env_parent = Path(__file__).parent.parent / '.env'
if env_parent.exists():
    load_dotenv(env_parent)

env_local = Path(__file__).parent.parent / '.env.local'
if env_local.exists():
    load_dotenv(env_local)

# Construct DATABASE_URL if needed
if not os.getenv('DATABASE_URL'):
    db_password = os.getenv('DB_PASSWORD')
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    if db_password and supabase_url:
        project_ref = supabase_url.replace('https://', '').split('.')[0]
        database_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:6543/postgres"
        os.environ['DATABASE_URL'] = database_url


def get_lastfm_genres(artist_name: str, api_key: str, max_genres: int = 5) -> list:
    """
    Fetch genre/tags from Last.fm for an artist.

    Args:
        artist_name: Name of the artist
        api_key: Last.fm API key
        max_genres: Maximum number of genres to return

    Returns:
        List of genre strings, or None if not found
    """
    try:
        url = "http://ws.audioscrobbler.com/2.0/"
        params = {
            'method': 'artist.getinfo',
            'artist': artist_name,
            'api_key': api_key,
            'format': 'json'
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        if 'artist' in data and 'tags' in data['artist']:
            tags = data['artist']['tags']['tag']
            if tags:
                # Return top N genres
                genres = [tag['name'] for tag in tags[:max_genres]]
                print(f"  Last.fm genres: {', '.join(genres)}")
                return genres

        return None

    except Exception as e:
        print(f"  Error fetching from Last.fm: {e}")
        return None


def main():
    """Main entry point."""
    print("Last.fm Genre Backfill Script")
    print("=" * 80)

    # Get Last.fm API key
    lastfm_api_key = os.getenv('LAST_FM_API_KEY')
    if not lastfm_api_key:
        print("Error: LAST_FM_API_KEY not found in environment variables")
        return

    print(f"✓ Last.fm API key loaded\n")

    # Get tracks without genres
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Get distinct artists without genre data
        cursor.execute("""
            SELECT DISTINCT artist, COUNT(*) as track_count
            FROM tracks
            WHERE pack_id = (SELECT id FROM packs WHERE name LIKE '%Every Track Star%' LIMIT 1)
              AND (genres IS NULL OR genres = '{}')
            GROUP BY artist
            ORDER BY track_count DESC
        """)

        artists_to_fetch = cursor.fetchall()
        total_artists = len(artists_to_fetch)

        print(f"Found {total_artists} artists without genre data\n")

        if total_artists == 0:
            print("All tracks already have genre data!")
            return

        # Process each artist
        updated_count = 0
        failed_count = 0

        for i, (artist_name, track_count) in enumerate(artists_to_fetch, 1):
            print(f"[{i}/{total_artists}] {artist_name} ({track_count} tracks)")

            # Fetch genres from Last.fm
            genres = get_lastfm_genres(artist_name, lastfm_api_key)

            if genres:
                # Update all tracks by this artist
                # Note: psycopg2 requires arrays to be passed with proper type casting
                cursor.execute("""
                    UPDATE tracks
                    SET genres = %s::text[]
                    WHERE artist = %s
                      AND pack_id = (SELECT id FROM packs WHERE name LIKE '%Every Track Star%' LIMIT 1)
                      AND (genres IS NULL OR genres = '{}')
                """, (genres, artist_name))

                updated_tracks = cursor.rowcount
                updated_count += updated_tracks
                print(f"  ✓ Updated {updated_tracks} tracks with genres: {genres}\n")
            else:
                failed_count += 1
                print(f"  ✗ No genre data found\n")

            # Rate limiting: Last.fm allows 5 requests per second
            if i < total_artists:
                time.sleep(0.3)

        conn.commit()
        cursor.close()

    # Print summary
    print(f"\n{'='*80}")
    print("BACKFILL SUMMARY")
    print(f"{'='*80}")
    print(f"Artists processed: {total_artists}")
    print(f"Tracks updated: {updated_count}")
    print(f"Artists without Last.fm data: {failed_count}")
    print(f"{'='*80}\n")


if __name__ == '__main__':
    main()
