/**
 * Leaderboard Component
 *
 * Reusable leaderboard display with multiple variants.
 * Extracted from PlayerGameView, HostGameView, and FinalScore.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedScore } from "@/components/game/ScoreAnimation";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface LeaderboardProps {
  /** Array of players to display */
  players: Player[];
  /** ID of current player (for highlighting) */
  currentPlayerId?: string;
  /** Display variant */
  variant?: 'live' | 'host' | 'final';
  /** Card title */
  title?: string;
  /** Show animated scores */
  animateScores?: boolean;
  /** Additional className for the Card wrapper */
  className?: string;
}

/**
 * Leaderboard component that displays players sorted by score.
 *
 * Variants:
 * - 'live': Player view with animated scores, purple highlight for current player
 * - 'host': Host view with badges, simpler styling
 * - 'final': Final score view with larger text, top 3 highlighting
 */
export function Leaderboard({
  players,
  currentPlayerId,
  variant = 'live',
  title = 'Leaderboard',
  animateScores = false,
  className = '',
}: LeaderboardProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const getRankBadgeStyles = (index: number, isCurrentPlayer: boolean) => {
    if (isCurrentPlayer) {
      return 'bg-purple-500 text-white';
    }

    switch (index) {
      case 0: return 'bg-yellow-400 text-yellow-900';
      case 1: return 'bg-slate-300 text-slate-700';
      case 2: return variant === 'final' ? 'bg-orange-400 text-orange-900' : 'bg-orange-300 text-orange-900';
      default: return 'bg-slate-200 text-slate-600';
    }
  };

  const getRowBackgroundStyles = (index: number, isCurrentPlayer: boolean) => {
    if (isCurrentPlayer) {
      return 'bg-purple-100 border-2 border-purple-300';
    }

    if (variant === 'host') {
      return index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-slate-50';
    }

    if (variant === 'final') {
      switch (index) {
        case 0: return 'bg-gradient-to-r from-yellow-100 to-yellow-50';
        case 1: return 'bg-slate-100';
        case 2: return 'bg-orange-50';
        default: return 'bg-slate-50';
      }
    }

    // live variant
    return index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' : 'bg-slate-50';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const isCurrentPlayer = currentPlayerId && player.id === currentPlayerId;
            const score = player.score ?? 0;

            // Host variant uses badges
            if (variant === 'host') {
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${getRowBackgroundStyles(index, !!isCurrentPlayer)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{player.name}</span>
                  </div>
                  <Badge variant={index === 0 ? "default" : "secondary"} className="text-lg px-3">
                    {score}
                  </Badge>
                </div>
              );
            }

            // Live and Final variants use similar structure with rank badges
            const rankSize = variant === 'final' ? 'h-10 w-10 text-lg' : 'h-8 w-8';
            const padding = variant === 'final' ? 'p-4' : 'p-3';
            const nameSize = variant === 'final' && index < 3 ? 'text-lg font-bold' : 'font-medium';
            const scoreSize = variant === 'final' ? 'text-2xl' : '';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between ${padding} rounded-lg ${getRowBackgroundStyles(index, !!isCurrentPlayer)}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex ${rankSize} items-center justify-center rounded-full font-semibold ${getRankBadgeStyles(index, !!isCurrentPlayer)}`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span className={`${nameSize} ${isCurrentPlayer ? 'font-bold' : ''}`}>
                      {player.name}
                      {isCurrentPlayer && (
                        <span className="ml-2 text-sm text-purple-600 font-semibold">(You)</span>
                      )}
                    </span>
                  </div>
                </div>
                <span className={`font-bold ${scoreSize} ${isCurrentPlayer ? 'text-purple-600' : ''}`}>
                  {animateScores && variant === 'live' ? (
                    <AnimatedScore score={score} />
                  ) : (
                    score
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
