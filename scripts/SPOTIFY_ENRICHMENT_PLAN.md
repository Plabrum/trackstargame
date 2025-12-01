# Spotify Popularity & ISRC Enrichment Plan

## Overview

Enrich existing tracks in the production database with two additional fields from Spotify:
- **spotify_popularity**: Integer (0-100) representing current track popularity
- **isrc**: International Standard Recording Code for track identification

## Database Schema Status

✅ **Migrations Applied:**
- `20251126000002_add_spotify_popularity_to_tracks.sql` - Added `spotify_popularity` column with constraints and index
- `20251126000003_add_isrc_to_tracks.sql` - Added `isrc` column with index

## Enrichment Strategy

### Two-Phase Approach

**Phase 1: Fetch Data from Spotify → CSV**
- Query production DB for all track Spotify IDs
- Batch fetch track data from Spotify (50 tracks per request)
- Write results to CSV file with columns: `track_id`, `spotify_id`, `spotify_popularity`, `isrc`
- CSV serves as audit trail and allows review before DB update

**Phase 2: Bulk Update Production DB from CSV**
- Read CSV file
- Batch update production database (using PostgreSQL COPY or multi-row UPDATE)
- Validate updates with count checks
- Log any errors or missing data

### Why This Approach?

1. **Efficiency**: Spotify's `/tracks` endpoint accepts up to 50 IDs per request (much faster than 1-at-a-time)
2. **Audit Trail**: CSV file provides record of what was fetched and when
3. **Safety**: Review data before applying to production
4. **Retry-able**: Can re-run DB update without re-fetching from Spotify
5. **Rate Limiting**: Easier to manage with batch requests

## Spotify API Details

### Endpoint
```
GET https://api.spotify.com/v1/tracks?ids={comma-separated-ids}
```

### Batch Size
- **Maximum**: 50 track IDs per request
- **Rate Limit**: ~180 requests per minute (check current limits)
- **For ~3,159 tracks**: ~63 requests, ~21 seconds minimum (with 0.33s delay between requests)

### Response Fields Needed
```json
{
  "tracks": [
    {
      "id": "spotify_track_id",
      "popularity": 85,           // ← We want this (0-100)
      "external_ids": {
        "isrc": "USUM71703861"    // ← We want this
      }
    }
  ]
}
```

## Implementation Files

### New Scripts to Create

1. **`scripts/fetch_spotify_metadata.py`**
   - Fetch all track IDs from production DB
   - Batch fetch from Spotify API (50 at a time)
   - Write to `scripts/data/spotify_enrichment_YYYYMMDD_HHMMSS.csv`
   - Handle rate limiting, errors, missing data

2. **`scripts/apply_spotify_enrichment.py`**
   - Read CSV file
   - Bulk update production database
   - Validate record counts
   - Report statistics

### CSV Format

```csv
track_id,spotify_id,spotify_popularity,isrc
uuid-1234,spotify-id-1,85,USUM71703861
uuid-5678,spotify-id-2,72,GBUM71507847
uuid-9012,spotify-id-3,91,
```

**Notes:**
- `track_id`: UUID from our database
- `spotify_id`: Spotify track ID (for reference/debugging)
- `spotify_popularity`: Integer 0-100, or empty if not available
- `isrc`: String, or empty if not available

## Existing Code to Reference

### Database Connection
- `scripts/utils/db.py` - Already has `get_db_connection()` context manager

### Spotify Client
- `scripts/utils/spotify.py` - Has `SpotifyClient` class
- **Need to add**: `get_tracks_batch(spotify_ids: List[str])` method for batch fetching

## Expected Results

### Coverage
- **Total tracks**: ~3,159
- **Expected success rate**: 95-98% (some tracks may not have ISRC)
- **Popularity**: Should be present for all tracks
- **ISRC**: May be missing for older/obscure tracks

### Use Cases After Enrichment

1. **Dynamic Pack Difficulty**
   - Filter packs by popularity ranges (easy: 80-100, medium: 50-79, hard: 0-49)
   - "Top Hits" packs vs "Deep Cuts" packs

2. **Track Deduplication**
   - Use ISRC to identify duplicate recordings across different Spotify IDs
   - Handle re-releases, remastered versions

3. **Smart Pack Generation**
   - Balance pack difficulty using popularity scores
   - Avoid packs with all obscure tracks or all popular tracks

4. **UI Enhancements**
   - Show popularity indicator in pack preview
   - Sort tracks by popularity in admin views
   - Display "difficulty level" based on average popularity

## Implementation Steps

### Step 1: Extend Spotify Client
Add batch fetch method to `scripts/utils/spotify.py`:
```python
def get_tracks_batch(self, spotify_ids: List[str]) -> List[Dict]:
    """Fetch track data for up to 50 Spotify IDs at once."""
    # Use spotipy.tracks(spotify_ids)
    # Extract popularity and ISRC from each track
    # Return list of dicts with track data
```

### Step 2: Create Fetch Script
Create `scripts/fetch_spotify_metadata.py`:
- Query DB for all track IDs and Spotify IDs
- Chunk into batches of 50
- Fetch from Spotify with rate limiting
- Write to timestamped CSV
- Log progress and errors

### Step 3: Create Update Script
Create `scripts/apply_spotify_enrichment.py`:
- Accept CSV filename as argument
- Read CSV into memory
- Batch update DB (use `psycopg2.extras.execute_values`)
- Validate counts match
- Report statistics

### Step 4: Test on Local DB First
- Run fetch script against production (read-only)
- Apply CSV to local database
- Verify data looks correct
- Generate types and check schema

### Step 5: Apply to Production
- Review CSV data
- Run update script against production
- Verify with query: `SELECT COUNT(*) FROM tracks WHERE spotify_popularity IS NOT NULL`
- Generate updated types

## Safety Considerations

1. **Read-only Fetch**: Phase 1 only reads from DB, no updates
2. **CSV Review**: Manual review of CSV before applying
3. **Validation**: Count checks before/after update
4. **Rollback Plan**: If needed, can set columns back to NULL
5. **Rate Limiting**: Respect Spotify API limits

## Timeline

- **Phase 1 (Fetch)**: ~5 minutes to implement + ~1 minute to run
- **Phase 2 (Update)**: ~5 minutes to implement + ~30 seconds to run
- **Total**: ~15-20 minutes including testing and validation

## Migration Status

These migrations have already been applied to production:
```sql
-- 20251126000002_add_spotify_popularity_to_tracks.sql
ALTER TABLE tracks ADD COLUMN spotify_popularity INT;
ALTER TABLE tracks ADD CONSTRAINT spotify_popularity_range
  CHECK (spotify_popularity >= 0 AND spotify_popularity <= 100);
CREATE INDEX idx_tracks_spotify_popularity ON tracks(spotify_popularity DESC);

-- 20251126000003_add_isrc_to_tracks.sql
ALTER TABLE tracks ADD COLUMN isrc TEXT;
CREATE INDEX idx_tracks_isrc ON tracks(isrc);
```

Database is ready to receive the data.
