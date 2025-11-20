#!/usr/bin/env python3
"""
Generate decade+genre packs from enriched tracks.

This script groups tracks by decade and primary genre, then creates new packs
for each combination that has sufficient tracks.
"""
import os
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from utils.db import get_pack_tracks, create_pack, add_tracks_to_pack, get_all_packs

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
        # Extract project ref from Supabase URL
        # Format: https://[project-ref].supabase.co
        project_ref = supabase_url.replace('https://', '').split('.')[0]
        # Try IPv6 direct connection
        database_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:6543/postgres"
        os.environ['DATABASE_URL'] = database_url


def get_decade(year: int) -> str:
    """Convert year to decade string (e.g., 1975 -> '70s')."""
    if not year:
        return None
    decade = (year // 10) * 10
    return f"{decade}s"


def normalize_genre(genre: str) -> str:
    """
    Normalize genre names for consistency.

    Combines similar genres and capitalizes properly.
    """
    if not genre:
        return None

    genre_lower = genre.lower()

    # Mapping of similar genres
    genre_map = {
        'hip hop': 'Hip Hop',
        'rap': 'Hip Hop',
        'r&b': 'R&B',
        'rnb': 'R&B',
        'soul': 'Soul',
        'funk': 'Funk',
        'rock': 'Rock',
        'pop': 'Pop',
        'jazz': 'Jazz',
        'blues': 'Blues',
        'country': 'Country',
        'folk': 'Folk',
        'electronic': 'Electronic',
        'indie': 'Indie',
        'alternative': 'Alternative',
        'metal': 'Metal',
        'punk': 'Punk',
        'disco': 'Disco',
        'reggae': 'Reggae',
    }

    # Check for keywords in genre name
    for key, normalized in genre_map.items():
        if key in genre_lower:
            return normalized

    # If no match, capitalize first letter of each word
    return genre.title()


def main():
    """Main entry point."""
    print("Decade+Genre Pack Generation Script")
    print("=" * 80)

    # Get all packs
    packs = get_all_packs()

    # Find the "Every Track Star* Song" pack
    source_pack = None
    for pack in packs:
        if "Every Track Star" in pack['name']:
            source_pack = pack
            break

    if not source_pack:
        print("Error: Could not find 'Every Track Star*' pack")
        return

    print(f"\nSource pack: {source_pack['name']}")
    print(f"Total tracks: {source_pack['track_count']}")

    # Get all tracks from the source pack
    print("\nLoading tracks...")
    tracks = get_pack_tracks(source_pack['id'])

    # Group tracks by decade and genre
    print("\nGrouping tracks by decade and genre...")
    groups = defaultdict(list)

    stats = {
        'total': len(tracks),
        'with_metadata': 0,
        'missing_year': 0,
        'missing_genre': 0,
    }

    for track in tracks:
        year = track.get('release_year')
        genre = track.get('primary_genre')

        if year and genre:
            decade = get_decade(year)
            normalized_genre = normalize_genre(genre)

            if decade and normalized_genre:
                key = (decade, normalized_genre)
                groups[key].append(track)
                stats['with_metadata'] += 1
        else:
            if not year:
                stats['missing_year'] += 1
            if not genre:
                stats['missing_genre'] += 1

    # Print statistics
    print(f"\nStatistics:")
    print(f"  Total tracks: {stats['total']}")
    print(f"  Tracks with metadata: {stats['with_metadata']}")
    print(f"  Tracks missing year: {stats['missing_year']}")
    print(f"  Tracks missing genre: {stats['missing_genre']}")
    print(f"  Unique decade+genre combinations: {len(groups)}")

    # Show groups by size
    print(f"\nDecade+Genre combinations (showing groups with 10+ tracks):")
    sorted_groups = sorted(groups.items(), key=lambda x: len(x[1]), reverse=True)

    for (decade, genre), tracks_list in sorted_groups:
        if len(tracks_list) >= 10:
            print(f"  {decade} {genre}: {len(tracks_list)} tracks")

    # Ask for confirmation
    print(f"\n{'='*80}")
    min_tracks = 10
    eligible_groups = [(k, v) for k, v in sorted_groups if len(v) >= min_tracks]
    print(f"Will create {len(eligible_groups)} packs (minimum {min_tracks} tracks per pack)")

    response = input("\nProceed with pack creation? (yes/no): ").strip().lower()

    if response != 'yes':
        print("Cancelled.")
        return

    # Create packs
    print(f"\n{'='*80}")
    print("Creating packs...")
    print(f"{'='*80}\n")

    created_packs = []

    for (decade, genre), tracks_list in eligible_groups:
        pack_name = f"{decade} {genre}"
        pack_description = f"A collection of {genre} tracks from the {decade}"
        pack_tags = [decade, genre.lower()]

        try:
            # Create pack
            pack_id = create_pack(
                name=pack_name,
                description=pack_description,
                tags=pack_tags
            )

            # Add tracks to pack
            track_count = add_tracks_to_pack(pack_id, tracks_list)

            created_packs.append({
                'name': pack_name,
                'track_count': track_count
            })

        except Exception as e:
            print(f"  ✗ Error creating pack '{pack_name}': {e}")
            continue

    # Print summary
    print(f"\n{'='*80}")
    print("PACK CREATION SUMMARY")
    print(f"{'='*80}")
    print(f"Successfully created {len(created_packs)} packs:\n")

    for pack in created_packs:
        print(f"  ✓ {pack['name']}: {pack['track_count']} tracks")

    print(f"\n{'='*80}\n")


if __name__ == '__main__':
    main()
