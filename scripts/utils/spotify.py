"""
Spotify API utilities for searching tracks and getting preview URLs.
"""
import os
from typing import Optional, Dict, List
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials


class SpotifyClient:
    """Wrapper for Spotify API interactions."""

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        """
        Initialize Spotify client.

        Args:
            client_id: Spotify app client ID (defaults to env var SPOTIFY_CLIENT_ID or NEXT_PUBLIC_SPOTIFY_CLIENT_ID)
            client_secret: Spotify app client secret (defaults to env var SPOTIFY_CLIENT_SECRET)
        """
        self.client_id = client_id or os.getenv('SPOTIFY_CLIENT_ID') or os.getenv('NEXT_PUBLIC_SPOTIFY_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('SPOTIFY_CLIENT_SECRET')

        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Spotify credentials not found. Set SPOTIFY_CLIENT_ID and "
                "SPOTIFY_CLIENT_SECRET environment variables or pass them to the constructor."
            )

        auth_manager = SpotifyClientCredentials(
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        self.sp = spotipy.Spotify(auth_manager=auth_manager)

    def get_artist_genres(self, artist_id: str) -> List[str]:
        """
        Get genres for a specific artist.

        Args:
            artist_id: Spotify artist ID

        Returns:
            List of genre strings (may be empty)
        """
        try:
            artist = self.sp.artist(artist_id)
            return artist.get('genres', [])
        except Exception as e:
            print(f"Error fetching artist {artist_id}: {e}")
            return []

    def _extract_year(self, release_date: str) -> Optional[int]:
        """
        Extract year from Spotify release_date string.

        Args:
            release_date: Release date in format 'YYYY-MM-DD' or 'YYYY'

        Returns:
            Year as integer, or None if invalid
        """
        if not release_date:
            return None

        try:
            # Release date can be 'YYYY-MM-DD', 'YYYY-MM', or just 'YYYY'
            year = int(release_date.split('-')[0])
            return year if 1900 <= year <= 2100 else None
        except (ValueError, IndexError):
            return None

    def _get_primary_genre(self, artist_ids: List[str]) -> Optional[str]:
        """
        Get primary genre from the first artist's genres.

        Args:
            artist_ids: List of Spotify artist IDs

        Returns:
            Primary genre string, or None if no genres found
        """
        if not artist_ids:
            return None

        # Get genres from first artist
        genres = self.get_artist_genres(artist_ids[0])
        return genres[0] if genres else None

    def search_track(self, title: str, artist: str) -> Optional[Dict[str, str]]:
        """
        Search for a track on Spotify and return its details.

        Args:
            title: Song title
            artist: Artist name

        Returns:
            Dict with track info (title, artist, spotify_id), or None if not found
        """
        query = f"track:{title} artist:{artist}"

        try:
            results = self.sp.search(q=query, type='track', limit=1)

            if not results['tracks']['items']:
                print(f"Warning: No results found for '{title}' by {artist}")
                return None

            track = results['tracks']['items'][0]

            # Extract artist IDs for genre lookup
            artist_ids = [artist['id'] for artist in track['artists']]

            return {
                'title': track['name'],
                'artist': ', '.join(artist['name'] for artist in track['artists']),
                'spotify_id': track['id'],
                'album': track['album']['name'],
                'release_date': track['album']['release_date'],
                'release_year': self._extract_year(track['album']['release_date']),
                'primary_genre': self._get_primary_genre(artist_ids),
            }

        except Exception as e:
            print(f"Error searching for '{title}' by {artist}: {e}")
            return None

    def search_tracks_batch(self, tracks: list) -> list:
        """
        Search for multiple tracks on Spotify.

        Args:
            tracks: List of dicts with 'title' and 'artist' keys

        Returns:
            List of track info dicts (only successful matches)
        """
        results = []

        for track in tracks:
            title = track.get('title')
            artist = track.get('artist')

            if not title or not artist:
                print(f"Warning: Invalid track format: {track}")
                continue

            print(f"Searching Spotify for: {title} - {artist}")
            result = self.search_track(title, artist)

            if result:
                results.append(result)
                print(f"  ✓ Found: {result['title']} by {result['artist']}")
                print(f"    Spotify ID: {result['spotify_id']}")
            else:
                print(f"  ✗ Not found on Spotify")

        return results

    def get_playlist_tracks(self, playlist_id: str) -> tuple[Optional[str], list]:
        """
        Get all tracks from a Spotify playlist.

        Args:
            playlist_id: Spotify playlist ID or URL

        Returns:
            Tuple of (playlist_name, list of track info dicts)
        """
        # Extract playlist ID from URL if needed
        if 'spotify.com/playlist/' in playlist_id:
            playlist_id = playlist_id.split('playlist/')[-1].split('?')[0]

        try:
            # Get playlist details
            playlist = self.sp.playlist(playlist_id)
            playlist_name = playlist['name']
            print(f"Found playlist: {playlist_name}")
            print(f"Total tracks: {playlist['tracks']['total']}")

            # Get all tracks (handle pagination)
            tracks = []
            results = playlist['tracks']

            while results:
                for item in results['items']:
                    if item['track'] is None:
                        continue

                    track = item['track']

                    # Extract artist IDs for genre lookup
                    artist_ids = [artist['id'] for artist in track['artists']]

                    tracks.append({
                        'title': track['name'],
                        'artist': ', '.join(artist['name'] for artist in track['artists']),
                        'spotify_id': track['id'],
                        'album': track['album']['name'],
                        'release_date': track['album']['release_date'],
                        'release_year': self._extract_year(track['album']['release_date']),
                        'primary_genre': self._get_primary_genre(artist_ids),
                    })

                # Get next page if available
                if results['next']:
                    results = self.sp.next(results)
                else:
                    results = None

            return playlist_name, tracks

        except Exception as e:
            print(f"Error fetching playlist: {e}")
            return None, []

    def get_tracks_batch(self, spotify_ids: List[str]) -> List[Dict[str, Optional[str]]]:
        """
        Fetch track data for multiple Spotify IDs at once (up to 50).

        Args:
            spotify_ids: List of Spotify track IDs (max 50)

        Returns:
            List of dicts with track data: {
                'spotify_id': str,
                'popularity': int (0-100),
                'isrc': str or None
            }
        """
        if not spotify_ids:
            return []

        if len(spotify_ids) > 50:
            raise ValueError("Maximum 50 track IDs per request")

        try:
            # Fetch tracks from Spotify
            results = self.sp.tracks(spotify_ids)

            tracks_data = []
            for track in results.get('tracks', []):
                if track is None:
                    # Track not found or unavailable
                    continue

                # Extract ISRC from external_ids
                isrc = track.get('external_ids', {}).get('isrc')

                tracks_data.append({
                    'spotify_id': track['id'],
                    'popularity': track.get('popularity'),
                    'isrc': isrc
                })

            return tracks_data

        except Exception as e:
            print(f"Error fetching tracks batch: {e}")
            return []
