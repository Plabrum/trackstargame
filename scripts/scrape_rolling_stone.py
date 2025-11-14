#!/usr/bin/env python3
"""
Scrape Rolling Stone's 500 Greatest Songs of All Time and create a pack.

Usage:
    python scrape_rolling_stone.py [--limit N]

Options:
    --limit N    Only process the first N songs (for testing)
"""
import sys
import os
import re
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from spotify import SpotifyClient
from db import create_pack, add_tracks_to_pack


def scrape_rolling_stone_top_500(limit=None):
    """
    Scrape the Rolling Stone Top 500 songs list.

    Returns:
        List of dicts with 'title' and 'artist' keys
    """
    url = "https://www.rollingstone.com/music/music-lists/best-songs-of-all-time-1224767/"

    print(f"Fetching Rolling Stone Top 500 list...")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Find all list items - Rolling Stone uses a specific structure
        # Look for article elements or list items with song information
        songs = []

        # Try different selectors to find the songs
        # Option 1: Look for h2/h3 headings with song titles
        song_elements = soup.find_all(['h2', 'h3'], class_=re.compile(r'c-list.*|article.*|entry.*'))

        if not song_elements:
            # Option 2: Look for any article or list structure
            song_elements = soup.find_all('article')

        if not song_elements:
            # Option 3: Look in divs with specific classes
            song_elements = soup.find_all('div', class_=re.compile(r'list-item|gallery-item'))

        print(f"Found {len(song_elements)} potential song elements")

        for element in song_elements:
            # Try to extract song title and artist
            # Common patterns: "Song Title" - Artist Name
            # or "Artist Name, 'Song Title'"

            text = element.get_text(strip=True)

            # Try to parse format: "Artist Name, 'Song Title'"
            match = re.match(r"(.+?),\s*['\"](.+?)['\"]", text)
            if match:
                artist = match.group(1).strip()
                title = match.group(2).strip()
                songs.append({'artist': artist, 'title': title})
                if limit and len(songs) >= limit:
                    break
                continue

            # Try to parse format: "'Song Title'" - Artist Name or Artist Name - 'Song Title'
            match = re.match(r"['\"](.+?)['\"].*?[-–—]\s*(.+)", text)
            if match:
                title = match.group(1).strip()
                artist = match.group(2).strip()
                songs.append({'artist': artist, 'title': title})
                if limit and len(songs) >= limit:
                    break
                continue

            # Try to parse format: Artist Name - Song Title
            match = re.match(r"(.+?)\s*[-–—]\s*(.+)", text)
            if match and len(text) < 200:  # Avoid matching long descriptions
                artist = match.group(1).strip()
                title = match.group(2).strip()
                # Filter out obvious non-songs (like dates, numbers only, etc.)
                if not re.match(r'^\d+$', title) and not re.match(r'^\d{4}', title):
                    songs.append({'artist': artist, 'title': title})
                    if limit and len(songs) >= limit:
                        break

        return songs

    except Exception as e:
        print(f"Error scraping Rolling Stone: {e}")
        return []


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

    print(f"\n{'='*60}")
    print(f"Rolling Stone Top 500 Songs Scraper")
    print(f"{'='*60}\n")

    # Step 1: Scrape the list
    songs = scrape_rolling_stone_top_500(limit=limit)

    if not songs:
        print("Error: Could not scrape any songs from Rolling Stone")
        print("\nTrying alternative approach - please provide a manual list if needed")
        sys.exit(1)

    print(f"\n✓ Extracted {len(songs)} songs\n")

    # Show first few songs
    print("First 10 songs found:")
    for i, song in enumerate(songs[:10], 1):
        print(f"  {i}. {song['title']} - {song['artist']}")
    print()

    # Step 2: Search Spotify
    print("Searching Spotify for tracks...")
    spotify = SpotifyClient()
    spotify_tracks = spotify.search_tracks_batch(songs)

    if not spotify_tracks:
        print("Error: No tracks found on Spotify")
        sys.exit(1)

    print(f"\n✓ Found {len(spotify_tracks)}/{len(songs)} tracks on Spotify\n")

    # Step 3: Create pack
    pack_name = "Rolling Stone's 500 Greatest Songs of All Time"
    if limit:
        pack_name = f"Rolling Stone's Top {len(songs)} Songs"

    pack_description = f"Songs from Rolling Stone's 500 Greatest Songs of All Time list\n\nSource: https://www.rollingstone.com/music/music-lists/best-songs-of-all-time-1224767/"

    print(f"Creating pack: {pack_name}")
    pack_id = create_pack(pack_name, pack_description)

    # Step 4: Add tracks
    added_count = add_tracks_to_pack(pack_id, spotify_tracks)

    print(f"\n{'='*60}")
    print(f"✓ SUCCESS!")
    print(f"{'='*60}")
    print(f"Pack created: {pack_name}")
    print(f"Pack ID: {pack_id}")
    print(f"Tracks added: {added_count}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
