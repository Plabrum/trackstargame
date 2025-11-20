"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Medal, Award } from "lucide-react";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { Header } from "@/components/shared/Header";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface FinalScoreProps {
  players: Player[];
  rounds: GameRound[];
  onPlayAgain: () => void;
  currentPlayerId?: string | null;
}

export function FinalScore({ players, rounds, onPlayAgain, currentPlayerId }: FinalScoreProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const winner = sortedPlayers[0];
  const topThree = sortedPlayers.slice(0, 3);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <Header title="Game Over!" showUserInfo />

      {/* Winner Podium */}
      <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Trophy className="h-20 w-20 mx-auto text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Winner</p>
              <p className="text-4xl font-bold">{winner?.name || 'No Winner'}</p>
              <p className="text-2xl text-yellow-600 font-semibold mt-2">
                {winner?.score ?? 0} points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 */}
      {topThree.length > 1 && (
        <div className="grid md:grid-cols-3 gap-4">
          {topThree.map((player, index) => {
            const icons = [Trophy, Medal, Award];
            const Icon = icons[index] || Award;
            const colors = [
              'text-yellow-500',
              'text-slate-400',
              'text-orange-500',
            ];
            const bgColors = [
              'bg-yellow-900/20',
              'bg-card',
              'bg-orange/10',
            ];

            if (index === 0) return null; // Skip winner (already shown above)

            return (
              <Card key={player.id} className={bgColors[index]}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <Icon className={`h-12 w-12 mx-auto ${colors[index]}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">#{index + 1}</p>
                      <p className="text-xl font-bold">{player.name}</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {player.score ?? 0} points
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard */}
      <Leaderboard
        players={players}
        currentPlayerId={currentPlayerId ?? undefined}
        variant="final"
        title="Final Leaderboard"
      />

      {/* Game Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold text-orange">{rounds.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Rounds Played</p>
            </div>
            <div className="text-center p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold text-orange">{players.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Players</p>
            </div>
            <div className="text-center p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold text-orange">
                {sortedPlayers.length > 0 ? Math.max(...sortedPlayers.map(p => p.score ?? 0)) : 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Highest Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button size="lg" onClick={onPlayAgain} className="min-w-[200px]">
          Play Again
        </Button>
      </div>
    </div>
  );
}
