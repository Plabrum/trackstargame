/**
 * Player Scoreboard
 * Shows either solo score or party mode leaderboard
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedScore } from "@/components/game/ScoreAnimation";
import { Leaderboard } from "@/components/shared/Leaderboard";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface PlayerScoreboardProps {
  players: Player[];
  isSoloMode: boolean;
}

export function PlayerScoreboard({ players, isSoloMode }: PlayerScoreboardProps) {
  const hostPlayer = players.find(p => p.is_host);

  if (isSoloMode) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Current Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-6xl font-bold text-orange">
              <AnimatedScore score={hostPlayer?.score ?? 0} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Leaderboard
      players={players}
      variant="host"
      className="sticky top-6"
    />
  );
}
