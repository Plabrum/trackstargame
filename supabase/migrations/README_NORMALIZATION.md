# Database Normalization Migration

This directory contains the migration files to normalize the `tracks` table and eliminate duplicate song data.

## Migration Files

### Part 1: Create Tables
**`20251201000000_normalize_tracks_part1_create_tables.sql`**

Creates the new normalized schema:
- `tracks_new` - Deduplicated tracks (one row per unique song)
- `pack_tracks` - Junction table for pack-to-track relationships

### Part 2: Migrate Data
**`20251201000001_normalize_tracks_part2_migrate_data.sql`**

Intelligently deduplicates tracks:
1. **Keeps best metadata** - Selects track with longest `genres` array
2. **If tied** - Selects track with most non-null metadata fields
3. **If still tied** - Selects newest track (latest `created_at`)
4. Creates pack-track associations for all original records
5. **Remaps game_rounds** - Updates historical game data to point to deduplicated tracks
6. Validates migration with count checks (including game round validation)

### Part 3: Add Constraints
**`20251201000002_normalize_tracks_part3_add_constraints.sql`**

Adds data integrity constraints:
- UNIQUE constraint on `spotify_id`
- Foreign keys with CASCADE delete
- Prevents duplicate tracks in same pack
- Performance indexes
- `updated_at` trigger

### Part 4: Finalize
**`20251201000003_normalize_tracks_part4_finalize.sql`**

Makes the new schema live:
- Renames `tracks` → `tracks_old_backup`
- Renames `tracks_new` → `tracks`
- Final validation and reporting

## Expected Results

**Before:**
- 5,680 track records
- 2,931 unique songs
- 2,749 duplicates (48% redundancy)

**After:**
- 2,931 track records
- 5,680 pack-track associations
- 0 duplicates
- 48% storage savings

## Running the Migration

### Local Testing (REQUIRED FIRST!)

```bash
# 1. Start local Supabase
pnpm supabase:start

# 2. Apply migrations
npx supabase db push

# 3. Check migration output for validation messages

# 4. Generate new types
pnpm db:generate-types

# 5. Test the application
pnpm dev
```

### Production Deployment

**Important:** Only run after successful local testing!

```bash
# Migrations will auto-deploy via GitHub Actions when merged to main
# See .github/workflows/deploy-migrations.yml
```

**Or manually via Supabase CLI:**

```bash
# 1. Link to production
npx supabase link --project-ref tbsqgbgghjdezvhnssje

# 2. Push migrations
npx supabase db push
```

## Rollback Plan

If migration fails or causes issues:

```sql
-- Restore from backup
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS pack_tracks CASCADE;

ALTER TABLE tracks_old_backup RENAME TO tracks;

-- Revert application code changes
git revert <commit-hash>
```

## Post-Migration Tasks

### 1. Update Application Code

See `docs/NORMALIZATION_CODE_CHANGES.md` for required code changes:
- [ ] `components/host/PackGalleryContent.tsx` - Update count query
- [ ] `components/host/PackSongsSheet.tsx` - Update tracks query with join
- [ ] `scripts/utils/db.py` - Update `add_tracks_to_pack()` function

### 2. Re-run Spotify Enrichment

After normalization, re-run enrichment to update deduplicated tracks:

```bash
cd scripts

# Fetch fresh data (will get 2,931 unique tracks instead of 5,680)
uv run python fetch_spotify_metadata.py

# Apply to database
uv run python apply_spotify_enrichment.py data/spotify_enrichment_*.csv
```

### 3. Clean Up Backup Table

After 1 week of successful operation:

```sql
-- Verify everything works first!
DROP TABLE IF EXISTS tracks_old_backup CASCADE;
```

## Validation Queries

### Check deduplication worked
```sql
-- Should return 0 duplicates
SELECT spotify_id, COUNT(*) as count
FROM tracks
GROUP BY spotify_id
HAVING COUNT(*) > 1;
```

### Check track counts
```sql
SELECT
  (SELECT COUNT(*) FROM tracks) as unique_tracks,
  (SELECT COUNT(*) FROM pack_tracks) as pack_track_associations,
  (SELECT COUNT(DISTINCT spotify_id) FROM tracks) as unique_spotify_ids;
```

### Check pack integrity
```sql
-- All packs should have tracks
SELECT p.id, p.name, COUNT(pt.id) as track_count
FROM packs p
LEFT JOIN pack_tracks pt ON pt.pack_id = p.id
GROUP BY p.id, p.name
ORDER BY track_count;
```

### Check for orphaned data
```sql
-- Should return 0 rows (pack_tracks)
SELECT * FROM pack_tracks pt
WHERE NOT EXISTS (SELECT 1 FROM packs WHERE id = pt.pack_id)
   OR NOT EXISTS (SELECT 1 FROM tracks WHERE id = pt.track_id);

-- Should return 0 rows (game_rounds)
SELECT * FROM game_rounds gr
WHERE NOT EXISTS (SELECT 1 FROM tracks WHERE id = gr.track_id);
```

### Check game history integrity
```sql
-- Verify all game rounds point to valid tracks
SELECT
  COUNT(*) as total_game_rounds,
  COUNT(DISTINCT gr.session_id) as total_games,
  COUNT(DISTINCT gr.track_id) as unique_tracks_played
FROM game_rounds gr
JOIN tracks t ON t.id = gr.track_id;
```

## Troubleshooting

### Migration fails with constraint violation

Check for NULL pack_ids:
```sql
SELECT COUNT(*) FROM tracks WHERE pack_id IS NULL;
```

### Track counts don't match

Verify spotify_id uniqueness:
```sql
SELECT COUNT(*), COUNT(DISTINCT spotify_id) FROM tracks;
```

### Application errors after migration

1. Regenerate types: `pnpm db:generate-types`
2. Check for compile errors
3. Verify code changes were applied correctly

## Benefits After Migration

1. ✅ **Data Integrity** - Song metadata stored once, updated once
2. ✅ **Storage** - 48% reduction in track records
3. ✅ **Consistency** - No risk of same song having different metadata
4. ✅ **Performance** - Smaller tables, better query performance
5. ✅ **Spotify Enrichment** - Update 2,931 tracks instead of 5,680
6. ✅ **Constraints** - Database enforces data integrity rules
