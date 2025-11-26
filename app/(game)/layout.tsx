/**
 * Game Layout
 *
 * Handles session loading and error states for both host and play routes.
 * Provides session context to child pages, guaranteeing non-null session.
 */

"use client";

import { use, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useGameSession, useGamePlayers, useGameRounds } from '@/hooks/queries/use-game';
import { GameSessionProvider } from '@/lib/contexts/game-session-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function GameLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const id = params.id as string;

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

  // Loading state
  if (isLoadingSession || isLoadingPlayers) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error or missing session - throw to error boundary
  if (sessionError || !session) {
    throw new Error(sessionError?.message || 'Game session not found');
  }

  // Provide session context to child routes
  return (
    <GameSessionProvider
      value={{
        sessionId: id,
        session,
        players,
        rounds,
        isLoadingPlayers,
      }}
    >
      {children}
    </GameSessionProvider>
  );
}
