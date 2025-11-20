# Pack Generation Guide

This guide explains how to create genre+decade packs from your existing "Every Track Star* Song" pack.

## What's Been Set Up

### 1. Database Schema ✅
- Added `release_year`, `album_name`, and `primary_genre` columns to the `tracks` table
- Created indexes for efficient filtering
- Migration has been applied to the database

### 2. Updated Scripts ✅
- **`utils/spotify.py`**: Enhanced to fetch artist genres and extract release years
- **`utils/db.py`**: Updated to handle new metadata fields
- **`enrich_existing_tracks.py`**: Script to fetch and store metadata from Spotify
- **`generate_decade_genre_packs.py`**: Script to create decade+genre combination packs

## Current Status

Your database has:
- **3,159 tracks** in the "Every Track Star* Song" pack
- All tracks need metadata enrichment (genre and year data from Spotify)
- Once enriched, these will be grouped into packs like "70s Rock", "80s Pop", "90s Hip Hop", etc.

## Next Steps

### Step 1: Enrich Tracks with Metadata

Run the enrichment script to fetch genre and year data from Spotify:

```bash
cd scripts
uv run python enrich_existing_tracks.py
```

When prompted:
1. Choose which pack to enrich (select option 1 for "Every Track Star* Song")
   - Or type "all" to enrich all packs
2. The script will:
   - Fetch metadata for each track from Spotify (album, year, artist genres)
   - Update the database with this information
   - Show progress as it processes

**Important Notes:**
- This will take approximately **25-30 minutes** for 3,159 tracks
- The script respects Spotify's rate limits (0.5s delay between tracks)
- You can safely interrupt and restart - it skips already-enriched tracks

**Database Connection:**
If you encounter database connection errors, set the `DATABASE_URL` environment variable in your `.env` file:

```bash
# Add to .env file
DATABASE_URL=postgresql://postgres:[YOUR_DB_PASSWORD]@db.tbsqgbgghjdezvhnssje.supabase.co:6543/postgres
```

Replace `[YOUR_DB_PASSWORD]` with the value from your existing `DB_PASSWORD` env var.

### Step 2: Generate Decade+Genre Packs

After enrichment is complete, run the pack generation script:

```bash
cd scripts
uv run python generate_decade_genre_packs.py
```

The script will:
1. Load all enriched tracks from the "Every Track Star* Song" pack
2. Group them by decade (60s, 70s, 80s, etc.) and primary genre (Rock, Pop, Hip Hop, etc.)
3. Show you a preview of how many packs will be created
4. Ask for confirmation before creating packs
5. Create new packs with appropriate tags

**Pack Creation Rules:**
- Only creates packs with **10+ tracks** (configurable in script)
- Genres are normalized (e.g., "hip hop" and "rap" → "Hip Hop")
- Each pack gets tags: `[decade, genre]` (e.g., `["70s", "rock"]`)
- Pack names follow format: `"{decade} {genre}"` (e.g., "70s Rock")

## Troubleshooting

### Database Connection Issues

If you see "could not translate host name" errors:

1. **Option A**: Use Supabase connection pooler
   ```bash
   DATABASE_URL=postgresql://postgres:[password]@db.tbsqgbgghjdezvhnssje.supabase.co:6543/postgres
   ```

2. **Option B**: Set up local Supabase CLI
   ```bash
   npx supabase db pull
   # Then use local database for development
   ```

### Spotify API Rate Limits

If you hit rate limits:
- The script already includes 0.5s delays between requests
- You can increase the delay in `enrich_existing_tracks.py` (line with `time.sleep(0.5)`)
- Or run in smaller batches by selecting individual packs

### Missing Genres

Some artists may not have genre data in Spotify. The script handles this by:
- Setting `primary_genre` to `None` for tracks without genre data
- These tracks won't be included in genre-specific packs
- You'll see a count of tracks without genres in the summary

## Expected Results

After running both scripts, you should have:

**Example packs that might be created:**
- 70s Rock (150 tracks)
- 80s Pop (200 tracks)
- 90s Hip Hop (180 tracks)
- 2000s Indie (95 tracks)
- etc.

The original "Every Track Star* Song" pack will remain unchanged.

## Files Modified/Created

- `supabase/migrations/20251119000005_add_track_metadata.sql` - Database schema changes
- `scripts/utils/spotify.py` - Enhanced Spotify API integration
- `scripts/utils/db.py` - Database utility updates
- `scripts/enrich_existing_tracks.py` - Metadata enrichment script
- `scripts/generate_decade_genre_packs.py` - Pack generation script

## Future Enhancements

Now that tracks have metadata, you can:
- Filter tracks by year or genre in the UI
- Create custom pack filters (e.g., "80s and 90s only")
- Show decade/genre information in the game
- Create themed playlists based on metadata
