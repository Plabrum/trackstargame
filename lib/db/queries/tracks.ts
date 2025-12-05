/**
 * Track query helpers.
 *
 * Provides read-only query functions for tracks, artists, and genres.
 * Replaces Postgres helper functions with TypeScript implementations.
 */

import { db, type Transaction } from '../client';
import { tracks, trackArtists, artists } from '../schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

/**
 * Get comma-separated artist names for a track (ordered by position).
 *
 * Replaces: `get_track_artists(track_id)` Postgres function
 *
 * @param trackId - UUID of the track
 * @param tx - Optional transaction context
 * @returns Comma-separated artist names (e.g., "Taylor Swift, Ed Sheeran")
 *
 * @example
 * ```typescript
 * const artists = await getTrackArtists(trackId);
 * // Returns: "Taylor Swift, Ed Sheeran"
 * ```
 */
export async function getTrackArtists(
  trackId: string,
  tx?: Transaction
): Promise<string> {
  const client = tx ?? db;

  const result = await client
    .select({
      name: artists.name,
      position: trackArtists.position,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(trackArtists.trackId, trackId))
    .orderBy(trackArtists.position);

  if (result.length === 0) {
    return '';
  }

  return result.map((r) => r.name).join(', ');
}

/**
 * Get all genres for a track (from all artists, deduplicated and sorted).
 *
 * Replaces: `get_track_genres(track_id)` Postgres function
 *
 * @param trackId - UUID of the track
 * @param tx - Optional transaction context
 * @returns Array of unique genre strings, sorted alphabetically
 *
 * @example
 * ```typescript
 * const genres = await getTrackGenres(trackId);
 * // Returns: ["pop", "rock", "alternative"]
 * ```
 */
export async function getTrackGenres(
  trackId: string,
  tx?: Transaction
): Promise<string[]> {
  const client = tx ?? db;

  // Fetch all artists for this track
  const result = await client
    .select({
      genres: artists.genres,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(trackArtists.trackId, trackId));

  // Flatten and deduplicate genres
  const allGenres = new Set<string>();

  for (const row of result) {
    if (row.genres && Array.isArray(row.genres)) {
      row.genres.forEach((genre) => {
        if (genre && typeof genre === 'string') {
          allGenres.add(genre);
        }
      });
    }
  }

  // Return sorted array
  return Array.from(allGenres).sort();
}

/**
 * Get primary genre (first artist's first genre).
 *
 * Replaces: `get_track_primary_genre(track_id)` Postgres function
 *
 * @param trackId - UUID of the track
 * @param tx - Optional transaction context
 * @returns Primary genre string, or null if not available
 *
 * @example
 * ```typescript
 * const primaryGenre = await getTrackPrimaryGenre(trackId);
 * // Returns: "pop" or null
 * ```
 */
export async function getTrackPrimaryGenre(
  trackId: string,
  tx?: Transaction
): Promise<string | null> {
  const client = tx ?? db;

  const result = await client
    .select({
      genres: artists.genres,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(and(eq(trackArtists.trackId, trackId), eq(trackArtists.position, 1)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const genres = result[0].genres;
  if (genres && Array.isArray(genres) && genres.length > 0) {
    return genres[0];
  }

  return null;
}

/**
 * Get full track data with artist information.
 *
 * This is a richer alternative to the `tracks_with_artists` view,
 * returning structured data instead of concatenated strings.
 *
 * @param trackId - UUID of the track
 * @param tx - Optional transaction context
 * @returns Track data with embedded artist information
 *
 * @example
 * ```typescript
 * const track = await getTrackWithArtists(trackId);
 * // Returns: {
 * //   id: "...",
 * //   title: "Shake It Off",
 * //   spotifyId: "2iUXsYOEPhVqEBwsqP70rE",
 * //   artists: ["Taylor Swift"],
 * //   artistsString: "Taylor Swift",
 * //   genres: ["pop", "dance pop"],
 * //   primaryGenre: "pop",
 * //   albumName: "1989",
 * //   releaseYear: 2014,
 * //   spotifyPopularity: 85,
 * //   popularityScore: 78.50,
 * // }
 * ```
 */
export async function getTrackWithArtists(
  trackId: string,
  tx?: Transaction
): Promise<{
  id: string;
  title: string;
  spotifyId: string | null;
  artists: string[];
  artistsString: string;
  genres: string[];
  primaryGenre: string | null;
  albumName: string | null;
  releaseYear: number | null;
  spotifyPopularity: number | null;
  popularityScore: number | null;
  isrc: string | null;
} | null> {
  const client = tx ?? db;

  // Fetch track data
  const trackData = await client
    .select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1);

  if (trackData.length === 0) {
    return null;
  }

  const track = trackData[0];

  // Fetch artists
  const artistData = await client
    .select({
      name: artists.name,
      position: trackArtists.position,
      genres: artists.genres,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(trackArtists.trackId, trackId))
    .orderBy(trackArtists.position);

  const artistNames = artistData.map((a) => a.name);
  const artistsString = artistNames.join(', ');

  // Collect all genres (deduplicated)
  const allGenres = new Set<string>();
  for (const artist of artistData) {
    if (artist.genres && Array.isArray(artist.genres)) {
      artist.genres.forEach((genre) => {
        if (genre && typeof genre === 'string') {
          allGenres.add(genre);
        }
      });
    }
  }

  // Primary genre is first artist's first genre
  const primaryGenre =
    artistData[0]?.genres?.[0] && typeof artistData[0].genres[0] === 'string'
      ? artistData[0].genres[0]
      : null;

  return {
    id: track.id,
    title: track.title,
    spotifyId: track.spotifyId,
    artists: artistNames,
    artistsString,
    genres: Array.from(allGenres).sort(),
    primaryGenre,
    albumName: track.albumName,
    releaseYear: track.releaseYear,
    spotifyPopularity: track.spotifyPopularity,
    popularityScore: track.popularityScore ? Number(track.popularityScore) : null,
    isrc: track.isrc,
  };
}

/**
 * Batch get track artists for multiple tracks.
 *
 * More efficient than calling `getTrackArtists()` individually.
 *
 * @param trackIds - Array of track UUIDs
 * @param tx - Optional transaction context
 * @returns Map of trackId -> comma-separated artist names
 *
 * @example
 * ```typescript
 * const artistsMap = await batchGetTrackArtists(['id1', 'id2', 'id3']);
 * // Returns: Map {
 * //   'id1' => 'Taylor Swift',
 * //   'id2' => 'Ed Sheeran, Justin Bieber',
 * //   'id3' => 'The Beatles'
 * // }
 * ```
 */
export async function batchGetTrackArtists(
  trackIds: string[],
  tx?: Transaction
): Promise<Map<string, string>> {
  if (trackIds.length === 0) {
    return new Map();
  }

  const client = tx ?? db;

  // Single query to fetch all artists for all tracks
  const result = await client
    .select({
      trackId: trackArtists.trackId,
      artistName: artists.name,
      position: trackArtists.position,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(trackArtists.trackId, trackIds))
    .orderBy(trackArtists.trackId, trackArtists.position);

  // Group by trackId and join artist names
  const artistsMap = new Map<string, string>();
  const trackArtistLists = new Map<string, string[]>();

  for (const row of result) {
    if (!trackArtistLists.has(row.trackId)) {
      trackArtistLists.set(row.trackId, []);
    }
    trackArtistLists.get(row.trackId)!.push(row.artistName);
  }

  // Join artist names with commas
  for (const [trackId, artistList] of trackArtistLists) {
    artistsMap.set(trackId, artistList.join(', '));
  }

  // Fill in empty strings for tracks with no artists
  for (const trackId of trackIds) {
    if (!artistsMap.has(trackId)) {
      artistsMap.set(trackId, '');
    }
  }

  return artistsMap;
}

/**
 * Get tracks with artists in a single optimized query using SQL aggregation.
 *
 * This is the most efficient way to get multiple tracks with their artists.
 * Uses SQL `string_agg` for aggregation on the database side.
 *
 * @param trackIds - Array of track UUIDs
 * @param tx - Optional transaction context
 * @returns Array of tracks with aggregated artist data
 *
 * @example
 * ```typescript
 * const tracks = await getTracksWithArtistsOptimized(['id1', 'id2']);
 * // Returns: [
 * //   { id: 'id1', title: 'Shake It Off', artists: 'Taylor Swift', ... },
 * //   { id: 'id2', title: 'Shape of You', artists: 'Ed Sheeran', ... }
 * // ]
 * ```
 */
export async function getTracksWithArtistsOptimized(
  trackIds: string[],
  tx?: Transaction
): Promise<
  Array<{
    id: string;
    title: string;
    artists: string;
    spotifyPopularity: number | null;
    popularityScore: number | null;
  }>
> {
  if (trackIds.length === 0) {
    return [];
  }

  const client = tx ?? db;

  // Single query with SQL aggregation
  const result = await client
    .select({
      id: tracks.id,
      title: tracks.title,
      artists: sql<string>`string_agg(${artists.name}, ', ' ORDER BY ${trackArtists.position})`,
      spotifyPopularity: tracks.spotifyPopularity,
      popularityScore: tracks.popularityScore,
    })
    .from(tracks)
    .leftJoin(trackArtists, eq(trackArtists.trackId, tracks.id))
    .leftJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(tracks.id, trackIds))
    .groupBy(tracks.id, tracks.title, tracks.spotifyPopularity, tracks.popularityScore);

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    artists: row.artists ?? '',
    spotifyPopularity: row.spotifyPopularity,
    popularityScore: row.popularityScore ? Number(row.popularityScore) : null,
  }));
}
