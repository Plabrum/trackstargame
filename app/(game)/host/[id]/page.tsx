/**
 * Host Game Page
 *
 * Uses exhaustive switch statement for state handling.
 * TypeScript will error if any GameState is not explicitly handled.
 * Session is provided by layout and guaranteed non-null.
 */

"use client";

import { useRouter } from "next/navigation";
import { useGameSessionContext } from "@/lib/contexts/game-session-context";
import { useHostGame } from "@/hooks/useHostGame";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGameController } from "@/components/host/HostGameController";
import { HostFinalScore } from "@/components/game/HostFinalScore";
import { LoadingWrapper } from "@/components/shared/LoadingWrapper";
import type { GameState } from "@/lib/game/state-machine";
import { assertUnreachable } from "@/lib/utils/exhaustive-check";

export default function HostPage() {
  const router = useRouter();
  const { sessionId, session } = useGameSessionContext();
  const game = useHostGame(sessionId);

  // Exhaustive switch - TypeScript enforces all states are handled
  const renderGameState = (): React.ReactNode => {
    const state: GameState = session.state as GameState;

    switch (state) {
      case 'lobby':
        return (
          <HostLobby
            session={session}
            players={game.players}
            onStartGame={() => game.executeAction({ type: 'start_game' })}
            isStarting={game.isActionLoading('start_game')}
            isSpotifyReady={game.spotifyPlayer.isReady}
            spotifyError={game.spotifyPlayer.error}
          />
        );

      case 'playing':
      case 'buzzed':
      case 'submitted':
      case 'reveal':
        return (
          <HostGameController
            gameData={{
              session,
              players: game.players,
              currentTrack: game.currentTrack,
              currentRound: game.currentRound,
              buzzerPlayer: game.buzzerPlayer,
              elapsedSeconds: game.currentRound?.elapsed_seconds
                ? Number(game.currentRound.elapsed_seconds)
                : null,
            }}
            gameActions={{
              executeAction: game.executeAction,
              isActionLoading: game.isActionLoading,
            }}
            spotifyPlayer={game.spotifyPlayer}
            soloMode={
              game.hostPlayer
                ? {
                    hostPlayerId: game.hostPlayer.id,
                    onSubmitAnswer: game.handleSubmitAnswer,
                    isSubmitting: game.isSubmittingAnswer,
                    hasSubmitted: game.hasSubmittedAnswer,
                    answerFeedback: game.answerFeedback,
                  }
                : undefined
            }
            textInputMode={{
              submittedAnswers: game.submittedAnswers,
              onFinalizeJudgment: (overrides) => {
                game.executeAction({ type: 'finalize_judgments', overrides });
              },
              isFinalizing: game.isActionLoading('finalize_judgments'),
            }}
          />
        );

      case 'finished':
        return (
          <HostFinalScore
            players={game.players}
            rounds={game.rounds}
            onPlayAgain={() => router.push("/host")}
          />
        );

      default:
        // TypeScript will error here if any GameState case is missing above
        return assertUnreachable(state);
    }
  };

  return (
    <LoadingWrapper isLoading={game.isLoading}>
      {renderGameState()}
    </LoadingWrapper>
  );
}
