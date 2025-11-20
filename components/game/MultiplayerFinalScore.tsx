"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy } from "lucide-react";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { Header } from "@/components/shared/Header";
import { UserInfo } from "@/components/shared/UserInfo";
import { PartyGameHighlights } from "./PartyGameHighlights";
import { ShareButton } from "./ShareButton";
import { ShareablePartyCard } from "./ShareablePartyCard";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface MultiplayerFinalScoreProps {
  players: Player[];
  rounds: GameRound[];
  onPlayAgain: () => void;
  currentPlayerId?: string | null;
  showUserInfo?: boolean;
  accessToken?: string | null;
  albumArtUrl?: string | null;
}

export function MultiplayerFinalScore({ players, rounds, onPlayAgain, currentPlayerId, showUserInfo = false, accessToken, albumArtUrl }: MultiplayerFinalScoreProps) {
  const shareableRef = useRef<HTMLDivElement>(null);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const winner = sortedPlayers[0];

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <Header title="Game Over!" rightContent={showUserInfo ? <UserInfo /> : undefined} />

      {/* Winner Podium */}
      <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-center gap-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Winner</p>
              <p className="text-2xl font-bold">{winner?.name || 'No Winner'}</p>
              <p className="text-lg text-yellow-600 font-semibold">
                {winner?.score ?? 0} points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Highlights */}
      <PartyGameHighlights
        players={players}
        rounds={rounds}
        accessToken={accessToken}
      />

      <Separator />

      {/* Full Leaderboard */}
      <Leaderboard
        players={players}
        currentPlayerId={currentPlayerId ?? undefined}
        variant="final"
        title="Final Leaderboard"
      />

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-4">
        {showUserInfo && (
          <ShareButton
            targetRef={shareableRef}
            title="Our Trackstar Game Results"
            text={`We played Trackstar! ${winner?.name} won with ${winner?.score ?? 0} points! 🎵`}
          />
        )}
        <Button size="lg" variant="outline" onClick={onPlayAgain} className="w-full">
          Play Again
        </Button>
      </div>

      {/* Hidden Shareable Card (for capture) - only render for host */}
      {showUserInfo && (
        <div className="fixed -left-[9999px] top-0">
          <ShareablePartyCard
            ref={shareableRef}
            players={players}
            rounds={rounds}
            albumArtUrl={albumArtUrl}
          />
        </div>
      )}
    </div>
  );
}
