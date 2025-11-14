"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useGamePlayers, useGameRounds } from "@/hooks/queries/use-game";
import { useJoinSession } from "@/hooks/mutations/use-game-mutations";
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

  // Join session mutation
  const joinSession = useJoinSession();

  // Player controls
  const { buzz, isBuzzing } = usePlayer(id, playerId, {
    onBuzz: (event) => {
      if (event.playerId === playerId) {
        toast({
          title: "You buzzed!",
          description: `Time: ${event.elapsedSeconds?.toFixed(2)}s`,
        });
      } else {
        toast({
          title: "Buzz!",
          description: `${event.playerName} buzzed first`,
        });
      }
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

  const handleJoin = (playerName: string) => {
    joinSession.mutate(
      { sessionId: id, playerName },
      {
        onSuccess: (newPlayerId) => {
          setPlayerId(newPlayerId);
          localStorage.setItem(`player_${id}`, newPlayerId);
          toast({
            title: "Joined!",
            description: "You've successfully joined the game",
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

  // Get current round data
  const currentRound = rounds.find((r) => r.round_number === session.current_round);
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Track info (placeholder - would fetch from DB)
  const currentTrack = session.state === 'reveal' || session.state === 'buzzed'
    ? { title: "Track Title", artist: "Artist Name" }
    : null;

  // Check if player can buzz
  const canBuzz = session.state === 'playing' && !buzzerPlayer;

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
    />
  );
}
