/**
 * Host Game Page
 *
 * Simple state-based component switching using useHostGame hook.
 * All game logic, queries, and mutations are consolidated in the hook.
 */

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useHostGame } from "@/hooks/useHostGame";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGameController } from "@/components/host/HostGameController";
import { HostFinalScore } from "@/components/game/HostFinalScore";
import { LoadingWrapper } from "@/components/shared/LoadingWrapper";

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const game = useHostGame(id);

  return (
    <LoadingWrapper isLoading={game.isLoading}>
      {/* Lobby State */}
      {game.session.state === 'lobby' && (
        <HostLobby
          session={game.session}
          players={game.players}
          onStartGame={() => game.executeAction({ type: 'start_game' })}
          isStarting={game.isActionLoading('start_game')}
          isSpotifyReady={game.spotifyPlayer.isReady}
          spotifyError={game.spotifyPlayer.error}
        />
      )}

      {/* Final Score State */}
      {game.session.state === 'finished' && (
        <HostFinalScore
          players={game.players}
          rounds={game.rounds}
          onPlayAgain={() => router.push("/host")}
        />
      )}

      {/* Active Game States (playing, buzzed, submitted, reveal) */}
      {['playing', 'buzzed', 'submitted', 'reveal'].includes(game.session.state) && (
        <HostGameController
          gameData={{
            session: game.session,
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
      )}
    </LoadingWrapper>
  );
}
