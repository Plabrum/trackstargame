/**
 * useGameExecutor Hook
 *
 * Generic hook for executing game actions.
 * Works for both host and player roles by accepting different mutations.
 */

import { useCallback } from 'react';
import type { GameAction } from '@/lib/game/state-machine';

interface GameMutations {
  // Player mutations
  buzz?: {
    mutate: (params: { sessionId: string; playerId: string; currentRound: number }) => void;
    isPending: boolean;
  };
  submitAnswer?: {
    mutate: (params: {
      sessionId: string;
      playerId: string;
      answer: string;
      autoValidated: boolean;
      pointsAwarded: number;
    }) => void;
    isPending: boolean;
  };

  // Host mutations
  startGame?: {
    mutate: (sessionId: string) => void;
    isPending: boolean;
  };
  judgeAnswer?: {
    mutate: (params: { sessionId: string; correct: boolean }) => void;
    isPending: boolean;
  };
  finalizeJudgments?: {
    mutate: (params: { sessionId: string; overrides?: Record<string, boolean> }) => void;
    isPending: boolean;
  };
  advanceRound?: {
    mutate: (sessionId: string) => void;
    isPending: boolean;
  };
  revealAnswer?: {
    mutate: (sessionId: string) => void;
    isPending: boolean;
  };
  endGame?: {
    mutate: (sessionId: string) => void;
    isPending: boolean;
  };
}

interface UseGameExecutorParams {
  sessionId: string;
  mutations: GameMutations;
  context?: {
    playerId?: string;
    currentRound?: number;
  };
}

export function useGameExecutor({ sessionId, mutations, context }: UseGameExecutorParams) {
  const executeAction = useCallback(
    (action: GameAction) => {
      switch (action.type) {
        // Player actions
        case 'buzz':
          if (!mutations.buzz) {
            console.warn('buzz mutation not available');
            break;
          }
          if (!context?.playerId) {
            throw new Error('Missing player ID');
          }
          if (!context?.currentRound) {
            throw new Error('No current round');
          }
          return mutations.buzz.mutate({
            sessionId,
            playerId: context.playerId,
            currentRound: context.currentRound,
          });

        case 'submit_answer':
          if (!mutations.submitAnswer) {
            console.warn('submitAnswer mutation not available');
            break;
          }
          if (!context?.playerId) {
            throw new Error('Missing player ID');
          }
          return mutations.submitAnswer.mutate({
            sessionId,
            playerId: context.playerId,
            answer: action.answer,
            autoValidated: false,
            pointsAwarded: 0,
          });

        // Host actions
        case 'start_game':
          if (!mutations.startGame) {
            console.warn('startGame mutation not available');
            break;
          }
          return mutations.startGame.mutate(sessionId);

        case 'judge_answer':
          if (!mutations.judgeAnswer) {
            console.warn('judgeAnswer mutation not available');
            break;
          }
          return mutations.judgeAnswer.mutate({ sessionId, correct: action.correct });

        case 'finalize_judgments':
          if (!mutations.finalizeJudgments) {
            console.warn('finalizeJudgments mutation not available');
            break;
          }
          return mutations.finalizeJudgments.mutate({ sessionId, overrides: action.overrides });

        case 'advance_round':
          if (!mutations.advanceRound) {
            console.warn('advanceRound mutation not available');
            break;
          }
          return mutations.advanceRound.mutate(sessionId);

        case 'reveal_answer':
          if (!mutations.revealAnswer) {
            console.warn('revealAnswer mutation not available');
            break;
          }
          return mutations.revealAnswer.mutate(sessionId);

        case 'end_game':
          if (!mutations.endGame) {
            console.warn('endGame mutation not available');
            break;
          }
          return mutations.endGame.mutate(sessionId);

        case 'join_session':
          console.warn('join_session should be handled in lobby, not via executeAction');
          break;

        case 'update_settings':
          console.warn('update_settings not yet implemented');
          break;
      }
    },
    [sessionId, mutations, context]
  );

  const isActionLoading = useCallback(
    (actionType: GameAction['type']) => {
      switch (actionType) {
        case 'buzz':
          return mutations.buzz?.isPending ?? false;
        case 'submit_answer':
          return mutations.submitAnswer?.isPending ?? false;
        case 'start_game':
          return mutations.startGame?.isPending ?? false;
        case 'judge_answer':
          return mutations.judgeAnswer?.isPending ?? false;
        case 'finalize_judgments':
          return mutations.finalizeJudgments?.isPending ?? false;
        case 'advance_round':
          return mutations.advanceRound?.isPending ?? false;
        case 'reveal_answer':
          return mutations.revealAnswer?.isPending ?? false;
        case 'end_game':
          return mutations.endGame?.isPending ?? false;
        default:
          return false;
      }
    },
    [mutations]
  );

  return {
    executeAction,
    isActionLoading,
  };
}
