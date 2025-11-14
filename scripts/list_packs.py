#!/usr/bin/env python3
"""
List all packs in the database.

Usage:
    python list_packs.py [--details]
"""
import sys
import os
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from db import get_all_packs, get_pack_tracks


def main():
    # Load environment variables
    load_dotenv()

    show_details = '--details' in sys.argv

    print(f"\n{'='*60}")
    print(f"Packs in Database")
    print(f"{'='*60}\n")

    packs = get_all_packs()

    if not packs:
        print("No packs found in database.")
        print("\nCreate a pack using:")
        print("  python create_pack_from_youtube.py <youtube_url>\n")
        return

    for pack in packs:
        print(f"📦 {pack['name']}")
        print(f"   ID: {pack['id']}")
        print(f"   Tracks: {pack['track_count']}")
        print(f"   Created: {pack['created_at']}")

        if pack['description']:
            print(f"   Description: {pack['description'][:100]}...")

        if show_details and pack['track_count'] > 0:
            print(f"\n   Tracks:")
            tracks = get_pack_tracks(pack['id'])
            for i, track in enumerate(tracks, 1):
                print(f"     {i}. {track['title']} - {track['artist']}")

        print()

    print(f"{'='*60}")
    print(f"Total packs: {len(packs)}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
