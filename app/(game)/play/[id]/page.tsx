/**
 * Player Game Page
 *
 * Uses exhaustive switch statement for state handling.
 * TypeScript will error if any GameState is not explicitly handled.
 * Session is provided by layout and guaranteed non-null.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameSessionContext } from "@/lib/contexts/game-session-context";
import { useGameRounds, useTrack } from "@/hooks/queries/use-game";
import { useSubmitAnswer, useBuzz } from "@/hooks/mutations/use-game-mutations";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useGameExecutor } from "@/hooks/useGameExecutor";
import { PlayerLobby } from "@/components/game/PlayerLobby";
import { PlayerGameView } from "@/components/game/PlayerGameView";
import { PlayerFinalScore } from "@/components/game/PlayerFinalScore";
import { toast } from "sonner";
import type { GameState } from "@/lib/game/state-machine";
import { assertUnreachable } from "@/lib/utils/exhaustive-check";

export default function PlayPage() {
  const router = useRouter();
  const { sessionId, session, players } = useGameSessionContext();
  const prevStateRef = useRef<string | null>(null);

  // Player ID state (stored in localStorage)
  const { playerId, setPlayerId } = usePlayerIdentity(sessionId);

  // Fetch additional game data
  const { data: rounds = [] } = useGameRounds(sessionId);

  // Get current round data
  const currentRound = rounds.find((r) => r.round_number === session.current_round);

  // Fetch track details for current round
  const { data: currentTrack } = useTrack(currentRound?.track_id ?? null);

  // Mutations
  const buzz = useBuzz();
  const submitAnswer = useSubmitAnswer();

  // Game action executor
  const { executeAction, isActionLoading } = useGameExecutor({
    sessionId,
    mutations: {
      buzz,
      submitAnswer,
    },
    context: {
      playerId: playerId ?? undefined,
      currentRound: session.current_round ?? undefined,
    },
  });

  // Answer feedback state
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null>(null);

  // Reset answer feedback when round changes
  useEffect(() => {
    setAnswerFeedback(null);
    submitAnswer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.current_round]);

  // Notify player when game resets
  useEffect(() => {
    const prevState = prevStateRef.current;
    const currentState = session.state;

    if (prevState === 'finished' && currentState === 'playing') {
      toast.info("New game starting!", {
        description: "Get ready to play!",
        duration: 3000,
      });
    }

    prevStateRef.current = currentState;
  }, [session.state]);

  // Get buzzer player
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Exhaustive switch - TypeScript enforces all states are handled
  const renderGameState = (): React.ReactNode => {
    const state: GameState = session.state as GameState;

    switch (state) {
      case 'lobby':
        return (
          <PlayerLobby
            sessionId={sessionId}
            hostName={session.host_name}
            players={players}
            currentPlayerId={playerId}
            onPlayerJoined={setPlayerId}
          />
        );

      case 'playing':
      case 'buzzed':
      case 'submitted':
      case 'reveal':
        // Must have joined to play active states
        if (!playerId) {
          // Game is active but no player ID - shouldn't happen in normal flow
          return null;
        }

        return (
          <PlayerGameView
            session={session}
            players={players}
            currentPlayerId={playerId}
            currentRound={currentRound}
            currentTrack={currentTrack}
            buzzerPlayer={buzzerPlayer}
            executeAction={executeAction}
            isActionLoading={isActionLoading}
            roundJudgment={
              currentRound?.buzzer_player_id === playerId &&
              currentRound?.correct !== null &&
              currentRound.buzzer_player_id !== null
                ? {
                    playerId: currentRound.buzzer_player_id,
                    correct: currentRound.correct,
                    pointsAwarded: currentRound.points_awarded ?? 0,
                  }
                : null
            }
            hasSubmittedAnswer={submitAnswer.isSuccess}
            answerFeedback={answerFeedback}
          />
        );

      case 'finished':
        return (
          <PlayerFinalScore
            players={players}
            rounds={rounds}
            currentPlayerId={playerId}
            onPlayAgain={() => router.push("/")}
          />
        );

      default:
        // TypeScript will error here if any GameState case is missing above
        return assertUnreachable(state);
    }
  };

  return renderGameState();
}
