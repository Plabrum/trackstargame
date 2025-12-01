#!/usr/bin/env python3
"""
Fetch spotify_popularity and isrc data for all tracks from Spotify API.

This script:
1. Queries the production database for all track IDs and Spotify IDs
2. Batches them into groups of 50 (Spotify API limit)
3. Fetches popularity and ISRC from Spotify
4. Writes results to a timestamped CSV file

The CSV can then be used by apply_spotify_enrichment.py to update the database.
"""
import os
import csv
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv
from utils.spotify import SpotifyClient
from utils.db import get_db_connection

# Load environment variables from parent directory
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

env_local_path = Path(__file__).parent.parent / '.env.local'
if env_local_path.exists():
    load_dotenv(env_local_path)

# Construct DATABASE_URL if not already set
if not os.getenv('DATABASE_URL'):
    db_password = os.getenv('DB_PASSWORD')
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')

    if db_password and supabase_url:
        project_ref = supabase_url.replace('https://', '').split('.')[0]
        database_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:6543/postgres"
        os.environ['DATABASE_URL'] = database_url


def get_all_tracks() -> List[Dict[str, str]]:
    """
    Fetch all track IDs and Spotify IDs from the database.

    Returns:
        List of dicts with 'id' (UUID) and 'spotify_id' (Spotify track ID)
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, spotify_id
            FROM tracks
            WHERE spotify_id IS NOT NULL
            ORDER BY created_at
            """
        )

        tracks = []
        for row in cursor.fetchall():
            tracks.append({
                'id': row[0],
                'spotify_id': row[1]
            })
        cursor.close()

    return tracks


def chunk_list(items: List, chunk_size: int) -> List[List]:
    """Split a list into chunks of specified size."""
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def fetch_spotify_data(tracks: List[Dict[str, str]], spotify_client: SpotifyClient) -> List[Dict]:
    """
    Fetch popularity and ISRC data from Spotify for all tracks.

    Args:
        tracks: List of dicts with 'id' and 'spotify_id'
        spotify_client: Initialized Spotify client

    Returns:
        List of dicts with track data including popularity and ISRC
    """
    # Group tracks into batches of 50 (Spotify API limit)
    batches = chunk_list(tracks, 50)
    total_batches = len(batches)

    print(f"\nFetching data from Spotify in {total_batches} batches (50 tracks each)...")
    print(f"Total tracks to process: {len(tracks)}")
    print("=" * 80)

    all_results = []
    success_count = 0
    missing_isrc_count = 0
    error_count = 0

    for i, batch in enumerate(batches, 1):
        # Get unique Spotify IDs for this batch
        unique_spotify_ids = list(set(track['spotify_id'] for track in batch))

        print(f"\n[Batch {i}/{total_batches}] Fetching {len(unique_spotify_ids)} unique Spotify tracks (for {len(batch)} database tracks)...")

        try:
            # Fetch from Spotify
            spotify_data = spotify_client.get_tracks_batch(unique_spotify_ids)

            # Create lookup dict: spotify_id -> track data
            spotify_lookup = {item['spotify_id']: item for item in spotify_data}

            # Now map ALL tracks in batch (including duplicates)
            for track in batch:
                spotify_id = track['spotify_id']
                spotify_item = spotify_lookup.get(spotify_id)

                if not spotify_item:
                    print(f"  ⚠ Warning: No Spotify data for {spotify_id}")
                    error_count += 1
                    continue

                result = {
                    'track_id': track['id'],
                    'spotify_id': spotify_id,
                    'spotify_popularity': spotify_item.get('popularity'),
                    'isrc': spotify_item.get('isrc')
                }

                all_results.append(result)
                success_count += 1

                if not spotify_item.get('isrc'):
                    missing_isrc_count += 1

            print(f"  ✓ Fetched {len(spotify_data)} unique tracks, mapped to {len(batch)} database records")

            # Rate limiting: Sleep between batches to avoid hitting Spotify limits
            # Spotify allows ~180 requests/minute, so 0.33s between requests is safe
            if i < total_batches:
                time.sleep(0.4)

        except Exception as e:
            print(f"  ✗ Error fetching batch: {e}")
            error_count += len(batch)
            continue

    # Print summary
    print("\n" + "=" * 80)
    print("FETCH SUMMARY")
    print("=" * 80)
    print(f"Total tracks processed: {len(tracks)}")
    print(f"Successfully fetched: {success_count}")
    print(f"Tracks without ISRC: {missing_isrc_count}")
    print(f"Errors: {error_count}")
    print("=" * 80)

    return all_results


def write_to_csv(data: List[Dict], output_path: Path) -> None:
    """
    Write fetched data to CSV file.

    Args:
        data: List of dicts with track data
        output_path: Path to output CSV file
    """
    # Ensure data directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['track_id', 'spotify_id', 'spotify_popularity', 'isrc']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for row in data:
            # Convert None to empty string for CSV
            csv_row = {
                'track_id': row['track_id'],
                'spotify_id': row['spotify_id'],
                'spotify_popularity': row['spotify_popularity'] if row['spotify_popularity'] is not None else '',
                'isrc': row['isrc'] if row['isrc'] else ''
            }
            writer.writerow(csv_row)

    print(f"\n✓ Data written to: {output_path}")
    print(f"  Rows: {len(data)}")


def main():
    """Main entry point."""
    print("Spotify Metadata Fetch Script")
    print("=" * 80)
    print("This script fetches spotify_popularity and isrc data from Spotify API")
    print("and saves it to a CSV file for later database update.")
    print("=" * 80)

    # Initialize Spotify client
    try:
        spotify_client = SpotifyClient()
    except ValueError as e:
        print(f"\n✗ Error: {e}")
        print("\nMake sure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set")
        print("in your .env.local file.")
        return

    # Get all tracks from database
    print("\nFetching track list from database...")
    tracks = get_all_tracks()

    if not tracks:
        print("✗ No tracks found in database")
        return

    print(f"✓ Found {len(tracks)} tracks in database")

    # Fetch data from Spotify
    results = fetch_spotify_data(tracks, spotify_client)

    if not results:
        print("\n✗ No data fetched from Spotify")
        return

    # Generate output filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_dir = Path(__file__).parent / 'data'
    output_path = output_dir / f'spotify_enrichment_{timestamp}.csv'

    # Write to CSV
    write_to_csv(results, output_path)

    print("\n" + "=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print(f"1. Review the CSV file: {output_path}")
    print("2. Run the update script to apply changes to the database:")
    print(f"   python apply_spotify_enrichment.py data/spotify_enrichment_{timestamp}.csv")
    print("=" * 80)


if __name__ == '__main__':
    main()
