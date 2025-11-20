#!/usr/bin/env python3
"""
Enrich existing tracks with metadata from Spotify using Supabase MCP tools.

This script fetches metadata (release year, album name, primary genre) for
existing tracks in the database and updates them with this information.
"""
import os
import time
from pathlib import Path
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

env_local_path = Path(__file__).parent.parent / '.env.local'
if env_local_path.exists():
    load_dotenv(env_local_path)

PROJECT_ID = 'tbsqgbgghjdezvhnssje'


def get_artist_genres(sp, artist_id: str) -> list:
    """Get genres for a specific artist."""
    try:
        artist = sp.artist(artist_id)
        return artist.get('genres', [])
    except Exception as e:
        print(f"Error fetching artist {artist_id}: {e}")
        return []


def extract_year(release_date: str) -> int:
    """Extract year from release date string."""
    if not release_date:
        return None
    try:
        year = int(release_date.split('-')[0])
        return year if 1900 <= year <= 2100 else None
    except (ValueError, IndexError):
        return None


def get_primary_genre(sp, artist_ids: list) -> str:
    """Get primary genre from the first artist."""
    if not artist_ids:
        return None
    genres = get_artist_genres(sp, artist_ids[0])
    return genres[0] if genres else None


def main():
    """Main entry point."""
    print("Track Metadata Enrichment Script (Using Supabase MCP)")
    print("=" * 80)

    # Initialize Spotify client
    client_id = os.getenv('SPOTIFY_CLIENT_ID') or os.getenv('NEXT_PUBLIC_SPOTIFY_CLIENT_ID')
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')

    if not client_id or not client_secret:
        print("Error: Spotify credentials not found")
        return

    auth_manager = SpotifyClientCredentials(
        client_id=client_id,
        client_secret=client_secret
    )
    sp = spotipy.Spotify(auth_manager=auth_manager)

    print("\nFetching tracks from database...")

    # Note: This script should be run through Claude Code with MCP tools available
    # The actual database operations will be done through the mcp__supabase__execute_sql tool
    print("\nThis script requires MCP tools to be run through Claude Code.")
    print("Please run this through Claude Code which will handle the database operations.")


if __name__ == '__main__':
    main()
