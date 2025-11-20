"use client";

import { forwardRef } from "react";
import type { Tables } from "@/lib/types/database";
import { Trophy } from "lucide-react";

type GameRound = Tables<'game_rounds'>;

interface ShareableScoreCardProps {
  finalScore: number;
  rounds: GameRound[];
  accuracy: number;
  albumArtUrl?: string | null;
}

/**
 * Phone-sized shareable score card for social media
 * Dimensions: 375x812 (iPhone 13/14 size)
 */
export const ShareableScoreCard = forwardRef<HTMLDivElement, ShareableScoreCardProps>(
  ({ finalScore, rounds, accuracy, albumArtUrl }, ref) => {
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
          <div className="space-y-6">
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

            {/* Round Times */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-white/80 text-sm mb-3">Round Times</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {displayRounds.map((round, index) => (
                  <div
                    key={round.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-white/60">Round {round.round_number}</span>
                    <div className="flex items-center gap-2">
                      {round.correct === true ? (
                        <>
                          <span className="text-white font-mono">
                            {round.elapsed_seconds ? `${Number(round.elapsed_seconds).toFixed(2)}s` : '—'}
                          </span>
                          <span className="text-green-400 text-xs">✓</span>
                        </>
                      ) : round.correct === false ? (
                        <>
                          <span className="text-white/40 font-mono">
                            {round.elapsed_seconds ? `${Number(round.elapsed_seconds).toFixed(2)}s` : '—'}
                          </span>
                          <span className="text-red-400 text-xs">✗</span>
                        </>
                      ) : (
                        <span className="text-white/40">No answer</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
