#!/usr/bin/env python3
"""
Deduplicate artist enrichment CSV by Spotify artist ID.

When multiple DB artists matched to the same Spotify artist:
- Keep exact name matches over fuzzy matches
- Keep the match with highest follower count
- Remove obvious bad matches

Usage:
    python scripts/deduplicate_enrichment.py <input_csv> <output_csv>
"""
import csv
import sys
from collections import defaultdict


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/deduplicate_enrichment.py <input_csv> <output_csv>")
        sys.exit(1)

    input_csv = sys.argv[1]
    output_csv = sys.argv[2]

    # Read all enrichments
    enrichments = []
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            enrichments.append(row)

    print(f"Read {len(enrichments)} enrichments from {input_csv}")

    # Group by spotify_artist_id
    by_spotify_id = defaultdict(list)
    for enr in enrichments:
        by_spotify_id[enr['spotify_artist_id']].append(enr)

    # Find duplicates
    duplicates = {sid: enrs for sid, enrs in by_spotify_id.items() if len(enrs) > 1}
    print(f"Found {len(duplicates)} Spotify IDs with multiple matches")

    # Deduplicate: keep best match for each Spotify ID
    deduplicated = []
    removed = 0

    for spotify_id, candidates in by_spotify_id.items():
        if len(candidates) == 1:
            # No duplicates, keep it
            deduplicated.append(candidates[0])
        else:
            # Multiple matches - pick the best one
            # Priority: exact match > fuzzy match, then highest followers
            exact_matches = [c for c in candidates if c['match_type'] == 'exact']

            if exact_matches:
                # Choose exact match with highest followers
                best = max(exact_matches, key=lambda c: int(c['spotify_followers'] or 0))
                deduplicated.append(best)
                removed += len(candidates) - 1

                print(f"\nDuplicate for '{best['matched_name']}':")
                print(f"  Kept: {best['db_name']} (exact match)")
                print(f"  Removed: {', '.join(c['db_name'] for c in candidates if c != best)}")
            else:
                # All fuzzy matches - choose highest followers
                best = max(candidates, key=lambda c: int(c['spotify_followers'] or 0))
                deduplicated.append(best)
                removed += len(candidates) - 1

                print(f"\nDuplicate for '{best['matched_name']}':")
                print(f"  Kept: {best['db_name']} ({int(best['spotify_followers'] or 0):,} followers)")
                print(f"  Removed: {', '.join(c['db_name'] for c in candidates if c != best)}")

    # Write deduplicated CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['artist_id', 'db_name', 'spotify_artist_id', 'matched_name',
                     'genres', 'spotify_followers', 'image_url', 'popularity', 'match_type']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(deduplicated)

    print(f"\n{'='*80}")
    print(f"Deduplication complete!")
    print(f"  Original: {len(enrichments)} enrichments")
    print(f"  Removed: {removed} duplicates")
    print(f"  Final: {len(deduplicated)} enrichments")
    print(f"\nWrote to: {output_csv}")


if __name__ == '__main__':
    main()
