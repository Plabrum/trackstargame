"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Loader2 } from "lucide-react";
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
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Join Game</h1>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players in Lobby
            </span>
            <Badge variant="secondary">{players.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No players yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                      player.id === currentPlayerId
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === currentPlayerId && (
                    <Badge variant="outline" className="bg-white">You</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
