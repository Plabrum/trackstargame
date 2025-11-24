/**
 * Fuzzy string matching for artist/band name validation.
 * Uses normalization and similarity scoring to handle typos and variations.
 */

/**
 * Normalize a string for comparison.
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove common prefixes like "The "
 * - Remove special characters except spaces
 * - Collapse multiple spaces
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/^the\s+/i, '') // Remove leading "The "
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings.
 * Lower distance = more similar strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage between two strings.
 * Returns a value between 0 and 100.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (normalized1 === normalized2) {
    return 100;
  }

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) {
    return 100;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Check if a submitted answer matches the correct answer using fuzzy matching.
 *
 * @param submittedAnswer - The answer submitted by the player
 * @param correctAnswer - The correct artist/band name
 * @param threshold - Minimum similarity percentage (0-100) to consider a match
 * @returns true if the answer is considered correct
 */
export function fuzzyMatch(
  submittedAnswer: string,
  correctAnswer: string,
  threshold: number = 80
): boolean {
  const normalizedSubmitted = normalizeString(submittedAnswer);
  const normalizedCorrect = normalizeString(correctAnswer);

  // Exact match after normalization
  if (normalizedSubmitted === normalizedCorrect) {
    return true;
  }

  // Check if submitted is a substring of correct (or vice versa)
  if (
    normalizedSubmitted.includes(normalizedCorrect) ||
    normalizedCorrect.includes(normalizedSubmitted)
  ) {
    return true;
  }

  // Check similarity score
  const similarity = calculateSimilarity(submittedAnswer, correctAnswer);
  return similarity >= threshold;
}
