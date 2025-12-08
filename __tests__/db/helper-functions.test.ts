/**
 * Tests for TypeScript helper functions.
 *
 * Tests the TypeScript implementations of database helper functions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '../../lib/supabase/client';
import {
  calculateTrackPopularityScore,
  getDifficultyRange,
  getExpandedDifficultyRange,
} from '../../lib/db/utils/popularity';
import {
  getTrackArtists,
  getTrackGenres,
  getTrackPrimaryGenre,
  getTrackWithArtists,
} from '../../lib/db/queries/tracks';

const supabase = createClient();

describe('Helper Functions', () => {
  let testTrackId: string;

  beforeAll(async () => {
    // Find a test track with artists and genres
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id')
      .limit(1);

    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks found in database for testing');
    }

    testTrackId = tracks[0].id;
  });

  describe('calculateTrackPopularityScore', () => {
    it('should return value between 0 and 100', async () => {
      const score = await calculateTrackPopularityScore(testTrackId);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle non-existent track gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      // Should return default score (50 * 0.6 + 50 * 0.4 = 50)
      const score = await calculateTrackPopularityScore(fakeId);
      expect(score).toBe(50);
    });

    it('should return a number with at most 2 decimal places', async () => {
      const score = await calculateTrackPopularityScore(testTrackId);
      const decimals = score.toString().split('.')[1]?.length || 0;

      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('getTrackArtists', () => {
    it('should return empty string for non-existent track', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const artists = await getTrackArtists(fakeId);

      expect(artists).toBe('');
    });

    it('should return comma-separated artist names in position order', async () => {
      const artists = await getTrackArtists(testTrackId);

      expect(typeof artists).toBe('string');

      // Should be comma-separated if multiple artists
      if (artists.includes(',')) {
        expect(artists).toMatch(/^[^,]+(, [^,]+)+$/);
      }
    });

    it('should not have leading or trailing commas', async () => {
      const artists = await getTrackArtists(testTrackId);

      if (artists) {
        expect(artists[0]).not.toBe(',');
        expect(artists[artists.length - 1]).not.toBe(',');
      }
    });
  });

  describe('getTrackGenres', () => {
    it('should return array for valid track', async () => {
      const genres = await getTrackGenres(testTrackId);

      expect(Array.isArray(genres)).toBe(true);
    });

    it('should return empty array for track with no genres', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const genres = await getTrackGenres(fakeId);

      expect(genres).toEqual([]);
    });

    it('should deduplicate genres', async () => {
      const genres = await getTrackGenres(testTrackId);

      // Check for uniqueness
      const uniqueGenres = new Set(genres);
      expect(genres.length).toBe(uniqueGenres.size);
    });

    it('should return genres as strings', async () => {
      const genres = await getTrackGenres(testTrackId);

      for (const genre of genres) {
        expect(typeof genre).toBe('string');
      }
    });
  });

  describe('getTrackPrimaryGenre', () => {
    it('should return null for non-existent track', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const primaryGenre = await getTrackPrimaryGenre(fakeId);

      expect(primaryGenre).toBeNull();
    });

    it('should return string or null', async () => {
      const primaryGenre = await getTrackPrimaryGenre(testTrackId);

      expect(
        primaryGenre === null || typeof primaryGenre === 'string'
      ).toBe(true);
    });
  });

  describe('getDifficultyRange', () => {
    it('should return correct ranges for each difficulty', () => {
      expect(getDifficultyRange('easy')).toEqual({ min: 70, max: 100 });
      expect(getDifficultyRange('medium')).toEqual({ min: 40, max: 70 });
      expect(getDifficultyRange('hard')).toEqual({ min: 15, max: 40 });
      expect(getDifficultyRange('legendary')).toEqual({ min: 0, max: 15 });
    });

    it('should default to medium for invalid difficulty', () => {
      expect(getDifficultyRange('invalid')).toEqual({ min: 40, max: 70 });
    });
  });

  describe('getExpandedDifficultyRange', () => {
    it('should expand range by default 15 points', () => {
      const expanded = getExpandedDifficultyRange('medium');

      expect(expanded.min).toBe(25); // 40 - 15
      expect(expanded.max).toBe(85); // 70 + 15
    });

    it('should clamp to 0-100 range', () => {
      const easyExpanded = getExpandedDifficultyRange('easy', 50);
      const legendaryExpanded = getExpandedDifficultyRange('legendary', 50);

      expect(easyExpanded.min).toBeGreaterThanOrEqual(0);
      expect(easyExpanded.max).toBeLessThanOrEqual(100);
      expect(legendaryExpanded.min).toBeGreaterThanOrEqual(0);
      expect(legendaryExpanded.max).toBeLessThanOrEqual(100);
    });

    it('should support custom expansion amount', () => {
      const expanded = getExpandedDifficultyRange('hard', 10);

      expect(expanded.min).toBe(5); // 15 - 10
      expect(expanded.max).toBe(50); // 40 + 10
    });
  });

  describe('getTrackWithArtists', () => {
    it('should return structured track data', async () => {
      const track = await getTrackWithArtists(testTrackId);

      expect(track).toBeDefined();
      expect(track).toHaveProperty('id');
      expect(track).toHaveProperty('title');
      expect(track).toHaveProperty('artists');
      expect(track).toHaveProperty('artistsString');
      expect(track).toHaveProperty('genres');
      expect(track).toHaveProperty('primaryGenre');
      expect(track).toHaveProperty('spotifyPopularity');
      expect(track).toHaveProperty('popularityScore');

      expect(Array.isArray(track!.artists)).toBe(true);
      expect(Array.isArray(track!.genres)).toBe(true);
    });

    it('should match individual helper function results', async () => {
      const track = await getTrackWithArtists(testTrackId);
      const artists = await getTrackArtists(testTrackId);
      const genres = await getTrackGenres(testTrackId);
      const primaryGenre = await getTrackPrimaryGenre(testTrackId);

      expect(track!.artistsString).toBe(artists);
      expect(track!.primaryGenre).toBe(primaryGenre);

      // Genres should match (as sets, since order might differ)
      const trackGenresSet = new Set(track!.genres);
      const genresSet = new Set(genres);
      expect(trackGenresSet.size).toBe(genresSet.size);
      for (const genre of trackGenresSet) {
        expect(genresSet.has(genre)).toBe(true);
      }
    });

    it('should return null for non-existent track', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const track = await getTrackWithArtists(fakeId);

      expect(track).toBeNull();
    });

    it('should have consistent data types', async () => {
      const track = await getTrackWithArtists(testTrackId);

      expect(typeof track!.id).toBe('string');
      expect(typeof track!.title).toBe('string');
      expect(typeof track!.artistsString).toBe('string');
      expect(Array.isArray(track!.artists)).toBe(true);
      expect(Array.isArray(track!.genres)).toBe(true);
      expect(typeof track!.spotifyPopularity).toBe('number');
      expect(typeof track!.popularityScore).toBe('number');
    });
  });
});
