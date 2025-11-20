/**
 * PlayerList Component
 *
 * Reusable player list display for lobby screens.
 * Extracted from PlayerLobby and HostLobby.
 */

"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface PlayerListProps {
  /** Array of players to display */
  players: Player[];
  /** ID of current player (for highlighting) */
  currentPlayerId?: string;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Show badge with player count */
  showCount?: boolean;
  /** Custom badge content (e.g., "4 / 8" for host view) */
  countBadge?: ReactNode;
  /** Custom badge for each player (function receives player and returns badge) */
  playerBadge?: (player: Player) => ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state subtitle */
  emptySubtitle?: string;
}

/**
 * PlayerList component that displays players in a lobby.
 *
 * Features:
 * - Highlights current player with green background (player view)
 * - Shows numbered badges for each player
 * - Customizable player badges (e.g., "Ready", "You")
 * - Empty state handling
 */
export function PlayerList({
  players,
  currentPlayerId,
  title = "Players in Lobby",
  description,
  showCount = true,
  countBadge,
  playerBadge,
  emptyMessage = "No players yet",
  emptySubtitle,
}: PlayerListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </span>
          {showCount && (
            countBadge || (
              <Badge variant="secondary">{players.length}</Badge>
            )
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>{emptyMessage}</p>
            {emptySubtitle && <p className="text-sm mt-1">{emptySubtitle}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((player, index) => {
              const isCurrentPlayer = currentPlayerId && player.id === currentPlayerId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isCurrentPlayer
                      ? 'bg-green-900/20 border border-green-500/30'
                      : 'bg-card border border-border'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                      isCurrentPlayer
                        ? 'bg-green-500 text-white'
                        : 'bg-orange/20 text-orange'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="font-medium flex-1">{player.name}</span>
                  {playerBadge ? (
                    playerBadge(player)
                  ) : (
                    isCurrentPlayer && (
                      <Badge variant="outline" className="bg-card">You</Badge>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
