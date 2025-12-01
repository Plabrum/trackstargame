# Code Changes Required for Database Normalization

## Summary

**3 TypeScript files** and **1 Python utility** need updates to work with the normalized schema.

## TypeScript Changes

### 1. `components/host/PackGalleryContent.tsx:60`

**Current:**
```typescript
const { count } = await supabase
  .from('tracks')
  .select('*', { count: 'exact', head: true })
  .eq('pack_id', pack.id);
```

**New:**
```typescript
const { count } = await supabase
  .from('pack_tracks')
  .select('*', { count: 'exact', head: true })
  .eq('pack_id', pack.id);
```

### 2. `components/host/PackSongsSheet.tsx:43`

**Current:**
```typescript
const { data, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('pack_id', pack.id)
  .order('title');
```

**New:**
```typescript
const { data, error } = await supabase
  .from('pack_tracks')
  .select(`
    position,
    track:tracks (
      id,
      title,
      artist,
      spotify_id,
      album_name,
      release_year,
      primary_genre,
      spotify_popularity,
      isrc
    )
  `)
  .eq('pack_id', pack.id)
  .order('position');

// Transform response to match expected format
const tracks = data?.map(pt => pt.track) || [];
```

### 3. `hooks/queries/use-game.ts:193`

**No change needed!** This query fetches a track by `id`, which will remain the same:
```typescript
const { data, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('id', trackId)
  .single();
```

## Python Changes

### 4. `scripts/utils/db.py` - `add_tracks_to_pack()` function

**Current (lines 67-112):**
```python
def add_tracks_to_pack(pack_id: str, tracks: List[Dict[str, str]]) -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()

        values = [
            (
                pack_id,
                track['title'],
                track['artist'],
                track['spotify_id'],
                track.get('release_year'),
                track.get('album_name'),
                track.get('primary_genre')
            )
            for track in tracks
        ]

        execute_values(
            cursor,
            """
            INSERT INTO tracks (pack_id, title, artist, spotify_id, release_year, album_name, primary_genre)
            VALUES %s
            """,
            values
        )

        cursor.close()
        return len(tracks)
```

**New:**
```python
def add_tracks_to_pack(pack_id: str, tracks: List[Dict[str, str]]) -> int:
    """
    Add multiple tracks to a pack (with deduplication).

    For each track:
    1. Insert/update in tracks table (upsert by spotify_id)
    2. Link to pack in pack_tracks table
    """
    if not tracks:
        return 0

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Step 1: Upsert tracks (insert or update if spotify_id exists)
        track_values = [
            (
                track['spotify_id'],
                track['title'],
                track['artist'],
                track.get('album_name'),
                track.get('release_year'),
                track.get('primary_genre'),
                track.get('spotify_popularity'),
                track.get('isrc')
            )
            for track in tracks
        ]

        execute_values(
            cursor,
            """
            INSERT INTO tracks (spotify_id, title, artist, album_name, release_year, primary_genre, spotify_popularity, isrc)
            VALUES %s
            ON CONFLICT (spotify_id)
            DO UPDATE SET
                title = EXCLUDED.title,
                artist = EXCLUDED.artist,
                album_name = EXCLUDED.album_name,
                release_year = EXCLUDED.release_year,
                primary_genre = EXCLUDED.primary_genre,
                spotify_popularity = EXCLUDED.spotify_popularity,
                isrc = EXCLUDED.isrc,
                updated_at = NOW()
            """,
            track_values
        )

        # Step 2: Get track IDs for linking
        spotify_ids = [track['spotify_id'] for track in tracks]
        placeholders = ','.join(['%s'] * len(spotify_ids))

        cursor.execute(
            f"""
            SELECT id, spotify_id FROM tracks
            WHERE spotify_id IN ({placeholders})
            """,
            spotify_ids
        )

        id_lookup = {row[1]: row[0] for row in cursor.fetchall()}

        # Step 3: Link tracks to pack
        link_values = [
            (pack_id, id_lookup[track['spotify_id']], i + 1)
            for i, track in enumerate(tracks)
            if track['spotify_id'] in id_lookup
        ]

        execute_values(
            cursor,
            """
            INSERT INTO pack_tracks (pack_id, track_id, position)
            VALUES %s
            ON CONFLICT (pack_id, track_id) DO NOTHING
            """,
            link_values
        )

        cursor.close()
        return len(link_values)
```

### 5. `scripts/utils/db.py` - `update_track_metadata()` function

**Current approach:**
Updates tracks by `track_id` (UUID)

**Issue:**
After normalization, we have 2,931 unique tracks instead of 5,680. The enrichment CSV has 5,680 track_ids (duplicates).

**Solution:**
Update by `spotify_id` instead of `track_id`:

```python
def update_track_metadata_by_spotify_id(
    spotify_id: str,
    spotify_popularity: Optional[int] = None,
    isrc: Optional[str] = None,
    release_year: Optional[int] = None,
    album_name: Optional[str] = None,
    primary_genre: Optional[str] = None
) -> None:
    """
    Update metadata for a track by spotify_id.

    Args:
        spotify_id: Spotify track ID
        spotify_popularity: Popularity score (0-100)
        isrc: International Standard Recording Code
        release_year: Release year
        album_name: Album name
        primary_genre: Primary genre
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE tracks
            SET spotify_popularity = COALESCE(%s, spotify_popularity),
                isrc = COALESCE(%s, isrc),
                release_year = COALESCE(%s, release_year),
                album_name = COALESCE(%s, album_name),
                primary_genre = COALESCE(%s, primary_genre),
                updated_at = NOW()
            WHERE spotify_id = %s
            """,
            (spotify_popularity, isrc, release_year, album_name, primary_genre, spotify_id)
        )

        cursor.close()
```

## Migration Order

1. **Run migration** (create new schema + migrate data)
2. **Update Python utilities** (`scripts/utils/db.py`)
3. **Update TypeScript queries** (3 files)
4. **Generate new types** (`pnpm db:generate-types`)
5. **Test locally**
6. **Deploy to production**

## Testing Checklist

- [ ] Pack gallery shows correct track counts
- [ ] Pack songs sheet displays all tracks
- [ ] Game loads and plays tracks correctly
- [ ] Track details show in final score
- [ ] Python scripts can add new packs without duplicating tracks
- [ ] Enrichment scripts work with new schema

## Risk Assessment

**Low Risk Changes:**
- `use-game.ts` - No change needed
- Python script updates - Isolated to pack creation scripts

**Medium Risk Changes:**
- Pack gallery count query - Simple join change
- Pack songs sheet - Requires data transformation

**Mitigation:**
- Test all flows locally before deploying
- Keep old table as backup for 1 week
- Monitor error logs after deployment
