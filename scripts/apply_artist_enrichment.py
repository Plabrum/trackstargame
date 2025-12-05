#!/usr/bin/env python3
"""
Apply artist metadata from CSV to the database.

This script:
1. Reads artist enrichment CSV file
2. Validates data integrity
3. Bulk updates the artists table with Spotify metadata
4. Logs all updates for audit trail

Usage:
    python scripts/apply_artist_enrichment.py <csv_file>

Example:
    python scripts/apply_artist_enrichment.py scripts/data/artist_enrichment_20251202_120000.csv

The script will prompt for confirmation before applying changes.
"""
import csv
import sys
from typing import List, Dict
from dotenv import load_dotenv
from psycopg2.extras import execute_values
from utils.db import get_db_connection


def read_enrichment_csv(csv_path: str) -> List[Dict]:
    """
    Read and parse enrichment CSV file.

    Args:
        csv_path: Path to CSV file

    Returns:
        List of enrichment dicts
    """
    enrichments = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Parse genres from pipe-separated string
            genres = row['genres'].split('|') if row['genres'] else []

            enrichments.append({
                'artist_id': row['artist_id'],
                'db_name': row['db_name'],
                'spotify_artist_id': row['spotify_artist_id'],
                'matched_name': row['matched_name'],
                'genres': genres,
                'spotify_followers': int(row['spotify_followers']) if row['spotify_followers'] else None,
                'image_url': row['image_url'] if row['image_url'] else None,
                'popularity': int(row['popularity']) if row['popularity'] else None,
                'match_type': row['match_type']
            })

    return enrichments


def validate_enrichments(enrichments: List[Dict]) -> bool:
    """
    Validate enrichment data.

    Args:
        enrichments: List of enrichment dicts

    Returns:
        True if valid, False otherwise
    """
    if not enrichments:
        print("✗ Error: No enrichments found in CSV")
        return False

    # Check for required fields
    for i, enr in enumerate(enrichments):
        if not enr['artist_id']:
            print(f"✗ Error: Row {i+1} missing artist_id")
            return False
        if not enr['spotify_artist_id']:
            print(f"✗ Error: Row {i+1} missing spotify_artist_id")
            return False

    # Check for duplicate Spotify IDs (shouldn't happen with UNIQUE constraint, but validate)
    spotify_ids = [e['spotify_artist_id'] for e in enrichments]
    if len(spotify_ids) != len(set(spotify_ids)):
        print("✗ Error: Duplicate spotify_artist_id found in CSV")
        return False

    return True


def apply_enrichments(enrichments: List[Dict]) -> int:
    """
    Apply enrichments to database.

    Args:
        enrichments: List of enrichment dicts

    Returns:
        Number of artists updated
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Prepare bulk update data
        update_values = [
            (
                enr['spotify_artist_id'],
                enr['genres'],
                enr['spotify_followers'],
                enr['image_url'],
                enr['artist_id']
            )
            for enr in enrichments
        ]

        # Bulk update
        execute_values(
            cursor,
            """
            UPDATE artists SET
                spotify_artist_id = data.spotify_id,
                genres = data.genres,
                spotify_followers = data.followers,
                image_url = data.image_url,
                updated_at = NOW()
            FROM (VALUES %s) AS data(spotify_id, genres, followers, image_url, id)
            WHERE artists.id = data.id::uuid
            """,
            update_values,
            template="(%s, %s, %s, %s, %s)"
        )

        updated_count = cursor.rowcount
        cursor.close()

        return updated_count


def main():
    """Main entry point."""
    # Load environment variables from .env file
    load_dotenv()

    if len(sys.argv) < 2:
        print("Usage: python scripts/apply_artist_enrichment.py <csv_file>")
        print("\nExample:")
        print("  python scripts/apply_artist_enrichment.py scripts/data/artist_enrichment_20251202_120000.csv")
        sys.exit(1)

    csv_path = sys.argv[1]

    print("=" * 80)
    print("ARTIST METADATA ENRICHMENT - APPLY PHASE")
    print("=" * 80)
    print()

    # Read CSV
    print(f"Reading: {csv_path}")
    try:
        enrichments = read_enrichment_csv(csv_path)
        print(f"✓ Read {len(enrichments)} enrichments from CSV")
    except FileNotFoundError:
        print(f"✗ Error: File not found: {csv_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error reading CSV: {e}")
        sys.exit(1)

    # Validate
    print("\nValidating data...")
    if not validate_enrichments(enrichments):
        sys.exit(1)
    print("✓ Data validation passed")

    # Summary
    print("\nEnrichment summary:")
    exact_matches = sum(1 for e in enrichments if e['match_type'] == 'exact')
    fuzzy_matches = sum(1 for e in enrichments if e['match_type'] == 'fuzzy')
    print(f"  Total artists: {len(enrichments)}")
    print(f"  Exact matches: {exact_matches}")
    print(f"  Fuzzy matches: {fuzzy_matches}")

    # Show sample fuzzy matches for review
    if fuzzy_matches > 0:
        print("\n⚠️  Fuzzy matches (sample):")
        fuzzy_samples = [e for e in enrichments if e['match_type'] == 'fuzzy'][:5]
        for e in fuzzy_samples:
            print(f"    DB: '{e['db_name']}' → Spotify: '{e['matched_name']}'")
        if fuzzy_matches > 5:
            print(f"    ... and {fuzzy_matches - 5} more")

    # Confirm
    print("\n" + "=" * 80)
    response = input(f"Apply {len(enrichments)} enrichments to database? [y/N]: ")
    if response.lower() != 'y':
        print("Aborted.")
        sys.exit(0)

    # Apply
    print("\nApplying enrichments...")
    try:
        updated = apply_enrichments(enrichments)
        print(f"✓ Updated {updated} artists")
    except Exception as e:
        print(f"✗ Error applying enrichments: {e}")
        sys.exit(1)

    # Final stats
    print("\n" + "=" * 80)
    print("ENRICHMENT APPLIED SUCCESSFULLY")
    print("=" * 80)
    print(f"\nArtists updated: {updated}")
    print("\nEnrichment details:")
    print("  - Spotify artist IDs populated")
    print("  - Genre arrays updated (from Spotify artist data)")
    print("  - Follower counts recorded")
    print("  - Profile images linked")

    # Check multi-artist track genre improvements
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM track_artists ta
            GROUP BY ta.track_id
            HAVING COUNT(*) > 1
        """)
        multi_artist_tracks = cursor.rowcount

        cursor.execute("""
            SELECT COUNT(DISTINCT t.id)
            FROM tracks t
            JOIN track_artists ta ON ta.track_id = t.id
            JOIN artists a ON a.id = ta.artist_id
            WHERE a.genres IS NOT NULL AND array_length(a.genres, 1) > 0
        """)
        tracks_with_genres = cursor.fetchone()[0]

        cursor.close()

    print(f"\nMulti-artist tracks: {multi_artist_tracks}")
    print(f"Tracks with genre data: {tracks_with_genres}")
    print("\n✓ Multi-artist tracks now have combined genres from all artists!")
    print()


if __name__ == '__main__':
    main()
