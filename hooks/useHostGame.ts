/**
 * useHostGame Hook
 *
 * Consolidates all host game data, queries, mutations, and business logic.
 * Returns everything the host page needs in a single, clean interface.
 *
 * Throws if session fails to load - errors are shown via toast notifications.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameSession, useGamePlayers, useGameRounds, useRoundAnswers, useTrack } from './queries/use-game';
import {
  useStartGame,
  useJudgeAnswer,
  useFinalizeJudgments,
  useAdvanceRound,
  useRevealAnswer,
  useEndGame,
  useSubmitAnswer,
  useResetGame,
} from './mutations/use-game-mutations';
import { useGameExecutor } from './useGameExecutor';
import { useSpotifyPlayer } from './useSpotifyPlayer';
import { useSpotifyAuth } from '@/lib/spotify-auth-context';
import { validateAnswer } from '@/lib/game/answer-validation';
import { toast } from 'sonner';
import type { Tables } from '@/lib/types/database';

export function useHostGame(sessionId: string) {
  const { accessToken, user } = useSpotifyAuth();
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null>(null);

  // Memoize the onError callback to prevent unnecessary re-initialization of the player
  const handleSpotifyError = useCallback((error: string) => {
    // Show different toast styles based on error type
    if (error.includes('Premium Required')) {
      toast.error('Spotify Premium Required', {
        description: error,
        duration: 10000, // Show longer for important errors
      });
    } else if (error.includes('Authentication failed')) {
      toast.error('Session Expired', {
        description: error,
        duration: 8000,
      });
    } else {
      toast.error('Spotify Player Error', {
        description: error,
      });
    }
  }, []);

  // Spotify player - errors shown via toast
  const spotifyPlayer = useSpotifyPlayer({
    accessToken,
    deviceName: 'Trackstar Game',
    onError: handleSpotifyError,
  });

  // Fetch game data (session is provided by layout context, always non-null)
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(sessionId);
  const { data: rounds = [] } = useGameRounds(sessionId);

  // Note: We still need to fetch session for realtime updates within the hook
  const { data: session } = useGameSession(sessionId);
  const { data: submittedAnswers = [] } = useRoundAnswers(sessionId, session?.current_round ?? null);

  // Derive data
  const currentRound = rounds.find((r) => r.round_number === session?.current_round);
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;
  const hostPlayer = players.find((p) => p.is_host);

  // Fetch track details for current round
  const { data: currentTrack } = useTrack(currentRound?.track_id ?? null);

  // All mutations
  const startGame = useStartGame();
  const judgeAnswer = useJudgeAnswer();
  const finalizeJudgments = useFinalizeJudgments();
  const advanceRound = useAdvanceRound();
  const revealAnswer = useRevealAnswer();
  const endGame = useEndGame();
  const submitAnswer = useSubmitAnswer();
  const resetGame = useResetGame();

  // Game action executor
  const { executeAction, isActionLoading } = useGameExecutor({
    sessionId,
    mutations: {
      startGame,
      judgeAnswer,
      finalizeJudgments,
      advanceRound,
      revealAnswer,
      endGame,
      resetGame,
    },
    context: {
      spotifyUserId: user.id, // Pass Spotify user ID for leaderboard tracking
    },
  });

  // Reset answer feedback when round changes
  useEffect(() => {
    setAnswerFeedback(null);
    submitAnswer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.current_round]);

  // Store pause function in a ref to avoid re-running effect when it changes
  const pauseRef = useRef(spotifyPlayer.pause);
  useEffect(() => {
    pauseRef.current = spotifyPlayer.pause;
  }, [spotifyPlayer.pause]);

  // Stop Spotify playback when game finishes
  useEffect(() => {
    if (session?.state === 'finished' && spotifyPlayer.isReady) {
      pauseRef.current();
    }
  }, [session?.state, spotifyPlayer.isReady]);

  // Handle answer submission for host player
  const handleSubmitAnswer = async (answer: string) => {
    if (!hostPlayer || !currentTrack) {
      console.error('Missing required data:', { hostPlayer, currentTrack });
      toast.error("Error", {
        description: "Missing required data. Please refresh the page.",
      });
      return;
    }

    const roundStartTime = session?.round_start_time;
    if (!roundStartTime) {
      toast.error("Error", {
        description: "Round has not started yet",
      });
      return;
    }

    // Validate answer and calculate points
    const { autoValidated, pointsAwarded } = validateAnswer(
      roundStartTime,
      answer,
      currentTrack.artist
    );

    submitAnswer.mutate(
      {
        sessionId,
        playerId: hostPlayer.id,
        answer,
        autoValidated,
        pointsAwarded,
      },
      {
        onSuccess: () => {
          setAnswerFeedback({
            isCorrect: autoValidated,
            correctAnswer: currentTrack.artist,
            pointsEarned: pointsAwarded,
          });
        },
        onError: (error) => {
          toast.error("Failed to submit answer", {
            description: error.message,
          });
        },
      }
    );
  };

  // While loading players, return loading state
  if (isLoadingPlayers) {
    return {
      isLoading: true,
      session: session ?? ({} as Tables<'game_sessions'>),
      players: [] as never,
      rounds: [] as never,
      currentRound: null as never,
      currentTrack: null as never,
      buzzerPlayer: null as never,
      hostPlayer: null as never,
      submittedAnswers: [] as never,
      spotifyPlayer: spotifyPlayer as never,
      executeAction: (() => {}) as never,
      isActionLoading: (() => false) as never,
      handleSubmitAnswer: (() => {}) as never,
      isSubmittingAnswer: false as never,
      hasSubmittedAnswer: false as never,
      answerFeedback: null as never,
      finalizeJudgments: finalizeJudgments as never,
      resetGame: resetGame as never,
    };
  }

  // Session is guaranteed by layout, return data
  return {
    isLoading: false,

    // Data (session is guaranteed by layout context)
    session: session ?? ({} as Tables<'game_sessions'>),
    players,
    rounds,
    currentRound,
    currentTrack,
    buzzerPlayer,
    hostPlayer,
    submittedAnswers,

    // Spotify
    spotifyPlayer,

    // Game actions
    executeAction,
    isActionLoading,

    // Host player answer submission
    handleSubmitAnswer,
    isSubmittingAnswer: submitAnswer.isPending,
    hasSubmittedAnswer: submitAnswer.isSuccess,
    answerFeedback,

    // Text input mode finalization
    finalizeJudgments,

    // Play again functionality
    resetGame,
  };
}
