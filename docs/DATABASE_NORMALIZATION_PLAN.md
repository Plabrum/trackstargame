# Database Normalization Plan: Deduplicate Tracks

## Problem

The current `tracks` table is denormalized, storing duplicate song data when the same song appears in multiple packs.

**Current State:**
- 5,680 track records
- 2,931 unique songs (by `spotify_id`)
- **2,749 duplicate records (48% redundancy)**

**Example:**
"Bohemian Rhapsody" appearing in 9 packs = 9 separate track records with identical data except `id` and `pack_id`.

## Current Schema (Denormalized)

```sql
tracks:
  id              uuid (PK)
  pack_id         uuid (FK -> packs.id)
  title           text
  artist          text
  spotify_id      text -- DUPLICATED!
  album_name      text -- DUPLICATED!
  release_year    int  -- DUPLICATED!
  primary_genre   text -- DUPLICATED!
  spotify_popularity int -- DUPLICATED!
  isrc            text -- DUPLICATED!
  created_at      timestamp
  updated_at      timestamp
```

## New Schema (Normalized)

```sql
-- Unique songs only
tracks:
  id                  uuid (PK, default gen_random_uuid())
  spotify_id          text (UNIQUE, NOT NULL)
  title               text (NOT NULL)
  artist              text (NOT NULL)
  album_name          text
  release_year        int
  primary_genre       text
  spotify_popularity  int CHECK (spotify_popularity >= 0 AND spotify_popularity <= 100)
  isrc                text
  created_at          timestamp (default now())
  updated_at          timestamp (default now())

-- Many-to-many junction table
pack_tracks:
  id          uuid (PK, default gen_random_uuid())
  pack_id     uuid (FK -> packs.id, NOT NULL, ON DELETE CASCADE)
  track_id    uuid (FK -> tracks.id, NOT NULL, ON DELETE CASCADE)
  position    int (for ordering tracks within pack)
  created_at  timestamp (default now())

  UNIQUE(pack_id, track_id) -- prevent same track twice in one pack
  INDEX on pack_id
  INDEX on track_id
```

## Benefits

1. **Data Integrity**: Song metadata stored once, updated once
2. **Storage**: Reduce from 5,680 to 2,931 track records (48% savings)
3. **Consistency**: No risk of same song having different metadata in different packs
4. **Spotify Enrichment**: Update 2,931 tracks instead of 5,680
5. **Performance**: Smaller tables, better caching

## Migration Strategy

### Phase 1: Create New Schema

1. **Backup production database**
2. **Create new tables** (`tracks_new` and `pack_tracks`)
3. **Keep old `tracks` table** during migration

### Phase 2: Data Migration

```sql
-- Step 1: Deduplicate tracks (keep oldest record per spotify_id)
INSERT INTO tracks_new (id, spotify_id, title, artist, album_name, release_year,
                        primary_genre, spotify_popularity, isrc, created_at)
SELECT DISTINCT ON (spotify_id)
  id, spotify_id, title, artist, album_name, release_year,
  primary_genre, spotify_popularity, isrc, created_at
FROM tracks
ORDER BY spotify_id, created_at ASC; -- keep oldest

-- Step 2: Create pack-track associations
INSERT INTO pack_tracks (pack_id, track_id, position)
SELECT
  old.pack_id,
  new.id as track_id,
  ROW_NUMBER() OVER (PARTITION BY old.pack_id ORDER BY old.created_at) as position
FROM tracks old
JOIN tracks_new new ON new.spotify_id = old.spotify_id;

-- Step 3: Rename tables
ALTER TABLE tracks RENAME TO tracks_old_backup;
ALTER TABLE tracks_new RENAME TO tracks;
```

### Phase 3: Add Constraints

```sql
-- Unique constraint on spotify_id
ALTER TABLE tracks ADD CONSTRAINT tracks_spotify_id_unique UNIQUE (spotify_id);

-- Foreign keys with cascading deletes
ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_pack_id_fkey
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE;

ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

-- Unique constraint to prevent duplicates in same pack
ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_pack_track_unique
  UNIQUE (pack_id, track_id);

-- Indexes for performance
CREATE INDEX idx_pack_tracks_pack_id ON pack_tracks(pack_id);
CREATE INDEX idx_pack_tracks_track_id ON pack_tracks(track_id);
CREATE INDEX idx_tracks_spotify_id ON tracks(spotify_id);
```

## Code Changes Required

### 1. Database Queries

