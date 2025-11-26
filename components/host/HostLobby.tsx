"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Settings, Music, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { GameSettingsForm } from "@/components/host/GameSettingsForm";
import { PlayerList } from "@/components/shared/PlayerList";
import { Header } from "@/components/shared/Header";
import { UserDisplay, LogoutButton, EndGameButton } from "@/components/shared/UserInfo";
import { useUpdateSettings } from "@/hooks/mutations/use-game-mutations";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface HostLobbyProps {
  session: GameSession;
  players: Player[];
  onStartGame: (settings?: {
    totalRounds?: number;
    allowHostToPlay?: boolean;
    enableTextInputMode?: boolean;
  }) => void;
  isStarting: boolean;
  isSpotifyReady: boolean;
  spotifyError: string | null;
  onEndGame: () => void;
  isEndingGame: boolean;
  onPrimeAudio?: () => Promise<void>;
}

export function HostLobby({ session, players, onStartGame, isStarting, isSpotifyReady, spotifyError, onEndGame, isEndingGame, onPrimeAudio }: HostLobbyProps) {
  const sessionId = session.id;
  const hostName = session.host_name;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${sessionId}` : "";

  // Track settings in state (not saved until game starts)
  // Solo mode = host plays + text input enabled
  const initialGameMode = session.allow_host_to_play && session.enable_text_input_mode ? 'solo' : 'party';
  const [totalRounds, setTotalRounds] = useState(session.total_rounds);
  const [gameMode, setGameMode] = useState<'solo' | 'party'>(initialGameMode);
  const [partyTextInput, setPartyTextInput] = useState(session.enable_text_input_mode ?? false);
  const [partyHostPlays, setPartyHostPlays] = useState(session.allow_host_to_play);

  // Mutation for updating settings
  const updateSettings = useUpdateSettings();

  // Determine min/max players based on current settings
  const maxPlayers = 10;
  let minPlayers = 2;

  // Derive settings from game mode for min player calculation
  const allowHostToPlay = gameMode === 'solo' || (partyTextInput && partyHostPlays);

  if (allowHostToPlay) {
    minPlayers = 0; // Host can play solo
  }

  const canStart = players.length >= minPlayers && players.length <= maxPlayers && isSpotifyReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionId);
    toast.success("Copied!", {
      description: "Game code copied to clipboard",
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Copied!", {
      description: "Join link copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <Header
        title="Game Lobby"
        rightContent={
          <>
            <UserDisplay />
            <EndGameButton
              onEndGame={onEndGame}
              isLoading={isEndingGame}
            />
            <LogoutButton />
          </>
        }
      />

      {/* Game Mode & Settings - Always Visible */}
      <GameSettingsForm
        session={session}
        embedded
        totalRounds={totalRounds}
        onTotalRoundsChange={setTotalRounds}
        gameMode={gameMode}
        onGameModeChange={setGameMode}
        partyTextInput={partyTextInput}
        onPartyTextInputChange={setPartyTextInput}
        partyHostPlays={partyHostPlays}
        onPartyHostPlaysChange={setPartyHostPlays}
      />

      {/* Party Mode: Show QR Code & Players */}
      {gameMode === 'party' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code & Game Code */}
          <Card>
            <CardHeader>
              <CardTitle>Players Join Here</CardTitle>
              <CardDescription>Share this code or QR code with players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={joinUrl} size={200} level="M" />
              </div>

              {/* Game Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Game Code</p>
                    <p className="text-2xl font-mono font-bold">{sessionId.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Join Link */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or share this link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={joinUrl}
                    className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-md truncate text-white"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players List */}
          <PlayerList
            players={players}
            title="Players"
            description={`Waiting for players to join (${minPlayers}-${maxPlayers} required)`}
            countBadge={
              <Badge variant={canStart ? "default" : "secondary"}>
                {players.length} / {maxPlayers}
              </Badge>
            }
            playerBadge={() => <Badge variant="outline">Ready</Badge>}
            emptySubtitle="Waiting for players to join..."
          />
        </div>
      )}

      {/* Spotify Status */}
      {!isSpotifyReady && !spotifyError && (
        <Alert>
          <Music className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Initializing Spotify player... This may take a few seconds.
          </AlertDescription>
        </Alert>
      )}

      {/* Start Game Section */}
      {!canStart && (
        <Alert className="mb-4">
          <AlertDescription>
            {!isSpotifyReady
              ? "Waiting for Spotify player to initialize..."
              : gameMode === 'solo'
                ? "Ready to start! You'll be playing solo."
                : players.length < minPlayers
                  ? allowHostToPlay
                    ? `Need at least ${minPlayers} other player to join (currently ${players.length})`
                    : `Need at least ${minPlayers} players to start (currently ${players.length})`
                  : `Too many players! Maximum is ${maxPlayers} (currently ${players.length})`}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button
          onClick={async () => {
            // Prime audio context for Safari (must be in user gesture)
            await onPrimeAudio?.();

            // Derive settings from current state
            const enableTextInputMode = gameMode === 'solo' || partyTextInput;

            console.log('Starting game with settings:', {
              allowHostToPlay,
              enableTextInputMode,
              totalRounds,
              gameMode,
              partyTextInput,
              partyHostPlays,
            });

            try {
              // First, update settings in the database
              const updatedSession = await updateSettings.mutateAsync({
                sessionId,
                totalRounds,
                allowHostToPlay,
                enableTextInputMode,
              });

              console.log('Settings updated successfully:', updatedSession);

              // Then start the game
              onStartGame();
            } catch (error) {
              console.error('Failed to start game:', error);
              toast.error("Error", {
                description: error instanceof Error ? error.message : "Failed to start game",
              });
            }
          }}
          disabled={!canStart || isStarting || updateSettings.isPending}
          className="px-12 py-3 text-lg font-bold bg-orange hover:bg-orange/90 text-white rounded-full"
        >
          {isStarting || updateSettings.isPending ? "Starting Game..." : "Start Game"}
        </Button>
      </div>

    </div>
  );
}
