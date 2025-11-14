"""
YouTube scraper utilities for extracting Track Star episode descriptions.
"""
import re
import json
import requests
from bs4 import BeautifulSoup
from typing import Optional, List


def extract_description(url: str) -> Optional[str]:
    """
    Extract the description from a YouTube video page.

    Args:
        url: YouTube video URL (e.g., https://www.youtube.com/watch?v=DPzTKJZJ8e4)

    Returns:
        The video description as a string, or None if not found
    """
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        html = resp.text

        # The description is embedded in a JSON blob under "shortDescription":"
        pattern = re.compile(r'(?<=shortDescription":").*?(?=","isCrawlable)')
        match = pattern.search(html)

        if match:
            description = match.group(0)
            # Unescape newlines and other common escapes
            description = description.replace("\\n", "\n")
            description = description.replace("\\r", "\r")
            description = description.replace("\\'", "'")
            description = description.replace('\\"', '"')
            return description

        return None

    except requests.RequestException as e:
        print(f"Error fetching YouTube URL: {e}")
        return None


def extract_video_title(url: str) -> Optional[str]:
    """
    Extract the title from a YouTube video page.

    Args:
        url: YouTube video URL

    Returns:
        The video title, or None if not found
    """
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        html = resp.text

        # Look for the title in the page
        soup = BeautifulSoup(html, 'html.parser')
        title_tag = soup.find('title')

        if title_tag:
            title = title_tag.text
            # YouTube adds " - YouTube" to the end
            title = title.replace(" - YouTube", "").strip()
            return title

        return None

    except requests.RequestException as e:
        print(f"Error fetching YouTube URL: {e}")
        return None


def extract_channel_videos(channel_url: str, limit: Optional[int] = None) -> List[str]:
    """
    Extract video URLs from a YouTube channel's videos page.

    Args:
        channel_url: YouTube channel URL (e.g., https://www.youtube.com/@track-star-show/videos)
        limit: Maximum number of videos to return (None for all)

    Returns:
        List of video URLs
    """
    try:
        resp = requests.get(channel_url, timeout=10)
        resp.raise_for_status()
        html = resp.text

        # YouTube embeds initial data in a JSON blob
        # Look for ytInitialData
        pattern = re.compile(r'var ytInitialData = ({.*?});', re.DOTALL)
        match = pattern.search(html)

        if not match:
            print("Could not find ytInitialData in page")
            return []

        data = json.loads(match.group(1))

        # Navigate through the JSON structure to find video IDs
        # Structure: ytInitialData -> contents -> twoColumnBrowseResultsRenderer -> tabs -> tabRenderer -> content -> richGridRenderer -> contents
        video_urls = []

        try:
            tabs = data['contents']['twoColumnBrowseResultsRenderer']['tabs']

            # Find the videos tab
            videos_tab = None
            for tab in tabs:
                if 'tabRenderer' in tab:
                    tab_renderer = tab['tabRenderer']
                    if tab_renderer.get('selected'):
                        videos_tab = tab_renderer
                        break

            if not videos_tab:
                print("Could not find videos tab")
                return []

            # Get the video grid
            contents = videos_tab['content']['richGridRenderer']['contents']

            for item in contents:
                if 'richItemRenderer' in item:
                    video_renderer = item['richItemRenderer']['content']['videoRenderer']
                    video_id = video_renderer['videoId']
                    video_url = f"https://www.youtube.com/watch?v={video_id}"
                    video_urls.append(video_url)

                    if limit and len(video_urls) >= limit:
                        break

        except (KeyError, TypeError) as e:
            print(f"Error parsing video data: {e}")
            return []

        return video_urls

    except requests.RequestException as e:
        print(f"Error fetching channel URL: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON data: {e}")
        return []
