#!/usr/bin/env python3
"""
Scrape all Track Star videos from their YouTube channel and create packs.

Usage:
    python scrape_channel.py [--limit N] [--allow-duplicates]

Options:
    --limit N              Only process the first N videos
    --allow-duplicates     Allow processing videos that already have packs (default: skip existing)
"""
import sys
import os
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from youtube import extract_channel_videos, extract_description, extract_video_title
from parser import parse_track_list, extract_episode_info
from spotify import SpotifyClient
from db import create_pack, add_tracks_to_pack, get_all_packs


def video_already_processed(video_url: str, existing_packs: list) -> bool:
    """Check if a video has already been processed into a pack."""
    for pack in existing_packs:
        if pack.get('description') and video_url in pack['description']:
            return True
    return False


def process_video(youtube_url: str, spotify: SpotifyClient) -> bool:
    """Process a single video and create a pack."""
    print(f"\n{'='*60}")
    print(f"Processing: {youtube_url}")
    print(f"{'='*60}\n")

    # Step 1: Extract description
    print("Extracting description...")
    description = extract_description(youtube_url)
    if not description:
        print("✗ Could not extract description - skipping")
        return False

    # Step 2: Parse track list
    print("Parsing track list...")
    tracks = parse_track_list(description)
    if not tracks:
        print("✗ Could not parse track list - skipping")
        return False
    print(f"✓ Found {len(tracks)} tracks")

    # Step 3: Search Spotify
    print("Searching Spotify...")
    spotify_tracks = spotify.search_tracks_batch(tracks)
    if not spotify_tracks:
        print("✗ No tracks found on Spotify - skipping")
        return False
    print(f"✓ Found {len(spotify_tracks)}/{len(tracks)} tracks on Spotify")

    # Step 4: Determine pack name
    episode_info = extract_episode_info(description)
    if episode_info and episode_info.get('guest'):
        pack_name = f"Track Star - {episode_info['guest']}"
    else:
        video_title = extract_video_title(youtube_url)
        pack_name = video_title if video_title else "Track Star Pack"

    # Step 5: Create pack
    print(f"Creating pack: {pack_name}")
    pack_description = f"Track list from Track Star episode\n\nSource: {youtube_url}"
    pack_id = create_pack(pack_name, pack_description)

    # Step 6: Add tracks
    added_count = add_tracks_to_pack(pack_id, spotify_tracks)

    print(f"✓ SUCCESS! Added {added_count} tracks to '{pack_name}'")
    return True


def main():
    # Load environment variables
    load_dotenv()

    # Parse command line arguments
    limit = None
    skip_existing = True  # Default to True - safer to avoid duplicates

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--limit' and i + 1 < len(args):
            try:
                limit = int(args[i + 1])
                i += 2
            except ValueError:
                print(f"Error: --limit requires a number")
                sys.exit(1)
        elif args[i] == '--allow-duplicates':
            skip_existing = False
            i += 1
        else:
            print(f"Unknown option: {args[i]}")
            print("\nUsage: python scrape_channel.py [--limit N] [--allow-duplicates]")
            sys.exit(1)

    channel_url = "https://www.youtube.com/@track-star-show/videos"

    print(f"\n{'='*60}")
    print(f"Track Star Channel Scraper")
    print(f"{'='*60}")
    print(f"Channel: {channel_url}")
    if limit:
        print(f"Limit: {limit} videos")
    print(f"Skip existing: {'Yes' if skip_existing else 'No (allowing duplicates)'}")
    print()

    # Get existing packs (always load them to show in summary)
    print("Loading existing packs...")
    existing_packs = get_all_packs()
    print(f"Found {len(existing_packs)} existing packs\n")

    # Step 1: Extract video URLs from channel
    print("Fetching video list from channel...")
    video_urls = extract_channel_videos(channel_url, limit=limit)

    if not video_urls:
        print("Error: Could not extract videos from channel")
        sys.exit(1)

    print(f"✓ Found {len(video_urls)} videos\n")

    # Step 2: Initialize Spotify client
    spotify = SpotifyClient()

    # Step 3: Process each video
    results = {'success': 0, 'skipped': 0, 'failed': 0}
    failed_urls = []
    skipped_urls = []

    for i, url in enumerate(video_urls, 1):
        print(f"\n[{i}/{len(video_urls)}]")

        # Check if already processed
        if skip_existing and video_already_processed(url, existing_packs):
            print(f"⊘ Already processed - skipping: {url}")
            results['skipped'] += 1
            skipped_urls.append(url)
            continue

        try:
            if process_video(url, spotify):
                results['success'] += 1
            else:
                results['failed'] += 1
                failed_urls.append(url)
        except Exception as e:
            print(f"✗ Error processing video: {e}")
            results['failed'] += 1
            failed_urls.append(url)

    # Summary
    print(f"\n{'='*60}")
    print(f"Scraping Complete")
    print(f"{'='*60}")
    print(f"Total videos: {len(video_urls)}")
    print(f"Successful: {results['success']}")
    print(f"Skipped: {results['skipped']}")
    print(f"Failed: {results['failed']}")

    if skipped_urls:
        print(f"\nSkipped URLs (already processed):")
        for url in skipped_urls[:5]:  # Show first 5
            print(f"  - {url}")
        if len(skipped_urls) > 5:
            print(f"  ... and {len(skipped_urls) - 5} more")

    if failed_urls:
        print(f"\nFailed URLs:")
        for url in failed_urls:
            print(f"  - {url}")

    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
