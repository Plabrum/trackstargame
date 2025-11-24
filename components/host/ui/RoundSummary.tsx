/**
 * Round Summary
 * Shows summary information after a round is revealed
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;

interface RoundSummaryProps {
  buzzerPlayer: Player;
  elapsedSeconds: number;
}

export function RoundSummary({ buzzerPlayer, elapsedSeconds }: RoundSummaryProps) {
  const points = Math.max(1, Math.round((30 - elapsedSeconds) * 10) / 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Round Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
            <span className="text-muted-foreground">First Buzz</span>
            <span className="font-semibold">{buzzerPlayer.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
            <span className="text-muted-foreground">Time</span>
            <span className="font-semibold">{elapsedSeconds.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
            <span className="text-muted-foreground">Points</span>
            <span className="font-semibold">{points}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
