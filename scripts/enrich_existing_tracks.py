#!/usr/bin/env python3
"""
Enrich existing tracks with metadata from Spotify.

This script fetches metadata (release year, album name, primary genre) for
existing tracks in the database and updates them with this information.
"""
import os
import time
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from utils.spotify import SpotifyClient
from utils.db import get_all_packs, get_pack_tracks, update_track_metadata

# Load environment variables from parent directory
# Load .env first (has DB_PASSWORD)
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Then load .env.local (has Supabase and Spotify credentials)
env_local_path = Path(__file__).parent.parent / '.env.local'
if env_local_path.exists():
    load_dotenv(env_local_path)

# Construct DATABASE_URL if not already set
if not os.getenv('DATABASE_URL'):
    db_password = os.getenv('DB_PASSWORD')
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')

    if db_password and supabase_url:
        # Extract project ref from Supabase URL
        # Format: https://[project-ref].supabase.co
        project_ref = supabase_url.replace('https://', '').split('.')[0]
        # Try IPv6 direct connection
        database_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:6543/postgres"
        os.environ['DATABASE_URL'] = database_url


def enrich_pack_tracks(pack_id: str, pack_name: str, spotify_client: SpotifyClient) -> dict:
    """
    Enrich all tracks in a pack with metadata from Spotify.

    Args:
        pack_id: UUID of the pack
        pack_name: Name of the pack (for logging)
        spotify_client: Spotify client instance

    Returns:
        Dict with statistics about the enrichment process
    """
    print(f"\n{'='*80}")
    print(f"Processing pack: {pack_name}")
    print(f"{'='*80}")

    # Only get tracks that need enrichment (no release_year yet)
    from utils.db import get_db_connection

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, artist, spotify_id, release_year, album_name, primary_genre, created_at
            FROM tracks
            WHERE pack_id = %s AND release_year IS NULL
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
                'primary_genre': row[6],
                'created_at': row[7]
            })
        cursor.close()

    total = len(tracks)
    print(f"Found {total} tracks to enrich (skipping already enriched tracks)\n")

    stats = {
        'total': total,
        'success': 0,
        'failed': 0,
        'no_genre': 0,
        'no_year': 0
    }

    for i, track in enumerate(tracks, 1):
        track_id = track['id']
        spotify_id = track['spotify_id']
        title = track['title']
        artist = track['artist']

        print(f"[{i}/{total}] Fetching metadata for: {title} - {artist}")

        try:
            # Get full track data from Spotify
            track_data = spotify_client.sp.track(spotify_id)

            # Extract artist IDs
            artist_ids = [artist['id'] for artist in track_data['artists']]

            # Get release year
            release_date = track_data['album']['release_date']
            release_year = spotify_client._extract_year(release_date)

            # Get album name
            album_name = track_data['album']['name']

            # Get primary genre
            primary_genre = spotify_client._get_primary_genre(artist_ids)

            # Update track in database
            update_track_metadata(
                track_id=track_id,
                release_year=release_year,
                album_name=album_name,
                primary_genre=primary_genre
            )

            # Update stats
            stats['success'] += 1
            if not primary_genre:
                stats['no_genre'] += 1
            if not release_year:
                stats['no_year'] += 1

            # Log result
            genre_str = primary_genre or "Unknown"
            year_str = str(release_year) if release_year else "Unknown"
            print(f"  ✓ Updated: {year_str} | {genre_str} | {album_name}")

            # Rate limiting: Spotify allows ~180 requests per minute
            # We're making 2 requests per track (track + artist)
            # Sleep 1s between tracks to stay well under the limit
            if i < total:
                time.sleep(1.0)

        except Exception as e:
            print(f"  ✗ Error: {e}")
            stats['failed'] += 1
            continue

    return stats


def main():
    """Main entry point."""
    import sys

    print("Track Metadata Enrichment Script")
    print("=" * 80)

    # Initialize Spotify client
    try:
        spotify_client = SpotifyClient()
    except ValueError as e:
        print(f"Error: {e}")
        return

    # Get all packs
    packs = get_all_packs()

    if not packs:
        print("No packs found in database")
        return

    # Check for command-line argument
    if len(sys.argv) > 1:
        choice = sys.argv[1].strip().lower()
    else:
        # Display available packs
        print("\nAvailable packs:")
        for i, pack in enumerate(packs, 1):
            tags_str = f" [{', '.join(pack['tags'])}]" if pack['tags'] else ""
            print(f"  {i}. {pack['name']}{tags_str} ({pack['track_count']} tracks)")

        # Ask user which pack to enrich
        print("\nOptions:")
        print("  - Enter pack number to enrich a specific pack")
        print("  - Enter 'all' to enrich all packs")
        print("  - Enter 'quit' to exit")

        choice = input("\nYour choice: ").strip().lower()

    if choice == 'quit':
        print("Exiting...")
        return

    # Process selected packs
    packs_to_process = []

    if choice == 'all':
        packs_to_process = packs
    else:
        try:
            pack_index = int(choice) - 1
            if 0 <= pack_index < len(packs):
                packs_to_process = [packs[pack_index]]
            else:
                print("Invalid pack number")
                return
        except ValueError:
            print("Invalid choice")
            return

    # Enrich selected packs
    overall_stats = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'no_genre': 0,
        'no_year': 0
    }

    for pack in packs_to_process:
        stats = enrich_pack_tracks(pack['id'], pack['name'], spotify_client)

        # Aggregate stats
        for key in overall_stats:
            overall_stats[key] += stats[key]

    # Print summary
    print(f"\n{'='*80}")
    print("ENRICHMENT SUMMARY")
    print(f"{'='*80}")
    print(f"Total tracks processed: {overall_stats['total']}")
    print(f"Successfully enriched: {overall_stats['success']}")
    print(f"Failed: {overall_stats['failed']}")
    print(f"Tracks without genre: {overall_stats['no_genre']}")
    print(f"Tracks without year: {overall_stats['no_year']}")
    print(f"{'='*80}\n")


if __name__ == '__main__':
    main()
