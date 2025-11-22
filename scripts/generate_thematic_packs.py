#!/usr/bin/env python3
"""
Generate thematic genre packs grouped by decade.

This script creates larger, more diverse packs by combining related genres
within each decade, addressing artist concentration issues.
"""
import os
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from utils.db import get_pack_tracks, create_pack, add_tracks_to_pack, get_all_packs

# Load environment variables
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


def get_decade(year: int) -> str:
    """Convert year to decade string (e.g., 1975 -> '1970s')."""
    if not year:
        return None
    decade = (year // 10) * 10
    return f"{decade}s"


def normalize_genre(genre: str) -> str:
    """Normalize genre name to lowercase for comparison."""
    return genre.lower() if genre else None


# Thematic genre groupings by decade
THEMATIC_PACKS = {
    '1950s': [
        {
            'name': 'Jazz & Early Rock',
            'genres': ['jazz', 'vocal jazz', 'bebop', 'jazz blues', 'hard bop', 'rockabilly', 'classic country'],
            'description': "Jazz standards and early rock'n'roll from the 1950s"
        }
    ],
    '1960s': [
        {
            'name': 'Rock & Psychedelia',
            'genres': ['classic rock', 'rock', 'proto-punk', 'psychedelic rock', 'british invasion'],
            'description': "Classic rock and psychedelic sounds from the British Invasion era"
        },
        {
            'name': 'Motown & Soul',
            'genres': ['motown', 'soul', 'classic soul'],
            'description': "The Motown sound and soul classics"
        },
        {
            'name': 'Folk & Singer-Songwriters',
            'genres': ['folk rock', 'folk', 'baroque pop', 'singer-songwriter'],
            'description': "Folk rock and singer-songwriter classics"
        },
        {
            'name': 'Jazz',
            'genres': ['jazz', 'jazz blues', 'vocal jazz'],
            'description': "Jazz standards and blues"
        }
    ],
    '1970s': [
        {
            'name': 'Classic Rock & Southern Rock',
            'genres': ['classic rock', 'southern rock', 'rock'],
            'description': "Classic rock anthems and southern rock"
        },
        {
            'name': 'Funk, Soul & Disco',
            'genres': ['funk', 'soul', 'disco', 'motown', 'philly soul'],
            'description': "Groovy funk, soul, and disco hits"
        },
        {
            'name': 'Yacht Rock & Soft Rock',
            'genres': ['yacht rock', 'soft rock'],
            'description': "Smooth yacht rock and soft rock"
        },
        {
            'name': 'Folk & Americana',
            'genres': ['folk rock', 'singer-songwriter', 'folk', 'americana', 'country rock'],
            'description': "Folk rock, singer-songwriters, and Americana"
        },
        {
            'name': 'Glam, Punk & Proto-Punk',
            'genres': ['glam rock', 'proto-punk', 'punk', 'punk rock'],
            'description': "Glam rock and early punk"
        }
    ],
    '1980s': [
        {
            'name': 'New Wave & Synth Pop',
            'genres': ['new wave', 'synthpop', 'power pop', 'synth-pop'],
            'description': "New wave and synth pop classics"
        },
        {
            'name': 'Rock & Metal',
            'genres': ['classic rock', 'rock', 'glam metal', 'heavy metal', 'hard rock'],
            'description': "Rock and metal from the 80s"
        },
        {
            'name': 'Hip Hop Origins',
            'genres': ['old school hip hop', 'hip hop', 'funk', 'jazz rap'],
            'description': "The birth of hip hop"
        },
        {
            'name': 'Punk & Hardcore',
            'genres': ['punk', 'hardcore punk', 'post-punk', 'punk rock'],
            'description': "Punk and hardcore"
        },
        {
            'name': 'Pop & Soft Rock',
            'genres': ['pop', 'singer-songwriter', 'yacht rock', 'soft rock'],
            'description': "Pop hits and soft rock"
        }
    ],
    '1990s': [
        {
            'name': 'Grunge & Alternative',
            'genres': ['grunge', 'alternative rock', 'art rock', 'alternative'],
            'description': "Grunge and alternative rock"
        },
        {
            'name': 'East Coast Hip Hop',
            'genres': ['east coast hip hop', 'jazz rap', 'boom bap'],
            'description': "East Coast hip hop classics"
        },
        {
            'name': 'Hip Hop',
            'genres': ['old school hip hop', 'hip hop', 'southern hip hop', 'west coast hip hop'],
            'description': "Hip hop from various regions"
        },
        {
            'name': 'R&B & Neo Soul',
            'genres': ['r&b', 'rnb', 'neo soul', 'neo-soul'],
            'description': "R&B and neo soul"
        },
        {
            'name': 'Country',
            'genres': ['country', 'classic country', 'alt country', 'alt-country'],
            'description': "Country music"
        },
        {
            'name': 'Britpop & Rock',
            'genres': ['britpop', 'rock', 'indie rock', 'brit pop'],
            'description': "Britpop and rock"
        }
    ],
    '2000s': [
        {
            'name': 'Indie Rock',
            'genres': ['indie', 'indie rock', 'garage rock', 'garage rock revival'],
            'description': "Indie rock revolution"
        },
        {
            'name': 'Hip Hop',
            'genres': ['east coast hip hop', 'southern hip hop', 'hip hop', 'west coast hip hop'],
            'description': "Hip hop from all regions"
        },
        {
            'name': 'Alternative & Pop Punk',
            'genres': ['pop punk', 'alternative rock', 'alternative', 'emo'],
            'description': "Pop punk and alternative"
        },
        {
            'name': 'R&B & Neo Soul',
            'genres': ['r&b', 'rnb', 'neo soul', 'neo-soul'],
            'description': "R&B and neo soul"
        },
        {
            'name': 'Country',
            'genres': ['country', 'classic country', 'alt country', 'alt-country'],
            'description': "Country music"
        },
        {
            'name': 'Latin Music',
            'genres': ['reggaeton', 'latin pop', 'latin', 'bachata', 'salsa'],
            'description': "Reggaeton and Latin pop"
        }
    ],
    '2010s': [
        {
            'name': 'Pop',
            'genres': ['pop', 'soft pop', 'art pop', 'dance pop', 'electropop'],
            'description': "Pop hits"
        },
        {
            'name': 'Rap & Hip Hop',
            'genres': ['rap', 'melodic rap', 'hip hop', 'east coast hip hop', 'trap'],
            'description': "Rap and hip hop"
        },
        {
            'name': 'Indie',
            'genres': ['indie', 'indie pop', 'bedroom pop', 'indie rock'],
            'description': "Indie music"
        },
        {
            'name': 'Country',
            'genres': ['country', 'alt country', 'alt-country', 'contemporary country'],
            'description': "Country music"
        },
        {
            'name': 'Dance & Electronic',
            'genres': ['edm', 'electronic', 'house', 'dance', 'reggaeton'],
            'description': "EDM and electronic dance music"
        }
    ],
    '2020s': [
        {
            'name': 'Pop',
            'genres': ['pop', 'hyperpop', 'art pop', 'dance pop'],
            'description': "Modern pop and hyperpop"
        },
        {
            'name': 'Country',
            'genres': ['country', 'alt country', 'alt-country', 'texas country'],
            'description': "Contemporary country"
        },
        {
            'name': 'Reggaeton & Latin',
            'genres': ['reggaeton', 'latin', 'latin pop', 'salsa', 'cumbia'],
            'description': "Reggaeton and Latin music"
        },
        {
            'name': 'Alternative & Indie',
            'genres': ['indie', 'bedroom pop', 'post-punk', 'indie rock', 'indie pop', 'dream pop'],
            'description': "Alternative and indie"
        },
        {
            'name': 'R&B & Rap',
            'genres': ['r&b', 'rnb', 'alternative r&b', 'rap', 'hip hop'],
            'description': "R&B and rap"
        }
    ]
}


def check_artist_diversity(tracks: list, max_percentage: float = 0.15) -> dict:
    """
    Check artist concentration in a pack.

    Args:
        tracks: List of track dicts
        max_percentage: Maximum percentage of pack from single artist (default 15%)

    Returns:
        Dict with artist counts and warnings
    """
    artist_counts = defaultdict(int)
    for track in tracks:
        artist_counts[track['artist']] += 1

    total = len(tracks)
    warnings = []

    for artist, count in sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        percentage = count / total
        if percentage > max_percentage:
            warnings.append(f"{artist}: {count} songs ({percentage*100:.1f}%)")

    return {
        'total_artists': len(artist_counts),
        'total_tracks': total,
        'top_artists': [(a, c, c/total*100) for a, c in sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:5]],
        'warnings': warnings
    }


