/**
 * useHostGame Hook
 *
 * Consolidates all host game data, queries, mutations, and business logic.
 * Returns everything the host page needs in a single, clean interface.
 *
 * Throws if session fails to load - errors are shown via toast notifications.
 */

import { useState, useEffect } from 'react';
import { useGameSession, useGamePlayers, useGameRounds, useRoundAnswers, useTrack } from './queries/use-game';
import {
  useStartGame,
  useJudgeAnswer,
  useFinalizeJudgments,
  useAdvanceRound,
  useRevealAnswer,
  useEndGame,
  useSubmitAnswer,
} from './mutations/use-game-mutations';
import { useGameExecutor } from './useGameExecutor';
import { useSpotifyPlayer } from './useSpotifyPlayer';
import { useSpotifyAuth } from '@/lib/spotify-auth-context';
import { validateAnswer } from '@/lib/game/answer-validation';
import { toast } from 'sonner';
import type { Tables } from '@/lib/types/database';

export function useHostGame(sessionId: string) {
  const { accessToken } = useSpotifyAuth();
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null>(null);

  // Spotify player - errors shown via toast
  const spotifyPlayer = useSpotifyPlayer({
    accessToken,
    deviceName: 'Trackstar Game',
    onReady: () => {
      console.log('Spotify player ready');
    },
    onError: (error) => {
      console.error('Spotify error:', error);
      toast.error('Spotify Player Error', {
        description: error,
      });
    },
    onTrackEnd: () => {
      console.log('Track ended naturally');
    },
    onPlaybackChange: (state) => {
      console.log('Playback state:', state);
    },
  });

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(sessionId);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(sessionId);
  const { data: rounds = [] } = useGameRounds(sessionId);
  const { data: submittedAnswers = [] } = useRoundAnswers(sessionId, session?.current_round ?? null);

  // Derive data
  const currentRound = session ? rounds.find((r) => r.round_number === session.current_round) : null;
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
    },
  });

  // Reset answer feedback when round changes
  useEffect(() => {
    setAnswerFeedback(null);
    submitAnswer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.current_round]);

  // Handle answer submission for host player
  const handleSubmitAnswer = async (answer: string) => {
    if (!hostPlayer || !currentTrack || !session) {
      console.error('Missing required data:', { hostPlayer, currentTrack, session });
      toast.error("Error", {
        description: "Missing required data. Please refresh the page.",
      });
      return;
    }

    const roundStartTime = session.round_start_time;
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

  // Show session errors as toasts
  useEffect(() => {
    if (sessionError) {
      toast.error("Failed to load game session", {
        description: sessionError.message,
      });
    }
  }, [sessionError]);

  // While loading, return loading state
  const isLoading = isLoadingSession || isLoadingPlayers;
  if (isLoading) {
    return {
      isLoading: true,
      session: null as never,
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
    };
  }

  // If session failed to load, throw error (will be caught by error boundary)
  if (!session) {
    throw new Error(sessionError?.message || 'Failed to load game session');
  }

  // Session exists - return non-nullable session
  return {
    isLoading: false,

    // Data (session is non-nullable here)
    session: session as Tables<'game_sessions'>,
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
  };
}
