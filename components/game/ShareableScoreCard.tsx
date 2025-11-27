"use client";

import { forwardRef } from "react";
import type { Tables } from "@/lib/types/database";
import { Trophy, Zap, TrendingUp } from "lucide-react";

type GameRound = Tables<'game_rounds'>;

interface ShareableScoreCardProps {
  finalScore: number;
  rounds: GameRound[];
  accuracy: number;
  albumArtUrl?: string | null;
  bestRound?: {
    trackTitle: string;
    trackArtist: string;
    points: number;
    roundNumber: number;
  } | null;
}

/**
 * Phone-sized shareable score card for social media
 * Dimensions: 375x812 (iPhone 13/14 size)
 */
export const ShareableScoreCard = forwardRef<HTMLDivElement, ShareableScoreCardProps>(
  ({ finalScore, rounds, accuracy, albumArtUrl, bestRound }, ref) => {
    // Calculate additional metrics
    const totalRounds = rounds.length;
    const totalPoints = rounds.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
    const avgPoints = totalRounds > 0 ? Math.round((totalPoints / totalRounds) * 10) / 10 : 0;

    const correctRounds = rounds.filter(r => r.correct === true && r.elapsed_seconds != null);
    const fastestTime = correctRounds.length > 0
      ? Math.min(...correctRounds.map(r => Number(r.elapsed_seconds)))
      : null;

    // Get top 10 rounds (all rounds if less than 10)
    const displayRounds = rounds.slice(0, 10);

    return (
      <div
        ref={ref}
        className="relative overflow-hidden bg-black"
        style={{
          width: '375px',
          height: '812px',
        }}
      >
        {/* Pixelated Background */}
        {albumArtUrl && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${albumArtUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px)',
              imageRendering: 'pixelated',
              transform: 'scale(1.1)', // Slight zoom to hide edges from blur
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/90" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-8 text-white">
          {/* Header with Logo */}
          <div className="space-y-4">
            {/* Logo */}
            <div className="flex justify-center">
              <img
                src="/logo.svg"
                alt="Trackstar"
                className="h-8 w-auto opacity-90"
              />
            </div>
            <p className="text-sm text-white/60 text-center">Music Quiz Results</p>
          </div>

          {/* Main Score */}
          <div className="space-y-4">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-center space-y-1">
                <p className="text-white/80 text-xs uppercase tracking-wider">Final Score</p>
                <p className="text-6xl font-bold text-orange tracking-tight">{finalScore}</p>
                <p className="text-white/60 text-sm">points</p>
              </div>

              {/* Accuracy - Bottom Right */}
              <div className="absolute bottom-3 right-3">
                <div className="text-right">
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">Accuracy</p>
                  <p className="text-lg font-bold text-white">{accuracy}%</p>
                </div>
              </div>
            </div>

            {/* Fun Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Average Points */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-blue-500/20 rounded">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">Avg Points</p>
                </div>
                <p className="text-2xl font-bold text-white">{avgPoints}</p>
                <p className="text-[9px] text-white/50">per round</p>
              </div>

              {/* Fastest Answer */}
              {fastestTime !== null && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-yellow-500/20 rounded">
                      <Zap className="h-3.5 w-3.5 text-yellow-400" />
                    </div>
                    <p className="text-white/60 text-[10px] uppercase tracking-wide">Fastest</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{fastestTime.toFixed(2)}s</p>
                  <p className="text-[9px] text-white/50">lightning quick!</p>
                </div>
              )}
            </div>

            {/* Best Round */}
            {bestRound && (
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-3 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <p className="text-white/80 text-xs uppercase tracking-wide">Best Round</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold text-sm truncate">{bestRound.trackTitle}</p>
                  <p className="text-white/60 text-xs truncate">{bestRound.trackArtist}</p>
                  <div className="flex items-center gap-3 text-xs mt-2">
                    <div>
                      <span className="text-white/60">Round </span>
                      <span className="text-white font-semibold">{bestRound.roundNumber}</span>
                    </div>
                    <div>
                      <span className="text-white/60">•</span>
                    </div>
                    <div>
                      <span className="text-orange font-bold">{bestRound.points}</span>
                      <span className="text-white/60"> pts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center space-y-1">
            <p className="text-white/40 text-xs">trackstargame.com</p>
            <p className="text-white/60 text-sm">Think you can beat my score?</p>
          </div>
        </div>
      </div>
    );
  }
);

ShareableScoreCard.displayName = 'ShareableScoreCard';