def main():
    """Main entry point."""
    print("Thematic Pack Generation Script")
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

    # Group tracks by decade
    print("\nGrouping tracks by decade...")
    tracks_by_decade = defaultdict(list)

    for track in tracks:
        year = track.get('release_year')
        genres = track.get('genres', [])

        if year and genres:
            decade = get_decade(year)
            if decade:
                tracks_by_decade[decade].append(track)

    print(f"\nTracks by decade:")
    for decade in sorted(tracks_by_decade.keys()):
        print(f"  {decade}: {len(tracks_by_decade[decade])} tracks")

    # Create thematic packs
    print(f"\n{'='*80}")
    print("Creating thematic packs...")
    print(f"{'='*80}\n")

    created_packs = []
    total_tracks_added = 0

    for decade in sorted(THEMATIC_PACKS.keys()):
        decade_tracks = tracks_by_decade.get(decade, [])

        if not decade_tracks:
            print(f"Skipping {decade} - no tracks")
            continue

        print(f"\n{decade} ({len(decade_tracks)} total tracks)")
        print("-" * 60)

        for pack_config in THEMATIC_PACKS[decade]:
            pack_name = f"{decade} {pack_config['name']}"

            # Filter tracks matching this pack's genres
            matching_tracks = []
            for track in decade_tracks:
                track_genres = [normalize_genre(g) for g in track.get('genres', [])]
                pack_genres = [normalize_genre(g) for g in pack_config['genres']]

                # Check if any of the track's genres match the pack's genres
                if any(tg in pack_genres for tg in track_genres):
                    matching_tracks.append(track)

            if len(matching_tracks) < 10:
                print(f"  Skipping '{pack_name}' - only {len(matching_tracks)} tracks")
                continue

            # Check artist diversity
            diversity = check_artist_diversity(matching_tracks)

            try:
                # Create pack
                # Extract just the genre family name for tags
                genre_tag = pack_config['name'].lower().replace(' & ', '-').replace(' ', '-')
                tags = [decade.lower(), genre_tag]

                pack_id = create_pack(
                    name=pack_name,
                    description=pack_config['description'],
                    tags=tags
                )

                # Add tracks to pack
                track_count = add_tracks_to_pack(pack_id, matching_tracks)

                created_packs.append({
                    'name': pack_name,
                    'track_count': track_count,
                    'diversity': diversity
                })

                total_tracks_added += track_count

                print(f"  ✓ {pack_name}: {track_count} tracks")
                print(f"    Artists: {diversity['total_artists']}")

                if diversity['warnings']:
                    print(f"    ⚠ High concentration: {', '.join(diversity['warnings'])}")
                else:
                    top_artist = diversity['top_artists'][0] if diversity['top_artists'] else None
                    if top_artist:
                        print(f"    Top artist: {top_artist[0]} ({top_artist[1]} songs, {top_artist[2]:.1f}%)")

            except Exception as e:
                print(f"  ✗ Error creating pack '{pack_name}': {e}")
                continue

    # Print summary
    print(f"\n{'='*80}")
    print("PACK CREATION SUMMARY")
    print(f"{'='*80}")
    print(f"Successfully created {len(created_packs)} packs")
    print(f"Total tracks added: {total_tracks_added}\n")

    for pack in created_packs:
        warnings_str = f" ⚠ {len(pack['diversity']['warnings'])} artist concentration warnings" if pack['diversity']['warnings'] else ""
        print(f"  ✓ {pack['name']}: {pack['track_count']} tracks{warnings_str}")

    print(f"\n{'='*80}\n")


if __name__ == '__main__':
    main()
