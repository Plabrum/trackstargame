#!/usr/bin/env python3
"""Test Spotify API with a known track."""
import sys
import os
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from spotify import SpotifyClient

load_dotenv()

# Test with some very popular tracks that should have previews
test_tracks = [
    {'title': 'Blinding Lights', 'artist': 'The Weeknd'},
    {'title': 'Shape of You', 'artist': 'Ed Sheeran'},
    {'title': 'Uptown Funk', 'artist': 'Mark Ronson'},
    {'title': 'Them Changes', 'artist': 'Thundercat'},  # From our original list
]

spotify = SpotifyClient()

print("\nTesting Spotify API with popular tracks:\n")
for track in test_tracks:
    result = spotify.search_track(track['title'], track['artist'])
    if result:
        has_preview = "✓ HAS PREVIEW" if result['preview_url'] else "✗ NO PREVIEW"
        print(f"{has_preview}: {result['title']} by {result['artist']}")
        if result['preview_url']:
            print(f"  Preview URL: {result['preview_url'][:60]}...")
    else:
        print(f"✗ NOT FOUND: {track['title']} by {track['artist']}")
    print()
