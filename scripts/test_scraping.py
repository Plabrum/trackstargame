#!/usr/bin/env python3
"""
Test YouTube scraping and track parsing without database/Spotify.

This lets you verify the scraping works before setting up credentials.
"""
import sys
import os

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from youtube import extract_description, extract_video_title
from parser import parse_track_list, extract_episode_info


def main():
    youtube_url = "https://www.youtube.com/watch?v=DPzTKJZJ8e4"

    if len(sys.argv) > 1:
        youtube_url = sys.argv[1]

    print(f"\n{'='*60}")
    print(f"Testing YouTube Scraping")
    print(f"{'='*60}\n")
    print(f"URL: {youtube_url}\n")

    # Extract title
    print("Extracting video title...")
    title = extract_video_title(youtube_url)
    print(f"✓ Title: {title}\n")

    # Extract description
    print("Extracting description...")
    description = extract_description(youtube_url)

    if not description:
        print("✗ Could not extract description")
        sys.exit(1)

    print(f"✓ Description extracted ({len(description)} characters)\n")
    print("Description preview:")
    print("-" * 60)
    print(description[:500] + "..." if len(description) > 500 else description)
    print("-" * 60)
    print()

    # Extract episode info
    print("Extracting episode info...")
    episode_info = extract_episode_info(description)
    if episode_info:
        print(f"✓ Guest: {episode_info.get('guest', 'Unknown')}\n")
    else:
        print("✗ Could not extract episode info\n")

    # Parse track list
    print("Parsing track list...")
    tracks = parse_track_list(description)

    if not tracks:
        print("✗ Could not parse track list")
        print("\nFull description:")
        print(description)
        sys.exit(1)

    print(f"✓ Found {len(tracks)} tracks:\n")
    for i, track in enumerate(tracks, 1):
        print(f"  {i:2d}. {track['title']} - {track['artist']}")

    print(f"\n{'='*60}")
    print(f"✓ Scraping test successful!")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
