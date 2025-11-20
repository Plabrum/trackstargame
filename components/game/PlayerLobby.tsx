"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { PlayerList } from "@/components/shared/PlayerList";
import { Header } from "@/components/shared/Header";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface PlayerLobbyProps {
  sessionId: string;
  hostName: string;
  players: Player[];
  currentPlayerId?: string | null;
  onJoin: (playerName: string) => void;
  isJoining: boolean;
  joinError?: Error | null;
}

export function PlayerLobby({
  sessionId,
  hostName,
  players,
  currentPlayerId,
  onJoin,
  isJoining,
  joinError,
}: PlayerLobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const hasJoined = !!currentPlayerId;

  const handleJoin = () => {
    if (!playerName.trim()) return;
    onJoin(playerName.trim());
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* Header */}
      <Header title="Join Game" />

      {/* Game Info */}
      <div className="flex items-center justify-center gap-4">
        <p className="text-muted-foreground">Hosted by {hostName}</p>
        <Badge variant="outline" className="text-sm">
          Game Code: {sessionId.slice(0, 8).toUpperCase()}
        </Badge>
      </div>

      {!hasJoined ? (
        /* Join Form */
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Enter Your Name</CardTitle>
            <CardDescription>
              Choose a display name to join the game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && playerName.trim() && !isJoining) {
                    handleJoin();
                  }
                }}
                autoFocus
                maxLength={30}
              />
            </div>

            {joinError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {joinError.message || "Failed to join game"}
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleJoin}
              disabled={!playerName.trim() || isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Game"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Waiting for Game to Start */
        <Card className="border-2 border-green-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xl font-semibold text-green-600">You&apos;re in!</p>
                <p className="text-muted-foreground mt-1">Waiting for host to start the game...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players List */}
      <PlayerList
        players={players}
        currentPlayerId={currentPlayerId ?? undefined}
      />

      {hasJoined && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-blue-900">
              Get ready! The game will start when the host is ready.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
