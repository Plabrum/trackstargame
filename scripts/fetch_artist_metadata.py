#!/usr/bin/env python3
"""
Fetch artist metadata from Spotify for all artists in the database.

This script:
1. Queries all artists from the database
2. For each artist, searches Spotify by name
3. Matches exact names (case-insensitive) or falls back to most popular
4. Writes results to a timestamped CSV file for review
5. Logs all matches for post-application review

Usage:
    python scripts/fetch_artist_metadata.py

Output:
    CSV file: scripts/data/artist_enrichment_YYYYMMDD_HHMMSS.csv

The CSV can be reviewed before applying with apply_artist_enrichment.py
"""
import os
import csv
import time
from datetime import datetime
from typing import Optional, Dict, List
from dotenv import load_dotenv
from utils.db import get_db_connection
from utils.spotify import SpotifyClient


def get_all_artists() -> List[Dict]:
    """
    Get all artists from the database.

    Returns:
        List of artist dicts with id, name, spotify_artist_id
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, spotify_artist_id
            FROM artists
            ORDER BY name
        """)

        artists = []
        for row in cursor.fetchall():
            artists.append({
                'id': row[0],
                'name': row[1],
                'spotify_artist_id': row[2]
            })

        cursor.close()
        return artists


def match_artist_to_spotify(spotify_client: SpotifyClient, artist_name: str,
                            existing_spotify_id: Optional[str] = None) -> Optional[Dict]:
    """
    Match an artist name to Spotify metadata.

    Args:
        spotify_client: Spotify API client
        artist_name: Artist name to search for
        existing_spotify_id: If artist already has a Spotify ID, skip search

    Returns:
        Dict with Spotify artist data, or None if no match found
    """
    # If already has Spotify ID, skip search
    if existing_spotify_id:
        return None

    # Search for best match
    artist = spotify_client.get_best_artist_match(artist_name)

    if not artist:
        return None

    # Extract relevant fields
    return {
        'spotify_artist_id': artist['id'],
        'matched_name': artist['name'],
        'genres': artist.get('genres', []),
        'spotify_followers': artist.get('followers', {}).get('total', 0),
        'image_url': artist.get('images', [{}])[0].get('url') if artist.get('images') else None,
        'popularity': artist.get('popularity', 0)
    }


def main():
    """Main entry point."""
    # Load environment variables from .env file
    load_dotenv()

    print("=" * 80)
    print("ARTIST METADATA ENRICHMENT - FETCH PHASE")
    print("=" * 80)
    print()

    # Initialize Spotify client
    try:
        spotify = SpotifyClient()
        print("✓ Connected to Spotify API")
    except Exception as e:
        print(f"✗ Failed to connect to Spotify: {e}")
        return

    # Get all artists
    print("\nFetching artists from database...")
    artists = get_all_artists()
    print(f"Found {len(artists)} artists")

    # Filter artists that need enrichment
    artists_to_enrich = [a for a in artists if not a['spotify_artist_id']]
    already_enriched = len(artists) - len(artists_to_enrich)

    print(f"  - Already enriched: {already_enriched}")
    print(f"  - Need enrichment: {len(artists_to_enrich)}")

    if not artists_to_enrich:
        print("\n✓ All artists already have Spotify metadata!")
        return

    # Create output directory
    os.makedirs('scripts/data', exist_ok=True)

    # Generate timestamped filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_path = f'scripts/data/artist_enrichment_{timestamp}.csv'

    print(f"\nOutput file: {csv_path}")
    print(f"\nFetching metadata from Spotify...")
    print("=" * 80)

    # Write CSV header
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'artist_id',
            'db_name',
            'spotify_artist_id',
            'matched_name',
            'genres',
            'spotify_followers',
            'image_url',
            'popularity',
            'match_type'
        ])

    # Process artists
    matched = 0
    not_matched = 0
    exact_matches = 0
    fuzzy_matches = 0

    for i, artist in enumerate(artists_to_enrich, 1):
        artist_name = artist['name']

        print(f"\n[{i}/{len(artists_to_enrich)}] {artist_name}")

        # Search Spotify
        match = match_artist_to_spotify(spotify, artist_name, artist['spotify_artist_id'])

        if match:
            matched += 1

            # Determine match type
            if match['matched_name'].lower() == artist_name.lower():
                match_type = 'exact'
                exact_matches += 1
                print(f"  ✓ Exact match: {match['matched_name']}")
            else:
                match_type = 'fuzzy'
                fuzzy_matches += 1
                print(f"  ~ Fuzzy match: {match['matched_name']} (DB: {artist_name})")

            print(f"    Followers: {match['spotify_followers']:,}")
            print(f"    Genres: {', '.join(match['genres'][:3])}" +
                  (f" (+{len(match['genres']) - 3} more)" if len(match['genres']) > 3 else ""))

            # Write to CSV
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    artist['id'],
                    artist_name,
                    match['spotify_artist_id'],
                    match['matched_name'],
                    '|'.join(match['genres']),  # Pipe-separated for CSV
                    match['spotify_followers'],
                    match['image_url'] or '',
                    match['popularity'],
                    match_type
                ])
        else:
            not_matched += 1
            print(f"  ✗ No match found")

        # Rate limiting: 0.4s between requests (~150/minute, well under 180/min limit)
        time.sleep(0.4)

    # Summary
    print("\n" + "=" * 80)
    print("ENRICHMENT COMPLETE")
    print("=" * 80)
    print(f"\nResults:")
    print(f"  Total artists: {len(artists_to_enrich)}")
    print(f"  Matched: {matched} ({matched/len(artists_to_enrich)*100:.1f}%)")
    print(f"    - Exact matches: {exact_matches}")
    print(f"    - Fuzzy matches: {fuzzy_matches}")
    print(f"  Not matched: {not_matched} ({not_matched/len(artists_to_enrich)*100:.1f}%)")

    print(f"\nOutput saved to: {csv_path}")
    print("\nNext steps:")
    print(f"  1. Review the CSV file, especially fuzzy matches")
    print(f"  2. Run: python scripts/apply_artist_enrichment.py {csv_path}")
    print()


if __name__ == '__main__':
    main()
