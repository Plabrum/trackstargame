"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/shared/Header";
import { UserInfo } from "@/components/shared/UserInfo";
import { SoloGameStats } from "./SoloGameStats";
import { ShareButton } from "./ShareButton";
import { ShareableScoreCard } from "./ShareableScoreCard";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface SoloFinalScoreProps {
  player: Player;
  rounds: GameRound[];
  onPlayAgain: () => void;
  albumArtUrl?: string;
}

export function SoloFinalScore({ player, rounds, onPlayAgain, albumArtUrl }: SoloFinalScoreProps) {
  const shareableRef = useRef<HTMLDivElement>(null);

  // Calculate stats
  const totalRounds = rounds.length;
  const correctAnswers = rounds.filter(r => r.correct === true).length;
  const accuracy = totalRounds > 0 ? Math.round((correctAnswers / totalRounds) * 100) : 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <Header title="Game Over!" rightContent={<UserInfo />} />

      {/* Regular Stats Display */}
      <SoloGameStats rounds={rounds} finalScore={player.score ?? 0} />

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <ShareButton
          targetRef={shareableRef}
          title="My Trackstar Game Score"
          text={`I scored ${player.score ?? 0} points in Trackstar! 🎵`}
        />
        <Button size="lg" variant="outline" onClick={onPlayAgain} className="w-full">
          Play Again
        </Button>
      </div>

      {/* Hidden Shareable Card (for capture) */}
      <div className="fixed -left-[9999px] top-0">
        <ShareableScoreCard
          ref={shareableRef}
          finalScore={player.score ?? 0}
          rounds={rounds}
          accuracy={accuracy}
          albumArtUrl={albumArtUrl}
        />
      </div>
    </div>
  );
}
