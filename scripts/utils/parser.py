"""
Parser utilities for extracting track lists from video descriptions.
"""
import re
from typing import List, Dict, Optional


def parse_track_list(description: str) -> List[Dict[str, str]]:
    """
    Parse a track list from a video description.

    Expected format:
        Track List:
        Song Title - Artist Name
        Another Song - Another Artist
        ...

    Args:
        description: The video description text

    Returns:
        List of dicts with 'title' and 'artist' keys
    """
    tracks = []

    # Find the track list section
    # Look for common patterns like "Track List:", "Tracklist:", "This Episode's Track List:"
    track_list_pattern = re.compile(
        r"(?:This Episode's )?Track ?List:?\s*\n(.*?)(?:\n\n|$)",
        re.IGNORECASE | re.DOTALL
    )

    match = track_list_pattern.search(description)
    if not match:
        print("Warning: Could not find 'Track List:' section in description")
        return tracks

    track_list_text = match.group(1)

    # Parse individual tracks
    # Common formats:
    # 1. "Song Title - Artist Name"
    # 2. "Song Title (feat. Someone) - Artist Name"
    # 3. "Song Title, Pt. 1 - Artist Name"
    lines = track_list_text.strip().split('\n')

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Skip lines that look like section headers or links
        if line.startswith('Watch more') or line.startswith('http') or line.startswith('#'):
            continue

        # Try to parse the line as "Title - Artist"
        # Split on " - " (with spaces to avoid splitting on dashes in titles)
        parts = line.split(' - ', 1)

        if len(parts) == 2:
            title = parts[0].strip()
            artist = parts[1].strip()

            # Skip if title or artist is empty
            if not title or not artist:
                continue

            tracks.append({
                'title': title,
                'artist': artist,
                'raw': line  # Keep the raw line for debugging
            })
        else:
            print(f"Warning: Could not parse line: {line}")

    return tracks


def extract_episode_info(description: str) -> Optional[Dict[str, str]]:
    """
    Extract episode information (guest name, etc.) from description.

    Args:
        description: The video description text

    Returns:
        Dict with episode info, or None if not found
    """
    # Try to extract the guest name from common patterns
    # Example: "We had the best time having Anderson .Paak on the music game show."

    guest_pattern = re.compile(
        r"having ([A-Z][^\.!?\n]+?)(?:on the|tell us|discuss)",
        re.IGNORECASE
    )

    match = guest_pattern.search(description)
    guest_name = match.group(1).strip() if match else None

    return {
        'guest': guest_name
    } if guest_name else None
