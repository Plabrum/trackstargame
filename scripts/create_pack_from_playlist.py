#!/usr/bin/env python3
"""
Create a pack from a Spotify playlist.

Usage:
    python create_pack_from_playlist.py <playlist_url_or_id> [custom_pack_name]

Examples:
    # Use playlist name as pack name
    python create_pack_from_playlist.py https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M

    # Use custom pack name
    python create_pack_from_playlist.py 37i9dQZF1DXcBWIGoYBM5M "My Custom Pack Name"
"""
import sys
import os
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from spotify import SpotifyClient
from db import create_pack, add_tracks_to_pack


def main():
    # Load environment variables
    load_dotenv()

    if len(sys.argv) < 2:
        print("Usage: python create_pack_from_playlist.py <playlist_url_or_id> [custom_pack_name]")
        print("\nExamples:")
        print("  # Use playlist name as pack name")
        print("  python create_pack_from_playlist.py https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
        print()
        print("  # Use custom pack name")
        print("  python create_pack_from_playlist.py 37i9dQZF1DXcBWIGoYBM5M 'My Custom Pack'")
        sys.exit(1)

    playlist_id = sys.argv[1]
    custom_pack_name = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"\n{'='*60}")
    print(f"Creating Pack from Spotify Playlist")
    print(f"{'='*60}\n")

    # Initialize Spotify client
    spotify = SpotifyClient()

    # Get playlist tracks
    print(f"Fetching playlist: {playlist_id}")
    playlist_name, tracks = spotify.get_playlist_tracks(playlist_id)

    if not playlist_name:
        print("\nError: Could not fetch playlist. Check the URL/ID and your credentials.")
        sys.exit(1)

    if not tracks:
        print("\nError: No tracks found in playlist")
        sys.exit(1)

    print(f"\n✓ Found {len(tracks)} tracks\n")

    # Show first few tracks
    print("First 10 tracks:")
    for i, track in enumerate(tracks[:10], 1):
        print(f"  {i}. {track['title']} - {track['artist']}")
    if len(tracks) > 10:
        print(f"  ... and {len(tracks) - 10} more")
    print()

    # Use custom name or playlist name
    pack_name = custom_pack_name or playlist_name
    pack_description = f"Pack created from Spotify playlist: {playlist_name}"

    # Create pack
    print(f"Creating pack: {pack_name}")
    pack_id = create_pack(pack_name, pack_description)

    # Add tracks
    added_count = add_tracks_to_pack(pack_id, tracks)

    print(f"\n{'='*60}")
    print(f"✓ SUCCESS!")
    print(f"{'='*60}")
    print(f"Pack created: {pack_name}")
    print(f"Pack ID: {pack_id}")
    print(f"Tracks added: {added_count}/{len(tracks)}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
