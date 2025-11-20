"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useGameSession, useGamePlayers, useGameRounds } from "@/hooks/queries/use-game";
import { useJoinSession, useSubmitAnswer } from "@/hooks/mutations/use-game-mutations";
import { usePlayer } from "@/hooks/usePlayer";
import { PlayerLobby } from "@/components/game/PlayerLobby";
import { PlayerGameView } from "@/components/game/PlayerGameView";
import { FinalScore } from "@/components/game/FinalScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { fuzzyMatch } from "@/lib/game/fuzzy-match";
import { calculatePoints } from "@/lib/game/state-machine";

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // Player ID state (stored in localStorage)
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Load player ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`player_${id}`);
    if (stored) {
      setPlayerId(stored);
    }
  }, [id]);

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

  // Get current round data (needed for track query - must be before early returns)
  const currentRound = rounds.find((r) => r.round_number === session?.current_round);

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
    enabled: !!currentRound?.track_id && !!session && (session.state === 'buzzed' || session.state === 'reveal'),
  });

  // Join session mutation
  const joinSession = useJoinSession();

  // Player controls
  const { buzz, isBuzzing } = usePlayer(id, playerId, session?.current_round);

  // Submit answer mutation (text input mode)
  const submitAnswer = useSubmitAnswer();
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null>(null);

  // Reset answer feedback when round changes
  useEffect(() => {
    setAnswerFeedback(null);
  }, [session?.current_round]);

  const handleJoin = (playerName: string) => {
    joinSession.mutate(
      { sessionId: id, playerName },
      {
        onSuccess: (player) => {
          setPlayerId(player.id);
          localStorage.setItem(`player_${id}`, player.id);
        },
        onError: (error) => {
          toast({
            title: "Failed to join",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!playerId || !currentTrack || !session) return;

    // Calculate elapsed time
    const roundStartTime = session.round_start_time;
    if (!roundStartTime) {
      toast({
        title: "Error",
        description: "Round has not started yet",
        variant: "destructive",
      });
      return;
    }

    const elapsedMs = Date.now() - new Date(roundStartTime).getTime();
    const elapsedSeconds = elapsedMs / 1000;

    // Auto-validate answer using fuzzy matching
    const autoValidated = fuzzyMatch(answer, currentTrack.artist, 80);

    // Calculate points if correct
    const pointsAwarded = autoValidated ? calculatePoints(elapsedSeconds, true) : 0;

    submitAnswer.mutate(
      {
        sessionId: id,
        playerId,
        answer,
        autoValidated,
        pointsAwarded,
      },
      {
        onSuccess: (data) => {
          // Show feedback
          setAnswerFeedback({
            isCorrect: autoValidated,
            correctAnswer: currentTrack.artist,
            pointsEarned: pointsAwarded,
          });
        },
        onError: (error) => {
          toast({
            title: "Failed to submit answer",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Loading state
  if (isLoadingSession || isLoadingPlayers) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-12 w-64 mx-auto" />
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

  // Get buzzer player
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Check if player can buzz - requires playing state, no buzzer, and round must have started
  const canBuzz = session.state === 'playing' && !buzzerPlayer && !!session.round_start_time;

  // Render appropriate view based on game state
  if (session.state === 'finished') {
    return (
      <FinalScore
        players={players}
        rounds={rounds}
        currentPlayerId={playerId}
        onPlayAgain={() => router.push("/")}
      />
    );
  }

  if (session.state === 'lobby') {
    return (
      <PlayerLobby
        sessionId={id}
        hostName={session.host_name}
        players={players}
        currentPlayerId={playerId}
        onJoin={handleJoin}
        isJoining={joinSession.isPending}
        joinError={joinSession.error}
      />
    );
  }

  // Must have joined to play
  if (!playerId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>
            You must join the game first. Please refresh and join from the lobby.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PlayerGameView
      session={session}
      players={players}
      currentPlayerId={playerId}
      currentRound={currentRound}
      currentTrack={currentTrack}
      buzzerPlayer={buzzerPlayer}
      onBuzz={buzz}
      isBuzzing={isBuzzing}
      roundJudgment={
        currentRound?.buzzer_player_id === playerId && currentRound?.correct !== null
          ? {
              playerId: currentRound.buzzer_player_id,
              correct: currentRound.correct,
              pointsAwarded: currentRound.points_awarded ?? 0,
            }
          : null
      }
      onSubmitAnswer={handleSubmitAnswer}
      isSubmittingAnswer={submitAnswer.isPending}
      hasSubmittedAnswer={submitAnswer.isSuccess}
      answerFeedback={answerFeedback}
    />
  );
}
