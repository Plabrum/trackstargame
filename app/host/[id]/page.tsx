"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useGamePlayers, useGameRounds } from "@/hooks/queries/use-game";
import { useHost } from "@/hooks/useHost";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGameView } from "@/components/host/HostGameView";
import { FinalScore } from "@/components/game/FinalScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

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

  // Get current round data
  const currentRound = rounds.find((r) => r.round_number === session.current_round);
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Track info (would come from joining with tracks table in real implementation)
  const currentTrack = session.state === 'reveal' || session.state === 'buzzed'
    ? { title: "Track Title", artist: "Artist Name" } // Placeholder - would fetch from DB
    : null;

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
    <HostGameView
      session={session}
      players={players}
      currentTrack={currentTrack}
      buzzerPlayer={buzzerPlayer}
      elapsedSeconds={currentRound?.elapsed_seconds ? Number(currentRound.elapsed_seconds) : null}
      onStartRound={startRound}
      onJudgeCorrect={() => judgeAnswer(true)}
      onJudgeIncorrect={() => judgeAnswer(false)}
      onNextRound={nextRound}
      isStartingRound={isStartingRound}
      isJudging={isJudging}
      isAdvancing={isAdvancing}
    />
  );
}
