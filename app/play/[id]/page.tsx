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

      const response = await fetch(`/api/tracks/${currentRound.track_id}`);
      if (!response.ok) return null;

      return response.json();
    },
    enabled: !!currentRound?.track_id && !!session && (session.state === 'buzzed' || session.state === 'reveal'),
  });

  // Join session mutation
  const joinSession = useJoinSession();

  // Player controls
  const { buzz, isBuzzing, lastJudgment } = usePlayer(id, playerId);

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
        onSuccess: (newPlayerId) => {
          setPlayerId(newPlayerId);
          localStorage.setItem(`player_${id}`, newPlayerId);
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

  const handleSubmitAnswer = (answer: string) => {
    if (!playerId) return;

    submitAnswer.mutate(
      { sessionId: id, playerId, answer },
      {
        onSuccess: (data) => {
          // If single player mode, show immediate feedback
          if (data.singlePlayerMode && data.isCorrect !== undefined) {
            setAnswerFeedback({
              isCorrect: data.isCorrect,
              correctAnswer: data.correctAnswer,
              pointsEarned: data.pointsEarned,
            });
          }
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
      currentTrack={currentTrack}
      buzzerPlayer={buzzerPlayer}
      onBuzz={buzz}
      isBuzzing={isBuzzing}
      canBuzz={canBuzz}
      lastJudgment={lastJudgment}
      onSubmitAnswer={handleSubmitAnswer}
      isSubmittingAnswer={submitAnswer.isPending}
      hasSubmittedAnswer={submitAnswer.isSuccess}
      answerFeedback={answerFeedback}
    />
  );
}
