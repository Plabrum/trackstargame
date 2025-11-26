/**
 * Game Session Context
 *
 * Provides session and base game data to all game routes (host and play).
 * Session is guaranteed non-null when this context is available.
 */

"use client";

import { createContext, useContext, type ReactNode } from 'react';
import type { Tables } from '@/lib/types/database';
import type { TableRow } from '@/lib/types/database-helpers';

type GameSession = Tables<'game_sessions'>;
type Player = TableRow<'players'>;
type GameRound = TableRow<'game_rounds'>;

interface GameSessionContextValue {
  sessionId: string;
  session: GameSession;
  players: Player[];
  rounds: GameRound[];
  isLoadingPlayers: boolean;
}

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({
  children,
  value
}: {
  children: ReactNode;
  value: GameSessionContextValue;
}) {
  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}

/**
 * Access the game session context.
 * Session is guaranteed to be non-null.
 *
 * @throws Error if used outside of GameSessionProvider
 */
export function useGameSessionContext() {
  const context = useContext(GameSessionContext);

  if (!context) {
    throw new Error('useGameSessionContext must be used within GameSessionProvider');
  }

  return context;
}
