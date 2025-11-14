#!/usr/bin/env python3
"""
Create a song pack from a Track Star YouTube video.

Usage:
    python create_pack_from_youtube.py <youtube_url> [pack_name]

Example:
    python create_pack_from_youtube.py https://www.youtube.com/watch?v=DPzTKJZJ8e4
    python create_pack_from_youtube.py https://www.youtube.com/watch?v=DPzTKJZJ8e4 "Anderson .Paak Pack"
"""
import sys
import os
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from youtube import extract_description, extract_video_title
from parser import parse_track_list, extract_episode_info
from spotify import SpotifyClient
from db import create_pack, add_tracks_to_pack, get_all_packs


def main():
    # Load environment variables
    load_dotenv()

    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python create_pack_from_youtube.py <youtube_url> [pack_name]")
        print("\nExample:")
        print("  python create_pack_from_youtube.py https://www.youtube.com/watch?v=DPzTKJZJ8e4")
        sys.exit(1)

    youtube_url = sys.argv[1]
    custom_pack_name = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"\n{'='*60}")
    print(f"Creating pack from YouTube video")
    print(f"{'='*60}\n")

    # Step 1: Extract video description
    print("Step 1: Extracting video description...")
    description = extract_description(youtube_url)

    if not description:
        print("Error: Could not extract description from YouTube video")
        sys.exit(1)

    print(f"✓ Description extracted ({len(description)} characters)\n")

    # Step 2: Parse track list from description
    print("Step 2: Parsing track list from description...")
    tracks = parse_track_list(description)

    if not tracks:
        print("Error: Could not parse track list from description")
        print("\nDescription content:")
        print(description)
        sys.exit(1)

    print(f"✓ Found {len(tracks)} tracks:\n")
    for i, track in enumerate(tracks, 1):
        print(f"  {i}. {track['title']} - {track['artist']}")
    print()

    # Step 3: Search Spotify for tracks
    print("Step 3: Searching Spotify for track IDs...")
    spotify = SpotifyClient()
    spotify_tracks = spotify.search_tracks_batch(tracks)

    if not spotify_tracks:
        print("\nError: No tracks found on Spotify")
        print("This could mean the track names/artists need adjustment or they're not available on Spotify.")
        sys.exit(1)

    print(f"\n✓ Found {len(spotify_tracks)}/{len(tracks)} tracks on Spotify\n")

    # Step 4: Determine pack name
    if custom_pack_name:
        pack_name = custom_pack_name
    else:
        # Try to extract guest name or use video title
        episode_info = extract_episode_info(description)
        if episode_info and episode_info.get('guest'):
            pack_name = f"Track Star - {episode_info['guest']}"
        else:
            video_title = extract_video_title(youtube_url)
            pack_name = video_title if video_title else "Track Star Pack"

    print(f"Pack name: {pack_name}")

    # Step 5: Create pack in database
    print("\nStep 4: Creating pack in database...")
    pack_description = f"Track list from Track Star episode\n\nSource: {youtube_url}"
    pack_id = create_pack(pack_name, pack_description)

    # Step 6: Add tracks to pack
    print("\nStep 5: Adding tracks to database...")
    added_count = add_tracks_to_pack(pack_id, spotify_tracks)

    print(f"\n{'='*60}")
    print(f"✓ SUCCESS!")
    print(f"{'='*60}")
    print(f"Pack created: {pack_name}")
    print(f"Pack ID: {pack_id}")
    print(f"Tracks added: {added_count}")
    print(f"\nYou can now use this pack in the game!")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
