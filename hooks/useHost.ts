/**
 * Host-specific hook for controlling game flow.
 *
 * Provides host controls for starting rounds, judging answers, and advancing the game.
 */

import { useCallback } from 'react';
import {
  useStartGame,
  useJudgeAnswer,
  useFinalizeJudgments,
  useAdvanceRound,
  useRevealAnswer,
  useEndGame,
} from './mutations/use-game-mutations';

/**
 * Hook for host controls.
 *
 * Provides all host-specific actions. Real-time updates are handled by
 * postgres_changes subscriptions in the query hooks (useGameSession, useGamePlayers, etc.)
 *
 * @param sessionId - The game session ID
 */
export function useHost(sessionId: string | null) {
  // Mutations
  const startGame = useStartGame();
  const judgeAnswer = useJudgeAnswer();
  const finalizeJudgment = useFinalizeJudgments();
  const nextRound = useAdvanceRound();
  const revealTrack = useRevealAnswer();
  const endGame = useEndGame();

  return {
    // Host actions
    startGame: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return startGame.mutate(sessionId);
      },
      [sessionId, startGame]
    ),

    judgeAnswer: useCallback(
      (correct: boolean) => {
        if (!sessionId) throw new Error('No session ID');
        return judgeAnswer.mutate({ sessionId, correct });
      },
      [sessionId, judgeAnswer]
    ),

    finalizeJudgment: useCallback(
      (overrides?: Record<string, boolean>) => {
        if (!sessionId) throw new Error('No session ID');
        return finalizeJudgment.mutate({ sessionId, overrides });
      },
      [sessionId, finalizeJudgment]
    ),

    nextRound: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return nextRound.mutate(sessionId);
      },
      [sessionId, nextRound]
    ),

    revealTrack: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return revealTrack.mutate(sessionId);
      },
      [sessionId, revealTrack]
    ),

    endGame: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return endGame.mutate(sessionId);
      },
      [sessionId, endGame]
    ),

    // Mutation states
    isStartingGame: startGame.isPending,
    isJudging: judgeAnswer.isPending,
    isFinalizing: finalizeJudgment.isPending,
    isAdvancing: nextRound.isPending,
    isRevealing: revealTrack.isPending,
    isEndingGame: endGame.isPending,
  };
}
