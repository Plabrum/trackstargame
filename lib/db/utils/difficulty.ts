/**
 * Difficulty utilities for track selection.
 *
 * Maps difficulty levels to popularity score ranges.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';

export interface DifficultyRange {
  min: number;
  max: number;
}

/**
 * Get the base popularity score range for a difficulty level.
 *
 * Difficulty levels:
 * - Easy: 70-100 (very popular tracks)
 * - Medium: 40-70 (moderately popular)
 * - Hard: 15-40 (less known)
 * - Legendary: 0-15 (obscure tracks)
 *
 * @param difficulty - The difficulty level
 * @returns Min/max popularity score range
 *
 * @example
 * ```typescript
 * const range = getDifficultyRange('hard');
 * // Returns: { min: 15, max: 40 }
 * ```
 */
export function getDifficultyRange(difficulty: Difficulty): DifficultyRange {
  switch (difficulty) {
    case 'easy':
      return { min: 70, max: 100 };
    case 'medium':
      return { min: 40, max: 70 };
    case 'hard':
      return { min: 15, max: 40 };
    case 'legendary':
      return { min: 0, max: 15 };
    default:
      // Default to medium if somehow invalid
      return { min: 40, max: 70 };
  }
}

/**
 * Get an expanded popularity score range for fallback track selection.
 *
 * Expands the base range by ±15, clamped to [0, 100].
 *
 * @param difficulty - The difficulty level
 * @returns Expanded min/max popularity score range
 *
 * @example
 * ```typescript
 * const range = getExpandedDifficultyRange('hard');
 * // Base range: { min: 15, max: 40 }
 * // Expanded range: { min: 0, max: 55 }
 * ```
 */
export function getExpandedDifficultyRange(
  difficulty: Difficulty
): DifficultyRange {
  const base = getDifficultyRange(difficulty);

  return {
    min: Math.max(0, base.min - 15),
    max: Math.min(100, base.max + 15),
  };
}

/**
 * Validate a difficulty level string.
 *
 * @param value - String to validate
 * @returns True if valid difficulty level
 */
export function isValidDifficulty(value: string): value is Difficulty {
  return ['easy', 'medium', 'hard', 'legendary'].includes(value);
}
