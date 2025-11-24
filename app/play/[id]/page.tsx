"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useGamePlayers, useGameRounds, useTrack } from "@/hooks/queries/use-game";
import { useSubmitAnswer, useBuzz } from "@/hooks/mutations/use-game-mutations";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useGameExecutor } from "@/hooks/useGameExecutor";
import { PlayerLobby } from "@/components/game/PlayerLobby";
import { PlayerGameView } from "@/components/game/PlayerGameView";
import { PlayerFinalScore } from "@/components/game/PlayerFinalScore";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Player ID state (stored in localStorage)
  const { playerId, setPlayerId } = usePlayerIdentity(id);

  // Fetch game data
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useGameSession(id);
  const { data: players = [], isLoading: isLoadingPlayers } = useGamePlayers(id);
  const { data: rounds = [] } = useGameRounds(id);

  // Get current round data
  const currentRound = rounds.find((r) => r.round_number === session?.current_round);

  // Fetch track details for current round
  const { data: currentTrack } = useTrack(currentRound?.track_id ?? null);

  // Mutations
  const buzz = useBuzz();
  const submitAnswer = useSubmitAnswer();

  // Game action executor
  const { executeAction, isActionLoading } = useGameExecutor({
    sessionId: id,
    mutations: {
      buzz,
      submitAnswer,
    },
    context: {
      playerId: playerId ?? undefined,
      currentRound: session?.current_round ?? undefined,
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
  }, [session?.current_round]);

  // Loading state
  if (isLoadingSession || isLoadingPlayers) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state - redirect to home
  if (sessionError || !session) {
    if (!isLoadingSession) {
      router.push("/");
    }
    return null;
  }

  // Get buzzer player
  const buzzerPlayer = currentRound?.buzzer_player_id
    ? players.find((p) => p.id === currentRound.buzzer_player_id)
    : null;

  // Render appropriate view based on game state
  if (session.state === 'finished') {
    return (
      <PlayerFinalScore
        players={players}
        rounds={rounds}
        currentPlayerId={playerId}
        onPlayAgain={() => router.push("/")}
      />
    );
  }

  if (session.state === 'lobby') {
    return (
      <PlayerLobby
        sessionId={id}
        hostName={session.host_name}
        players={players}
        currentPlayerId={playerId}
        onPlayerJoined={setPlayerId}
      />
    );
  }

  // Must have joined to play (lobby is OK without playerId)
  if (session.state !== 'lobby' && !playerId) {
    // Game is active but no player ID - shouldn't happen in normal flow
    return null;
  }

  // At this point, playerId must be non-null (checked above)
  return (
    <PlayerGameView
      session={session}
      players={players}
      currentPlayerId={playerId!}
      currentRound={currentRound}
      currentTrack={currentTrack}
      buzzerPlayer={buzzerPlayer}
      executeAction={executeAction}
      isActionLoading={isActionLoading}
      roundJudgment={
        currentRound?.buzzer_player_id === playerId && currentRound?.correct !== null && currentRound.buzzer_player_id !== null
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
}
