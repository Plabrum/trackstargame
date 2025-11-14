#!/usr/bin/env python3
"""
List all videos from the Track Star YouTube channel.

Usage:
    python list_channel_videos.py [--limit N]
"""
import sys
import os
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from youtube import extract_channel_videos, extract_video_title


def main():
    # Load environment variables
    load_dotenv()

    # Parse command line arguments
    limit = None
    if '--limit' in sys.argv:
        try:
            idx = sys.argv.index('--limit')
            limit = int(sys.argv[idx + 1])
        except (IndexError, ValueError):
            print("Error: --limit requires a number")
            sys.exit(1)

    channel_url = "https://www.youtube.com/@track-star-show/videos"

    print(f"\n{'='*60}")
    print(f"Track Star Videos")
    print(f"{'='*60}\n")

    print(f"Fetching videos from: {channel_url}")
    if limit:
        print(f"Limit: {limit} videos")
    print()

    video_urls = extract_channel_videos(channel_url, limit=limit)

    if not video_urls:
        print("Could not extract videos from channel")
        sys.exit(1)

    print(f"Found {len(video_urls)} videos:\n")

    for i, url in enumerate(video_urls, 1):
        # Try to get the title
        title = extract_video_title(url)
        if title:
            print(f"{i:3d}. {title}")
            print(f"     {url}")
        else:
            print(f"{i:3d}. {url}")
        print()

    print(f"{'='*60}")
    print(f"Total: {len(video_urls)} videos")
    print(f"{'='*60}\n")

    print("To create packs from these videos, run:")
    print("  uv run python scrape_channel.py")
    print("\nOr to process just a few:")
    print(f"  uv run python scrape_channel.py --limit 5\n")


if __name__ == '__main__':
    main()
