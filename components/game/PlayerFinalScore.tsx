"use client";

import { MultiplayerFinalScore } from "./MultiplayerFinalScore";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface PlayerFinalScoreProps {
  players: Player[];
  rounds: GameRound[];
  onPlayAgain: () => void;
  currentPlayerId?: string | null;
}

/**
 * Final Score component for players (does not require SpotifyAuthProvider)
 * Shows multiplayer final score without Spotify features
 */
export function PlayerFinalScore({ players, rounds, onPlayAgain, currentPlayerId }: PlayerFinalScoreProps) {
  return (
    <MultiplayerFinalScore
      players={players}
      rounds={rounds}
      onPlayAgain={onPlayAgain}
      currentPlayerId={currentPlayerId}
    />
  );
}
