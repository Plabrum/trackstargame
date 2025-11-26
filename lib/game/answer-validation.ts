/**
 * Answer validation utilities for game rounds
 */

import { fuzzyMatch } from './fuzzy-match';
import { calculatePoints } from './state-machine';

export interface AnswerValidationResult {
  autoValidated: boolean;
  pointsAwarded: number;
  elapsedSeconds: number;
}

/**
 * Validate a player's answer and calculate points awarded
 *
 * @param roundStartTime - ISO timestamp when the round started
 * @param answer - The player's submitted answer
 * @param correctAnswer - The correct answer (artist name)
 * @returns Validation result with auto-validation status and points
 */
export function validateAnswer(
  roundStartTime: string,
  answer: string,
  correctAnswer: string
): AnswerValidationResult {
  // Calculate elapsed time
  const elapsedMs = Date.now() - new Date(roundStartTime).getTime();
  const elapsedSeconds = elapsedMs / 1000;

  // Auto-validate answer using fuzzy matching
  const autoValidated = fuzzyMatch(answer, correctAnswer, 80);

  // Calculate points if correct
  const pointsAwarded = autoValidated ? calculatePoints(elapsedSeconds, true) : 0;

  return {
    autoValidated,
    pointsAwarded,
    elapsedSeconds,
  };
}
