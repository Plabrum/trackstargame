"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useGamePlayers, useGameRounds } from "@/hooks/queries/use-game";
import { useHost } from "@/hooks/useHost";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGameController } from "@/components/host/HostGameController";
import { FinalScore } from "@/components/game/FinalScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

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

      const response = await fetch(`/api/tracks/${currentRound.track_id}`);
      if (!response.ok) return null;

      return response.json();
    },
    enabled: !!currentRound?.track_id && !!session && (session.state === 'playing' || session.state === 'buzzed' || session.state === 'reveal'),
  });

  // Host controls
  const {
    startGame,
    startRound,
    judgeAnswer,
    nextRound,
    isStartingGame,
    isStartingRound,
    isJudging,
    isAdvancing,
  } = useHost(id, {
    onBuzz: (event) => {
      toast({
        title: "Buzz!",
        description: `${event.playerName} buzzed at ${event.elapsedSeconds?.toFixed(2)}s`,
      });
    },
    onReveal: (event) => {
      toast({
        title: "Track Revealed",
        description: `${event.track.title} by ${event.track.artist}`,
      });
    },
    onGameEnd: () => {
      toast({
        title: "Game Over!",
        description: "All rounds completed",
      });
    },
  });

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
      <FinalScore
        players={players}
        rounds={rounds}
        onPlayAgain={() => router.push("/")}
      />
    );
  }

  if (session.state === 'lobby') {
    return (
      <HostLobby
        sessionId={id}
        hostName={session.host_name}
        players={players}
        onStartGame={startGame}
        isStarting={isStartingGame}
      />
    );
  }

  return (
    <HostGameController
      session={session}
      players={players}
      currentTrack={currentTrack}
      buzzerPlayer={buzzerPlayer}
      elapsedSeconds={currentRound?.elapsed_seconds ? Number(currentRound.elapsed_seconds) : null}
      onStartRound={async () => {
        await startRound();
      }}
      onJudgeCorrect={() => judgeAnswer(true)}
      onJudgeIncorrect={() => judgeAnswer(false)}
      onNextRound={nextRound}
      isStartingRound={isStartingRound}
      isJudging={isJudging}
      isAdvancing={isAdvancing}
    />
  );
}
