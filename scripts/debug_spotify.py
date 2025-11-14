#!/usr/bin/env python3
"""Debug Spotify API response."""
import sys
import os
from dotenv import load_dotenv
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from spotify import SpotifyClient

load_dotenv()

spotify = SpotifyClient()

# Test with a very popular track
query = "track:Blinding Lights artist:The Weeknd"
print(f"Searching: {query}\n")

results = spotify.sp.search(q=query, type='track', limit=1)

if results['tracks']['items']:
    track = results['tracks']['items'][0]
    print("Full track data:")
    print(json.dumps(track, indent=2))
else:
    print("No results found")
