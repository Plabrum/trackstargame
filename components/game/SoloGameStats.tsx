"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, TrendingUp } from "lucide-react";
import type { Tables } from "@/lib/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";
import { useTrack, useSpotifyAlbumArt } from "@/hooks/queries/use-game";

type GameRound = Tables<'game_rounds'>;

interface SoloGameStatsProps {
  rounds: GameRound[];
  finalScore: number;
}

interface BestRoundData {
  round: GameRound;
  track: {
    title: string;
    artist: string;
    spotify_id: string;
  };
}

export function SoloGameStats({ rounds, finalScore }: SoloGameStatsProps) {
  // Get Spotify access token from context
  const { accessToken } = useSpotifyAuth();

  // Calculate stats
  const totalRounds = rounds.length;
  const correctAnswers = rounds.filter(r => r.correct === true).length;
  const accuracy = totalRounds > 0 ? Math.round((correctAnswers / totalRounds) * 100) : 0;

  const totalPoints = rounds.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
  const avgPoints = totalRounds > 0 ? Math.round((totalPoints / totalRounds) * 10) / 10 : 0;

  const correctRounds = rounds.filter(r => r.correct === true && r.elapsed_seconds != null);
  const fastestTime = correctRounds.length > 0
    ? Math.min(...correctRounds.map(r => Number(r.elapsed_seconds)))
    : null;

  // Find best round (highest points)
  const bestRound = rounds.reduce((best, current) => {
    const currentPoints = current.points_awarded || 0;
    const bestPoints = best?.points_awarded || 0;
    return currentPoints > bestPoints ? current : best;
  }, rounds[0]);

  // Fetch track details for best round
  const { data: bestRoundTrack, isLoading: isLoadingTrack } = useTrack(bestRound?.track_id ?? null);

  // Fetch album art from Spotify API
  const { data: albumArt } = useSpotifyAlbumArt(bestRoundTrack?.spotify_id ?? null, accessToken);

  return (
    <div className="space-y-6">
      {/* Main Score Display */}
      <Card className="border-2 border-orange bg-gradient-to-br from-orange/10 to-orange/5">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Final Score</p>
            <p className="text-7xl font-bold text-orange">{finalScore}</p>
            <p className="text-lg text-muted-foreground">points</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Accuracy */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-3xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {correctAnswers} / {totalRounds} correct
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Points */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg. Points</p>
                <p className="text-3xl font-bold">{avgPoints}</p>
                <p className="text-xs text-muted-foreground mt-1">per round</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fastest Time */}
        {fastestTime !== null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Fastest Answer</p>
                  <p className="text-3xl font-bold">{fastestTime.toFixed(2)}s</p>
                  <p className="text-xs text-muted-foreground mt-1">lightning quick!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best Round */}
        {bestRound && bestRoundTrack && (
          <Card className="md:col-span-2">
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
                    <div className="mt-2 flex gap-4 text-sm">
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
    </div>
  );
}
