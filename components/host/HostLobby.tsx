"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Users, Settings, Music, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GameSettingsForm } from "@/components/host/GameSettingsForm";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface HostLobbyProps {
  session: GameSession;
  players: Player[];
  onStartGame: (settings?: {
    totalRounds?: number;
    allowHostToPlay?: boolean;
    allowSingleUser?: boolean;
    enableTextInputMode?: boolean;
  }) => void;
  isStarting: boolean;
  isSpotifyReady: boolean;
  spotifyError: string | null;
}

export function HostLobby({ session, players, onStartGame, isStarting, isSpotifyReady, spotifyError }: HostLobbyProps) {
  const { toast } = useToast();
  const sessionId = session.id;
  const hostName = session.host_name;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${sessionId}` : "";

  // Track settings in state (not saved until game starts)
  const initialGameMode = session.allow_single_user ? 'solo' : 'party';
  const [totalRounds, setTotalRounds] = useState(session.total_rounds);
  const [gameMode, setGameMode] = useState<'solo' | 'party'>(initialGameMode);
  const [partyTextInput, setPartyTextInput] = useState(session.enable_text_input_mode ?? false);
  const [partyHostPlays, setPartyHostPlays] = useState(session.allow_host_to_play);

  // Determine min/max players based on current settings
  const maxPlayers = 10;
  let minPlayers = 2;

  // Derive settings from game mode for min player calculation
  const allowSingleUser = gameMode === 'solo';
  const allowHostToPlay = gameMode === 'solo' || (partyTextInput && partyHostPlays);

  if (allowSingleUser) {
    minPlayers = 0; // Allow solo play
  } else if (allowHostToPlay) {
    minPlayers = 1; // Host counts as 1, need at least 1 other player
  }

  const canStart = players.length >= minPlayers && players.length <= maxPlayers && isSpotifyReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionId);
    toast({
      title: "Copied!",
      description: "Game code copied to clipboard",
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast({
      title: "Copied!",
      description: "Join link copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Game Lobby</h1>
        <p className="text-muted-foreground">Host: {hostName}</p>
      </div>

      {/* Game Mode & Settings - Always Visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Configuration
          </CardTitle>
          <CardDescription>
            Choose your game mode and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
                <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg">
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
                    className="flex-1 px-3 py-2 text-sm bg-slate-100 rounded-md truncate"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players
                </span>
                <Badge variant={canStart ? "default" : "secondary"}>
                  {players.length} / {maxPlayers}
                </Badge>
              </CardTitle>
              <CardDescription>
                Waiting for players to join ({minPlayers}-{maxPlayers} required)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No players yet</p>
                  <p className="text-sm mt-1">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <Badge variant="outline">Ready</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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

      {spotifyError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {spotifyError}
            <br />
            <span className="text-sm">
              Try refreshing the page or signing in again. Spotify Premium may be required for full playback.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Start Game Section */}
      <Card className="border-2 border-primary">
        <CardContent className="pt-6">
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

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              // Derive settings from current state
              const enableTextInputMode = gameMode === 'solo' || partyTextInput;
              const settings = {
                totalRounds,
                allowHostToPlay,
                allowSingleUser,
                enableTextInputMode,
              };
              onStartGame(settings);
            }}
            disabled={!canStart || isStarting}
          >
            {isStarting ? "Starting Game..." : "Start Game"}
          </Button>

          <Separator className="my-4" />

          <div className="text-sm text-muted-foreground text-center space-y-1">
            {gameMode === 'solo' ? (
              <>
                <p>Ready to test your music knowledge?</p>
                <p>You&apos;ll type in artist names as songs play!</p>
              </>
            ) : (
              <>
                <p>Once you start, the game will begin immediately</p>
                <p>Make sure all players are ready!</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
