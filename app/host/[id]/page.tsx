"use client";

import { use, useState, useEffect } from "react";
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
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch Spotify access token (initialize once at page level)
  const [accessToken, setAccessToken] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/spotify/token')
      .then(res => res.json())
      .then(data => {
        if (data.accessToken) {
          setAccessToken(data.accessToken);
        } else {
          setPlayerError('No Spotify access token found. Please sign in again.');
        }
      })
      .catch(err => {
        console.error('Failed to get access token:', err);
        setPlayerError('Failed to get Spotify access token');
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

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
    revealTrack,
    endGame,
    isStartingGame,
    isStartingRound,
    isJudging,
    isAdvancing,
    isRevealing,
    isEndingGame,
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
  if (isLoadingSession || isLoadingPlayers || isLoadingAuth) {
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
        onPlayAgain={() => router.push("/host/select-pack")}
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
        return await startRound();
      }}
      onJudgeCorrect={() => {
        judgeAnswer(true);
      }}
      onJudgeIncorrect={() => {
        judgeAnswer(false);
      }}
      onNextRound={nextRound}
      onRevealTrack={revealTrack}
      onEndGame={endGame}
      isStartingRound={isStartingRound}
      isJudging={isJudging}
      isAdvancing={isAdvancing}
      isRevealing={isRevealing}
      isEndingGame={isEndingGame}
      spotifyPlayer={spotifyPlayer}
      playerError={playerError}
    />
  );
}