**Current pattern:**
```typescript
// Get all tracks in a pack
const tracks = await supabase
  .from('tracks')
  .select('*')
  .eq('pack_id', packId);
```

**New pattern:**
```typescript
// Get all tracks in a pack (with join)
const tracks = await supabase
  .from('pack_tracks')
  .select(`
    position,
    track:tracks(*)
  `)
  .eq('pack_id', packId)
  .order('position');
```

### 2. Files to Update

Need to search codebase for:
- Direct queries to `tracks` table filtered by `pack_id`
- Inserts into `tracks` that include `pack_id`
- Any code assuming one-to-one relationship between tracks and packs

**Search patterns:**
```bash
# Find all track queries with pack_id
grep -r "from('tracks')" --include="*.ts" --include="*.tsx"
grep -r "pack_id" --include="*.ts" --include="*.tsx" | grep -i track

# Find track insertions
grep -r "insert.*tracks" --include="*.ts" --include="*.tsx"
```

### 3. Types to Update

**Generate new types** after migration:
```bash
pnpm db:generate-types
```

The `Database['public']['Tables']['tracks']` type will change to remove `pack_id`.

### 4. Script Updates

**Scripts that create tracks:**
- `scripts/create_pack_from_playlist.py`
- `scripts/create_pack_from_list.py`
- `scripts/create_pack_from_youtube.py`
- `scripts/generate_decade_genre_packs.py`
- `scripts/generate_thematic_packs.py`

**New pattern for scripts:**
```python
# OLD: Insert track with pack_id
track_id = insert_track(pack_id, title, artist, spotify_id, ...)

# NEW: Insert/find track, then link to pack
track_id = upsert_track(title, artist, spotify_id, ...)  # ON CONFLICT DO UPDATE
link_track_to_pack(pack_id, track_id, position)
```

## Migration File Structure

```
supabase/migrations/
  20251201000000_normalize_tracks_part1_create_tables.sql
  20251201000001_normalize_tracks_part2_migrate_data.sql
  20251201000002_normalize_tracks_part3_add_constraints.sql
  20251201000003_normalize_tracks_part4_cleanup.sql
```

## Rollback Plan

If migration fails:
```sql
-- Restore from backup
DROP TABLE IF EXISTS tracks;
DROP TABLE IF EXISTS pack_tracks;
ALTER TABLE tracks_old_backup RENAME TO tracks;
```

Keep `tracks_old_backup` for 1 week after successful migration.

## Testing Checklist

### Local Testing
- [ ] Run migration on local database
- [ ] Verify track count: should have 2,931 tracks
- [ ] Verify pack_tracks count: should have 5,680 associations
- [ ] Generate types and check for compile errors
- [ ] Test pack selection (should show all tracks)
- [ ] Test game play (should load tracks correctly)
- [ ] Verify no duplicate tracks in single pack

### Query Validation
- [ ] All packs return correct number of tracks
- [ ] Track metadata is consistent
- [ ] No orphaned records in pack_tracks
- [ ] Foreign keys work (cascade delete)

### Application Testing
- [ ] Host can select packs and see tracks
- [ ] Game loads and plays tracks
- [ ] Final score shows track details
- [ ] Admin tools work (if any)

## Timeline Estimate

- **Phase 1 (Schema Design & Code Analysis)**: 2-3 hours
- **Phase 2 (Write Migrations)**: 1-2 hours
- **Phase 3 (Update Application Code)**: 3-4 hours
- **Phase 4 (Testing)**: 2-3 hours
- **Phase 5 (Deploy)**: 1 hour

**Total**: 9-13 hours

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Full database backup before migration |
| Broken queries in production | High | Comprehensive local testing, staged rollout |
| Foreign key violations | Medium | Validate data integrity before adding constraints |
| Duplicate tracks in same pack | Low | Add UNIQUE constraint on (pack_id, track_id) |

## Post-Migration Benefits

1. **Easier maintenance**: Update song metadata in one place
2. **Better performance**: Smaller tables, fewer rows to scan
3. **Cleaner enrichment**: Fetch Spotify data for 2,931 tracks instead of 5,680
4. **Prevent future issues**: Constraints ensure data integrity
5. **Enable new features**:
   - Track popularity across all packs
   - "Most popular songs" view
   - Deduplicate packs automatically

## Next Steps

1. Review this plan
2. Create backup of production database
3. Write migration SQL files
4. Scan codebase for files that need updates
5. Create helper functions for track operations
6. Test on local database
7. Deploy to production
