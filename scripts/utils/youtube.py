"""
YouTube scraper utilities for extracting Track Star episode descriptions.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import Optional


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
