"use client";

import { forwardRef } from "react";
import type { Tables } from "@/lib/types/database";
import { Trophy, Medal, Award } from "lucide-react";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface ShareablePartyCardProps {
  players: Player[];
  rounds: GameRound[];
  albumArtUrl?: string | null;
}

/**
 * Phone-sized shareable party leaderboard card for social media
 * Dimensions: 375x812 (iPhone 13/14 size)
 */
export const ShareablePartyCard = forwardRef<HTMLDivElement, ShareablePartyCardProps>(
  ({ players, rounds, albumArtUrl }, ref) => {
    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topThree = sortedPlayers.slice(0, 3);

    // Calculate overall accuracy
    const totalAttempts = rounds.filter(r => r.correct !== null).length;
    const correctAttempts = rounds.filter(r => r.correct === true).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden bg-black"
        style={{
          width: '375px',
          height: '812px',
        }}
      >
        {/* Background */}
        {albumArtUrl && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${albumArtUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(30px)',
              imageRendering: 'pixelated',
              transform: 'scale(1.2)',
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black/90" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-8 text-white">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src="/logo.svg"
                alt="Trackstar"
                className="h-8 w-auto opacity-90"
              />
            </div>
            <p className="text-sm text-white/60 text-center">Party Mode Results</p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Winner */}
            {topThree[0] && (
              <div className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
                <div className="text-center space-y-2">
                  <Trophy className="h-12 w-12 mx-auto text-yellow-400" />
                  <p className="text-white/80 text-xs uppercase tracking-wider">Winner</p>
                  <p className="text-3xl font-bold text-white">{topThree[0].name}</p>
                  <p className="text-2xl font-bold text-orange">{topThree[0].score ?? 0} pts</p>
                </div>
              </div>
            )}

            {/* 2nd and 3rd Place */}
            {topThree.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                {topThree.slice(1, 3).map((player, index) => {
                  const icons = [Medal, Award];
                  const Icon = icons[index];
                  const colors = ['text-slate-300', 'text-orange-400'];

                  return (
                    <div
                      key={player.id}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                    >
                      <div className="text-center space-y-2">
                        <Icon className={`h-8 w-8 mx-auto ${colors[index]}`} />
                        <p className="text-white/60 text-[10px] uppercase">#{index + 2}</p>
                        <p className="text-lg font-bold text-white truncate">{player.name}</p>
                        <p className="text-sm font-semibold text-white/80">{player.score ?? 0} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{players.length}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Players</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{rounds.length}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Rounds</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{accuracy}%</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Accuracy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1">
            <p className="text-white/40 text-xs">trackstargame.com</p>
            <p className="text-white/60 text-sm">Think you can beat us?</p>
          </div>
        </div>
      </div>
    );
  }
);

ShareablePartyCard.displayName = 'ShareablePartyCard';
