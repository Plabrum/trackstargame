"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Zap, TrendingUp, Users, Target, Clock } from "lucide-react";
import type { Tables } from "@/lib/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrack, useSpotifyAlbumArt } from "@/hooks/queries/use-game";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface PartyGameHighlightsProps {
  players: Player[];
  rounds: GameRound[];
  accessToken?: string | null;
}

interface Highlight {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subtitle: string;
}

export function PartyGameHighlights({ players, rounds, accessToken }: PartyGameHighlightsProps) {
  // Calculate highlights
  const highlights: Highlight[] = [];

  // 1. Fastest Buzz
  const roundsWithBuzzes = rounds.filter(r => r.buzzer_player_id && r.elapsed_seconds != null);
  if (roundsWithBuzzes.length > 0) {
    const fastestRound = roundsWithBuzzes.reduce((fastest, current) => {
      const currentTime = Number(current.elapsed_seconds);
      const fastestTime = Number(fastest.elapsed_seconds);
      return currentTime < fastestTime ? current : fastest;
    });
    const fastestPlayer = players.find(p => p.id === fastestRound.buzzer_player_id);

    if (fastestPlayer) {
      highlights.push({
        icon: Zap,
        iconBg: "bg-yellow-100",
        iconColor: "text-yellow-600",
        label: "Fastest Buzz",
        value: `${Number(fastestRound.elapsed_seconds).toFixed(2)}s`,
        subtitle: fastestPlayer.name,
      });
    }
  }

  // 2. Best Round (highest points in a single round)
  const bestRound = rounds.reduce((best, current) => {
    const currentPoints = current.points_awarded || 0;
    const bestPoints = best?.points_awarded || 0;
    return currentPoints > bestPoints ? current : best;
  }, rounds[0]);

  const bestRoundPlayer = bestRound ? players.find(p => p.id === bestRound.buzzer_player_id) : null;

  // 3. Comeback Player (biggest score improvement from mid-game)
  const midPoint = Math.floor(rounds.length / 2);
  if (midPoint > 0 && rounds.length > midPoint) {
    const playerImprovements = players.map(player => {
      const playerRounds = rounds.filter(r => r.buzzer_player_id === player.id && r.correct);
      const firstHalf = playerRounds.filter(r => r.round_number <= midPoint);
      const secondHalf = playerRounds.filter(r => r.round_number > midPoint);

      const firstHalfPoints = firstHalf.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      const secondHalfPoints = secondHalf.reduce((sum, r) => sum + (r.points_awarded || 0), 0);

      return {
        player,
        improvement: secondHalfPoints - firstHalfPoints,
        secondHalfPoints,
      };
    }).filter(p => p.improvement > 0);

    if (playerImprovements.length > 0) {
      const comeback = playerImprovements.reduce((best, current) =>
        current.improvement > best.improvement ? current : best
      );

      highlights.push({
        icon: TrendingUp,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        label: "Comeback Player",
        value: comeback.player.name,
        subtitle: `+${comeback.improvement} pts in 2nd half`,
      });
    }
  }

  // 4. Overall Accuracy
  const totalAttempts = rounds.filter(r => r.correct !== null).length;
  const correctAttempts = rounds.filter(r => r.correct === true).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  highlights.push({
    icon: Target,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    label: "Overall Accuracy",
    value: `${accuracy}%`,
    subtitle: `${correctAttempts}/${totalAttempts} correct`,
  });

  // 5. Perfect Streak
  const streakResults = players.map(player => {
    const playerRounds = rounds
      .filter(r => r.buzzer_player_id === player.id)
      .sort((a, b) => a.round_number - b.round_number);

    let currentStreak = 0;
    let bestStreak = 0;

    playerRounds.forEach(round => {
      if (round.correct === true) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return { player, streak: bestStreak };
  });

  const bestStreakResult = streakResults.reduce((best, current) =>
    current.streak > best.streak ? current : best,
    streakResults[0]
  );

  if (bestStreakResult && bestStreakResult.streak >= 3) {
    highlights.push({
      icon: Trophy,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      label: "Perfect Streak",
      value: `${bestStreakResult.streak} in a row`,
      subtitle: bestStreakResult.player.name,
    });
  }

  // 6. Average Buzz Time
  if (roundsWithBuzzes.length > 0) {
    const avgBuzzTime = roundsWithBuzzes.reduce((sum, r) =>
      sum + Number(r.elapsed_seconds), 0
    ) / roundsWithBuzzes.length;

    highlights.push({
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      label: "Avg. Buzz Time",
      value: `${avgBuzzTime.toFixed(2)}s`,
      subtitle: `across ${roundsWithBuzzes.length} buzzes`,
    });
  }

  // Fetch track details for best round (only if we have accessToken for Spotify)
  const { data: bestRoundTrack, isLoading: isLoadingTrack } = useTrack(bestRound?.track_id ?? null);
  const { data: albumArt } = useSpotifyAlbumArt(
    bestRoundTrack?.spotify_id ?? null,
    accessToken ?? null
  );

  return (
    <div className="space-y-6">
      {/* Highlights - Single Row */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${highlights.length}, minmax(0, 1fr))` }}
      >
        {highlights.map((highlight, index) => (
          <Card key={index}>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                <div className={`p-2 ${highlight.iconBg} rounded-lg w-fit mx-auto`}>
                  <highlight.icon className={`h-5 w-5 ${highlight.iconColor}`} />
                </div>
                <div className="text-center min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{highlight.label}</p>
                  <p className="text-lg font-bold truncate">{highlight.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {highlight.subtitle}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best Round Showcase */}
      {bestRound && bestRoundPlayer && bestRoundTrack && (
        <Card className="border-2 border-orange">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Best Round
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrack ? (
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {/* Album Art */}
                {albumArt ? (
                  <img
                    src={albumArt}
                    alt={`${bestRoundTrack.title} album art`}
                    className="h-24 w-24 rounded object-cover shadow-md"
                  />
                ) : (
                  <div className="h-24 w-24 rounded bg-muted flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Track Info */}
                <div className="flex-1">
                  <p className="font-bold text-lg">{bestRoundTrack.title}</p>
                  <p className="text-sm text-muted-foreground">{bestRoundTrack.artist}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Player: </span>
                      <span className="font-semibold">{bestRoundPlayer.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Round: </span>
                      <span className="font-semibold">{bestRound.round_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Points: </span>
                      <span className="font-semibold text-orange">
                        {bestRound.points_awarded || 0}
                      </span>
                    </div>
                    {bestRound.elapsed_seconds && (
                      <div>
                        <span className="text-muted-foreground">Time: </span>
                        <span className="font-semibold">
                          {Number(bestRound.elapsed_seconds).toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
