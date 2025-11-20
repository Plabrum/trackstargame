#!/usr/bin/env python3
"""
Create a pack from a text file with a list of songs.

Usage:
    python create_pack_from_list.py <file.txt> <pack_name> [tags...]

File format (one song per line):
    Song Title - Artist Name
    Another Song - Another Artist

Example:
    python create_pack_from_list.py rolling_stone_top_100.txt "Rolling Stone Top 100" "Classic Rock" "70s" "80s"
"""
import sys
import os
import time
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from spotify import SpotifyClient
from db import create_pack, add_tracks_to_pack


def parse_song_list_file(filepath):
    """Parse a file with song - artist format."""
    songs = []

    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue

            # Parse "Song Title - Artist Name" format
            if ' - ' in line:
                parts = line.split(' - ', 1)
                title = parts[0].strip()
                artist = parts[1].strip()

                if title and artist:
                    songs.append({
                        'title': title,
                        'artist': artist,
                        'line': line_num
                    })
                else:
                    print(f"Warning: Line {line_num} has empty title or artist")
            else:
                print(f"Warning: Line {line_num} doesn't match 'Title - Artist' format: {line}")

    return songs


def main():
    # Load environment variables
    load_dotenv()

    if len(sys.argv) < 3:
        print("Usage: python create_pack_from_list.py <file.txt> <pack_name> [tags...]")
        print("\nExample:")
        print('  python create_pack_from_list.py songs.txt "My Custom Pack" "Rock" "80s"')
        print("\nFile format (one song per line):")
        print("  Song Title - Artist Name")
        print("  Another Song - Another Artist")
        sys.exit(1)

    filepath = sys.argv[1]
    pack_name = sys.argv[2]
    tags = sys.argv[3:] if len(sys.argv) > 3 else None

    if not os.path.exists(filepath):
        print(f"Error: File '{filepath}' not found")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Creating Pack from File")
    print(f"{'='*60}\n")

    # Step 1: Parse file
    print(f"Reading songs from: {filepath}")
    songs = parse_song_list_file(filepath)

    if not songs:
        print("Error: No valid songs found in file")
        sys.exit(1)

    print(f"✓ Found {len(songs)} songs\n")

    # Show first few
    print("First 10 songs:")
    for i, song in enumerate(songs[:10], 1):
        print(f"  {i}. {song['title']} - {song['artist']}")
    if len(songs) > 10:
        print(f"  ... and {len(songs) - 10} more")
    print()

    # Step 2: Search Spotify with rate limiting
    print("Searching Spotify for tracks (with delays to avoid rate limits)...")
    spotify = SpotifyClient()
    spotify_tracks = []

    for i, song in enumerate(songs, 1):
        print(f"[{i}/{len(songs)}] Searching: {song['title']} - {song['artist']}")
        result = spotify.search_track(song['title'], song['artist'])

        if result:
            spotify_tracks.append(result)
            print(f"  ✓ Found: {result['title']} by {result['artist']}")
        else:
            print(f"  ✗ Not found on Spotify")

        # Add delay every 10 songs to avoid rate limits
        if i % 10 == 0 and i < len(songs):
            print("  (Pausing to avoid rate limits...)")
            time.sleep(2)

    if not spotify_tracks:
        print("\nError: No tracks found on Spotify")
        sys.exit(1)

    print(f"\n✓ Found {len(spotify_tracks)}/{len(songs)} tracks on Spotify\n")

    # Step 3: Create pack
    pack_description = f"Custom song pack created from {os.path.basename(filepath)}"

    print(f"Creating pack: {pack_name}")
    if tags:
        print(f"Tags: {', '.join(tags)}")
    pack_id = create_pack(pack_name, pack_description, tags)

    # Step 4: Add tracks
    added_count = add_tracks_to_pack(pack_id, spotify_tracks)

    print(f"\n{'='*60}")
    print(f"✓ SUCCESS!")
    print(f"{'='*60}")
    print(f"Pack created: {pack_name}")
    print(f"Pack ID: {pack_id}")
    print(f"Tracks added: {added_count}")
    print(f"Success rate: {added_count}/{len(songs)} ({100*added_count//len(songs)}%)")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
