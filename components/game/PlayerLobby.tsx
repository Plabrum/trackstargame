"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { PlayerList } from "@/components/shared/PlayerList";
import { Header } from "@/components/shared/Header";
import { useJoinSession } from "@/hooks/mutations/use-game-mutations";
import { toast } from "sonner";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface PlayerLobbyProps {
  sessionId: string;
  hostName: string;
  players: Player[];
  currentPlayerId?: string | null;
  onPlayerJoined: (playerId: string) => void;
}

export function PlayerLobby({
  sessionId,
  hostName,
  players,
  currentPlayerId,
  onPlayerJoined,
}: PlayerLobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const hasJoined = !!currentPlayerId;

  const joinSession = useJoinSession();

  const handleJoin = () => {
    if (!playerName.trim()) return;

    joinSession.mutate(
      { sessionId, playerName: playerName.trim() },
      {
        onSuccess: (player) => {
          onPlayerJoined(player.id);
        },
        onError: (error) => {
          toast.error("Failed to join", {
            description: error.message,
          });
        },
      }
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Header title="Join Game" />
        <p className="text-sm text-muted-foreground">
          {hostName} • {sessionId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {!hasJoined ? (
        /* Join Form - Simplified */
        <div className="space-y-4">
          <Input
            id="playerName"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && playerName.trim() && !joinSession.isPending) {
                handleJoin();
              }
            }}
            autoFocus
            maxLength={50}
            className="text-lg h-14 text-center"
          />

          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={!playerName.trim() || joinSession.isPending}
          >
            {joinSession.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Game"
            )}
          </Button>
        </div>
      ) : (
        /* Waiting for Game to Start - Simplified */
        <div className="text-center py-8 space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
            <svg
              className="h-6 w-6 text-green-600"
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
          <p className="text-lg font-medium">You&apos;re in!</p>
          <p className="text-sm text-muted-foreground">Waiting for game to start...</p>
        </div>
      )}

      {/* Players List */}
      <PlayerList
        players={players}
        currentPlayerId={currentPlayerId ?? undefined}
      />
    </div>
  );
}
