#!/bin/bash
# Dump production data to CSV files and generate seed.sql that uses COPY
# This is much faster and more efficient than individual INSERT statements

set -e

SUPABASE_URL="https://tbsqgbgghjdezvhnssje.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRic3FnYmdnaGpkZXp2aG5zc2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDg3OTUsImV4cCI6MjA3ODY4NDc5NX0.oDv0-6zvIxlaRogosHfWN7w2HBFXzF1MTQ4E3P_9uOU"
DATA_DIR="supabase/seed_data"
OUTPUT_FILE="supabase/seed.sql"

# Tables in dependency order (only dump master data, not transient game sessions)
TABLES=("packs" "tracks" "artists" "pack_tracks" "track_artists")

# Define column order for each table (must match database schema)
declare -A TABLE_COLUMNS
TABLE_COLUMNS["packs"]="id,name,description,created_at,tags"
TABLE_COLUMNS["tracks"]="id,spotify_id,title,album_name,release_year,spotify_popularity,isrc,created_at,updated_at,album_image_url"
TABLE_COLUMNS["artists"]="id,name,spotify_artist_id,genres,spotify_followers,image_url,created_at,updated_at"
TABLE_COLUMNS["pack_tracks"]="id,pack_id,track_id,position,created_at"
TABLE_COLUMNS["track_artists"]="id,track_id,artist_id,position,created_at"

echo "Dumping production data..."
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Create data directory
mkdir -p "$DATA_DIR"

# Initialize seed file
cat > "$OUTPUT_FILE" << EOF
-- Production data dump
-- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
-- DO NOT EDIT MANUALLY - regenerate using: bash scripts/dump_prod_to_seed.sh

-- Load data from CSV files using COPY
-- This is much faster than INSERT statements

EOF

# Dump each table to CSV
for table in "${TABLES[@]}"; do
    echo "Dumping $table..."

    csv_file="$DATA_DIR/${table}.csv"
    offset=0
    limit=1000
    total_rows=0

    # Clear existing CSV file
    > "$csv_file"

    while true; do
        # Fetch data with pagination as CSV
        response=$(curl -s \
            "$SUPABASE_URL/rest/v1/$table?select=${TABLE_COLUMNS[$table]}&offset=$offset&limit=$limit" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY" \
            -H "Accept: text/csv")

        # Check if we got data
        if [ -z "$response" ] || [ "$response" = "[]" ]; then
            break
        fi

        # Count rows (subtract 1 for header if first batch)
        if [ "$offset" -eq 0 ]; then
            # First batch - keep header
            echo "$response" >> "$csv_file"
            row_count=$(($(echo "$response" | wc -l) - 1))
        else
            # Subsequent batches - skip header
            echo "$response" | tail -n +2 >> "$csv_file"
            row_count=$(echo "$response" | tail -n +2 | wc -l)
        fi

        # If no rows in response, break
        if [ "$row_count" -eq 0 ]; then
            break
        fi

        total_rows=$((total_rows + row_count))
        offset=$((offset + limit))

        # Break if we got less than limit (last page)
        if [ "$row_count" -lt "$limit" ]; then
            break
        fi

        echo "  Fetched $total_rows rows so far..."
    done

    echo "  Total: $total_rows rows"

    if [ "$total_rows" -eq 0 ]; then
        rm -f "$csv_file"
        continue
    fi

    # Add COPY command to seed.sql
    cat >> "$OUTPUT_FILE" << EOF

-- Load $table ($total_rows rows)
\\COPY $table (${TABLE_COLUMNS[$table]}) FROM '$(pwd)/$csv_file' WITH (FORMAT csv, HEADER true);

EOF
done

echo ""
echo "Done! Generated:"
echo "  - $OUTPUT_FILE (SQL commands)"
echo "  - $DATA_DIR/*.csv (data files)"
echo ""
echo "To apply to local database, run:"
echo "  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql"
