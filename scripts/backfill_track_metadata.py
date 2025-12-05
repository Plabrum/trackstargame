#!/usr/bin/env python3
"""
Backfill missing track metadata from Spotify.

This script:
1. Queries all tracks from Supabase that are missing metadata (album_image_url, etc.)
2. Fetches complete track data from Spotify using the spotify_id
3. Updates the database with the fetched metadata
4. Tracks progress and can be safely re-run

Usage:
    python scripts/backfill_track_metadata.py [--limit N] [--batch-size N]

Options:
    --limit N         Limit to N tracks (for testing)
    --batch-size N    Process N tracks per batch (default: 50, max: 50)
    --force-all       Backfill all tracks, even those with existing data

Examples:
    # Backfill first 100 tracks (for testing)
    python scripts/backfill_track_metadata.py --limit 100

    # Backfill all tracks with missing album images
    python scripts/backfill_track_metadata.py

    # Re-run for all tracks to update metadata
    python scripts/backfill_track_metadata.py --force-all
"""
import os
import sys
import time
import argparse
from typing import List, Dict, Set, Optional
from dotenv import load_dotenv
from utils.db import get_db_connection
from utils.spotify import SpotifyClient


def get_tracks_needing_backfill(limit: Optional[int] = None, force_all: bool = False) -> List[Dict]:
    """
    Get all tracks that need metadata backfilled.

    Args:
        limit: Optional limit on number of tracks to return
        force_all: If True, return all tracks regardless of existing metadata

    Returns:
        List of track dicts with id, spotify_id, title
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        if force_all:
            # Get all tracks
            query = """
                SELECT id, spotify_id, title, album_name, album_image_url
                FROM tracks
                ORDER BY created_at DESC
            """
            if limit:
                query += f" LIMIT {limit}"
        else:
            # Get tracks missing album_image_url
            query = """
                SELECT id, spotify_id, title, album_name, album_image_url
                FROM tracks
                WHERE album_image_url IS NULL
                ORDER BY created_at DESC
            """
            if limit:
                query += f" LIMIT {limit}"

        cursor.execute(query)

        tracks = []
        for row in cursor.fetchall():
            tracks.append({
                'id': row[0],
                'spotify_id': row[1],
                'title': row[2],
                'album_name': row[3],
                'album_image_url': row[4]
            })

        cursor.close()
        return tracks


def fetch_track_metadata_from_spotify(spotify_client: SpotifyClient, spotify_ids: List[str]) -> Dict[str, Dict]:
    """
    Fetch track metadata from Spotify for multiple track IDs.

    Args:
        spotify_client: Spotify API client
        spotify_ids: List of Spotify track IDs (max 50)

    Returns:
        Dict mapping spotify_id to metadata dict
    """
    if not spotify_ids:
        return {}

    if len(spotify_ids) > 50:
        raise ValueError("Maximum 50 tracks per batch")

    try:
        # Fetch tracks from Spotify
        results = spotify_client.sp.tracks(spotify_ids)

        metadata_map = {}
        for track in results.get('tracks', []):
            if track is None:
                continue

            # Extract album image (prefer 300x300, fall back to largest available)
            album_images = track['album'].get('images', [])
            album_image_url = None
            if album_images:
                if len(album_images) >= 2:
                    album_image_url = album_images[1]['url']  # Medium (usually 300x300)
                else:
                    album_image_url = album_images[0]['url']  # Largest available

            # Extract release year
            release_date = track['album'].get('release_date', '')
            release_year = None
            if release_date:
                try:
                    release_year = int(release_date.split('-')[0])
                    if not (1900 <= release_year <= 2100):
                        release_year = None
                except (ValueError, IndexError):
                    pass

            metadata_map[track['id']] = {
                'album_name': track['album']['name'],
                'album_image_url': album_image_url,
                'release_year': release_year,
                'spotify_popularity': track.get('popularity'),
                'isrc': track.get('external_ids', {}).get('isrc')
            }

        return metadata_map

    except Exception as e:
        print(f"Error fetching tracks from Spotify: {e}")
        return {}


def update_tracks_in_db(tracks_metadata: List[Dict]) -> int:
    """
    Bulk update tracks in the database.

    Args:
        tracks_metadata: List of dicts with 'id' and metadata fields

    Returns:
        Number of tracks updated
    """
    if not tracks_metadata:
        return 0

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Use a single UPDATE with unnest for bulk update (much faster!)
        track_ids = [t['id'] for t in tracks_metadata]
        album_names = [t.get('album_name') for t in tracks_metadata]
        album_images = [t.get('album_image_url') for t in tracks_metadata]
        release_years = [t.get('release_year') for t in tracks_metadata]
        popularities = [t.get('spotify_popularity') for t in tracks_metadata]
        isrcs = [t.get('isrc') for t in tracks_metadata]

        cursor.execute(
            """
            UPDATE tracks
            SET
                album_name = COALESCE(data.album_name, tracks.album_name),
                album_image_url = COALESCE(data.album_image_url, tracks.album_image_url),
                release_year = COALESCE(data.release_year, tracks.release_year),
                spotify_popularity = COALESCE(data.spotify_popularity, tracks.spotify_popularity),
                isrc = COALESCE(data.isrc, tracks.isrc),
                updated_at = NOW()
            FROM (
                SELECT
                    unnest(%s::uuid[]) as id,
                    unnest(%s::text[]) as album_name,
                    unnest(%s::text[]) as album_image_url,
                    unnest(%s::int[]) as release_year,
                    unnest(%s::int[]) as spotify_popularity,
                    unnest(%s::text[]) as isrc
            ) AS data
            WHERE tracks.id = data.id
            """,
            (track_ids, album_names, album_images, release_years, popularities, isrcs)
        )

        update_count = cursor.rowcount
        cursor.close()
        return update_count


def main():
    """Main entry point."""
    # Parse arguments
    parser = argparse.ArgumentParser(description='Backfill missing track metadata from Spotify')
    parser.add_argument('--limit', type=int, help='Limit to N tracks (for testing)')
    parser.add_argument('--batch-size', type=int, default=50, help='Process N tracks per batch (default: 50, max: 50)')
    parser.add_argument('--force-all', action='store_true', help='Backfill all tracks, even those with existing data')
    args = parser.parse_args()

    if args.batch_size > 50:
        print("Error: Batch size cannot exceed 50 (Spotify API limit)")
        sys.exit(1)

    # Load environment variables
    load_dotenv()

    print("=" * 80)
    print("TRACK METADATA BACKFILL")
    print("=" * 80)
    print()

    # Initialize Spotify client
    try:
        spotify = SpotifyClient()
        print("✓ Connected to Spotify API")
    except Exception as e:
        print(f"✗ Failed to connect to Spotify: {e}")
        sys.exit(1)

    # Get tracks needing backfill
    print(f"\nQuerying database for tracks needing backfill...")
    if args.force_all:
        print("  Mode: FORCE ALL (updating all tracks)")
    else:
        print("  Mode: Missing data only (album_image_url IS NULL)")

    tracks = get_tracks_needing_backfill(limit=args.limit, force_all=args.force_all)

    if not tracks:
        print("\n✓ No tracks need backfilling!")
        return

    print(f"Found {len(tracks)} tracks to process")

    if args.limit:
        print(f"  (Limited to {args.limit} tracks for testing)")

    # Confirm before proceeding
    if not args.limit and len(tracks) > 100:
        print("\n" + "=" * 80)
        response = input(f"Proceed with backfilling {len(tracks)} tracks? [y/N]: ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(0)

    # Process in batches
    print(f"\nProcessing in batches of {args.batch_size}...")
    print("=" * 80)

    total_updated = 0
    total_failed = 0

    for i in range(0, len(tracks), args.batch_size):
        batch = tracks[i:i + args.batch_size]
        batch_num = (i // args.batch_size) + 1
        total_batches = (len(tracks) + args.batch_size - 1) // args.batch_size

        print(f"\nBatch {batch_num}/{total_batches} ({len(batch)} tracks)")

        # Fetch metadata from Spotify
        spotify_ids = [t['spotify_id'] for t in batch]
        metadata_map = fetch_track_metadata_from_spotify(spotify, spotify_ids)

        if not metadata_map:
            print("  ✗ Failed to fetch metadata from Spotify")
            total_failed += len(batch)
            continue

        # Prepare update data
        tracks_to_update = []
        for track in batch:
            spotify_id = track['spotify_id']
            if spotify_id in metadata_map:
                tracks_to_update.append({
                    'id': track['id'],
                    **metadata_map[spotify_id]
                })

        # Update database
        if tracks_to_update:
            updated = update_tracks_in_db(tracks_to_update)
            total_updated += updated
            print(f"  ✓ Updated {updated} tracks")

            # Show sample
            sample = tracks_to_update[0]
            print(f"    Sample: \"{batch[0]['title']}\"")
            if sample.get('album_image_url'):
                print(f"      Album image: ✓")
            if sample.get('spotify_popularity'):
                print(f"      Popularity: {sample['spotify_popularity']}")
        else:
            print(f"  ✗ No metadata found for this batch")
            total_failed += len(batch)

        # Rate limiting: Small delay between batches to avoid overwhelming Spotify API
        # 0.05s = ~20 batches/sec, well under the ~180 requests/min limit
        if i + args.batch_size < len(tracks):
            time.sleep(0.05)

    # Final summary
    print("\n" + "=" * 80)
    print("BACKFILL COMPLETE")
    print("=" * 80)
    print(f"\nResults:")
    print(f"  Total tracks processed: {len(tracks)}")
    print(f"  Successfully updated: {total_updated}")
    print(f"  Failed: {total_failed}")
    print(f"  Success rate: {total_updated/len(tracks)*100:.1f}%")

    print("\nMetadata backfilled:")
    print("  - Album artwork URLs")
    print("  - Album names")
    print("  - Release years")
    print("  - Spotify popularity")
    print("  - ISRC codes")

    print()


if __name__ == '__main__':
    main()
