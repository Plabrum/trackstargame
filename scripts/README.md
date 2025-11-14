# Track Star Game - Data Population Scripts

Python scripts for scraping Track Star YouTube videos and populating the Supabase database with song packs.

## Overview

These scripts allow you to:
1. Extract track lists from Track Star YouTube episode descriptions
2. Search Spotify for each track to get preview URLs
3. Automatically create packs in the database with all tracks

## Setup

### 1. Install Dependencies with UV

```bash
cd scripts
uv sync
```

This will install all required dependencies from `pyproject.toml`.

### 2. Configure Environment Variables

Create a `.env` file in the `scripts` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Supabase Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

#### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Click "Settings" → "Database"
3. Copy the connection string under "Connection string"
4. Replace `[YOUR-PASSWORD]` with your database password

#### Getting Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the form:
   - App name: "Track Star Game"
   - App description: "Music guessing game"
   - Redirect URIs: http://localhost (not used, but required)
   - Check the Terms of Service box
5. Click "Save"
6. Click "Settings"
7. Copy the "Client ID" and "Client Secret"

## Usage

### Create a Pack from YouTube Video

```bash
uv run python create_pack_from_youtube.py <youtube_url> [pack_name]
```

**Examples:**

```bash
# Auto-detect pack name from video
uv run python create_pack_from_youtube.py https://www.youtube.com/watch?v=DPzTKJZJ8e4

# Specify custom pack name
uv run python create_pack_from_youtube.py https://www.youtube.com/watch?v=DPzTKJZJ8e4 "Anderson .Paak Pack"
```

**What it does:**
1. Fetches the YouTube video description
2. Parses the track list (expects format: "Title - Artist")
3. Searches Spotify for each track
4. Gets the 30-second preview URL from Spotify
5. Creates a pack in the database
6. Adds all found tracks to the pack

**Note:** Not all tracks on Spotify have preview URLs. The script will only add tracks that have previews available.

### List All Packs

```bash
# Simple list
uv run python list_packs.py

# Show all tracks in each pack
uv run python list_packs.py --details
```

## Track Star Video Format

The scripts expect Track Star episode descriptions to have this format:

```
This Episode's Track List:
Song Title - Artist Name
Another Song - Another Artist
...

Other content (ignored)
```

### Example Videos

Here are some Track Star episodes you can use:

- Anderson .Paak: https://www.youtube.com/watch?v=DPzTKJZJ8e4
- Druski: https://www.youtube.com/watch?v=xxxxx (find actual URL)
- Fat Joe: https://www.youtube.com/watch?v=xxxxx (find actual URL)
- RZA: https://www.youtube.com/watch?v=xxxxx (find actual URL)

## Project Structure

```
scripts/
├── README.md                          # This file
├── pyproject.toml                     # UV dependencies
├── .env.example                       # Environment variables template
├── .env                               # Your credentials (git-ignored)
├── create_pack_from_youtube.py        # Main script to create packs
├── list_packs.py                      # List all packs in database
└── utils/
    ├── youtube.py                     # YouTube scraping utilities
    ├── parser.py                      # Track list parsing
    ├── spotify.py                     # Spotify API wrapper
    └── db.py                          # Database utilities
```

## Troubleshooting

### "Could not find description"

The YouTube scraping relies on extracting JSON from the HTML. If YouTube changes their page structure, this may break. You can:
1. Try again later (sometimes it's a temporary issue)
2. Manually copy the track list and create a pack

### "No preview URL for track"

Some tracks on Spotify don't have 30-second preview URLs. This is a Spotify limitation. The script will skip these tracks and continue with the others.

### "No results found for track"

The Spotify search couldn't find a match. This can happen if:
- The track name/artist is misspelled in the description
- The track isn't on Spotify
- The search query needs adjustment

You can manually fix the track name in the description or add it to the database later.

### Database Connection Errors

Make sure:
1. Your `DATABASE_URL` is correct
2. Your database password is correct
3. Your Supabase project is active (not paused)
4. You have network connectivity

## Next Steps

After populating the database:
1. Run `uv run python list_packs.py --details` to verify your packs
2. Start Phase 3: Implement the game state and API routes
3. Test the game with real music!

## License

MIT
