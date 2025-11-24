"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useGamePlayers, useGameRounds, useRoundAnswers } from "@/hooks/queries/use-game";
import { useHost } from "@/hooks/useHost";
import { useSubmitAnswer, useFinalizeJudgments } from "@/hooks/mutations/use-game-mutations";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGameController } from "@/components/host/HostGameController";
import { HostFinalScore } from "@/components/game/HostFinalScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { toast } from "sonner";
import { validateAnswer } from "@/lib/game/answer-validation";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Get Spotify access token from context
  const { accessToken } = useSpotifyAuth();
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Initialize Spotify player once at page level (persists across game states)
  const spotifyPlayer = useSpotifyPlayer({
    accessToken,
    deviceName: 'Trackstar Game',
    onReady: () => {
      console.log('Spotify player ready');
      setPlayerError(null);
    },
    onError: (error) => {
      console.error('Spotify error:', error);
      setPlayerError(error);
    },
    onTrackEnd: () => {
      console.log('Track ended naturally');
    },
    onPlaybackChange: (state) => {
      console.log('Playback state:', state);
    },
  });

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

  // Fetch submitted answers for current round (for text input mode)
  const { data: submittedAnswers = [] } = useRoundAnswers(id, session?.current_round ?? null);

  // Get current round data (needed for track query)
  const currentRound = session ? rounds.find((r) => r.round_number === session.current_round) : null;
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Fetch track details for current round (must be before early returns)
  const { data: currentTrack } = useQuery({
    queryKey: ['tracks', currentRound?.track_id],
    queryFn: async () => {
      if (!currentRound?.track_id) return null;

      const supabase = await import('@/lib/supabase/client').then(m => m.createClient());
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', currentRound.track_id)
        .single();

      if (error) {
        console.error('Failed to fetch track:', error);
        return null;
      }

      return data;
    },
    enabled: !!currentRound?.track_id && !!session && (session.state === 'playing' || session.state === 'buzzed' || session.state === 'reveal'),
  });

  // Host controls
  const {
    startGame,
    judgeAnswer,
    nextRound,
    revealTrack,
    endGame,
    isStartingGame,
    isJudging,
    isAdvancing,
    isRevealing,
    isEndingGame,
  } = useHost(id);

  // Find host player (auto-created by start_game when allow_host_to_play is enabled)
  const hostPlayer = players.find((p) => p.is_host);

  // Submit answer mutation (text input mode for solo mode)
  const submitAnswer = useSubmitAnswer();
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null>(null);

  // Finalize judgments mutation (for party mode with text input)
  const finalizeJudgments = useFinalizeJudgments();

  // Reset answer feedback and mutation state when round changes
  useEffect(() => {
    setAnswerFeedback(null);
    submitAnswer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.current_round]);

  const handleSubmitAnswer = async (answer: string) => {
    if (!hostPlayer || !currentTrack || !session) {
      console.error('Missing required data:', { hostPlayer, currentTrack, session });
      toast.error("Error", {
        description: "Missing required data. Please refresh the page.",
      });
      return;
    }

    // Calculate elapsed time
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

    console.log('Submitting answer:', {
      answer,
      playerId: hostPlayer.id,
      sessionId: id,
      autoValidated,
      pointsAwarded,
    });

    submitAnswer.mutate(
      {
        sessionId: id,
        playerId: hostPlayer.id,
        answer,
        autoValidated,
        pointsAwarded,
      },
      {
        onSuccess: (data) => {
          console.log('Submit answer success:', data);
          // Show feedback
          setAnswerFeedback({
            isCorrect: autoValidated,
            correctAnswer: currentTrack.artist,
            pointsEarned: pointsAwarded,
          });
        },
        onError: (error) => {
          console.error('Submit answer error:', error);
          toast.error("Failed to submit answer", {
            description: error.message,
          });
        },
      }
    );
  };

  // Debug logging
  if (session) {
    console.log('Host page - Session data:', {
      state: session.state,
      allow_host_to_play: session.allow_host_to_play,
      enable_text_input_mode: session.enable_text_input_mode,
      total_rounds: session.total_rounds,
      current_round: session.current_round,
    });
    console.log('Host page - Host player:', hostPlayer);
  }

  // Loading state
  if (isLoadingSession || isLoadingPlayers) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (sessionError || !session) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>
            {sessionError?.message || "Game session not found"}
          </AlertDescription>
        </Alert>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-muted-foreground hover:underline"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  // Render appropriate view based on game state
  if (session.state === 'finished') {
    return (
      <HostFinalScore
        players={players}
        rounds={rounds}
        onPlayAgain={() => router.push("/host")}
      />
    );
  }

  if (session.state === 'lobby') {
    return (
      <HostLobby
        session={session}
        players={players}
        onStartGame={startGame}
        isStarting={isStartingGame}
        isSpotifyReady={spotifyPlayer.isReady}
        spotifyError={playerError || spotifyPlayer.error}
      />
    );
  }

  return (
    <HostGameController
      gameData={{
        session,
        players,
        currentTrack,
        currentRound,
        buzzerPlayer,
        elapsedSeconds: currentRound?.elapsed_seconds ? Number(currentRound.elapsed_seconds) : null,
      }}
      gameActions={{
        onJudgeCorrect: () => judgeAnswer(true),
        onJudgeIncorrect: () => judgeAnswer(false),
        onNextRound: nextRound,
        onRevealTrack: revealTrack,
        onEndGame: endGame,
      }}
      loadingStates={{
        isJudging,
        isAdvancing,
        isRevealing,
        isEndingGame,
      }}
      spotifyPlayer={spotifyPlayer}
      playerError={playerError}
      soloMode={
        hostPlayer
          ? {
            hostPlayerId: hostPlayer.id,
            onSubmitAnswer: handleSubmitAnswer,
            isSubmitting: submitAnswer.isPending,
            hasSubmitted: submitAnswer.isSuccess,
            answerFeedback,
          }
          : undefined
      }
      textInputMode={
        submittedAnswers
          ? {
            submittedAnswers,
            onFinalizeJudgment: (overrides) => {
              finalizeJudgments.mutate(
                { sessionId: id, overrides },
                {
                  onError: (error) => {
                    toast.error("Failed to finalize judgments", {
                      description: error.message,
                    });
                  },
                }
              );
            },
            isFinalizing: finalizeJudgments.isPending,
          }
          : undefined
      }
    />
  );
}
