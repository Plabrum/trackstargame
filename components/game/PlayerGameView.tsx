/**
 * Player Game View (Action-Based Refactor)
 *
 * Displays the game state and uses generic actions from state machine.
 * All game logic is driven by the state machine.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music } from "lucide-react";
import { BuzzAnimation } from "./BuzzAnimation";
import { AnimatedScore } from "./ScoreAnimation";
import { ActionButtonGroup, ActionButton } from "./ActionButton";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { RoundTimer } from "./RoundTimer";
import { TrackReveal } from "./TrackReveal";
import { Header } from "@/components/shared/Header";
import { AnswerInputForm } from "@/components/shared/AnswerInputForm";
import { useGameActions } from "@/hooks/useGameActions";
import type { Tables } from "@/lib/types/database";
import type { GameAction } from "@/lib/game/state-machine";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type RoundJudgment = {
  playerId: string;
  correct: boolean;
  pointsAwarded: number;
};

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;
type GameRound = Tables<'game_rounds'>;

interface PlayerGameViewProps {
  session: GameSession;
  players: Player[];
  currentPlayerId: string;
  currentRound?: GameRound | null;
  currentTrack?: { title: string; artist: string; album_image_url?: string | null; spotify_id?: string | null } | null;
  buzzerPlayer?: Player | null;
  executeAction: (action: GameAction) => void;
  isActionLoading: (actionType: GameAction['type']) => boolean;
  roundJudgment?: RoundJudgment | null;

  // Text input mode props
  hasSubmittedAnswer?: boolean;
  answerFeedback?: {
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null;
}

export function PlayerGameView({
  session,
  players,
  currentPlayerId,
  currentRound,
  currentTrack,
  buzzerPlayer,
  executeAction,
  isActionLoading,
  roundJudgment,
  hasSubmittedAnswer,
  answerFeedback,
}: PlayerGameViewProps) {
  const currentRoundNum = session.current_round || 0;
  const totalRounds = session.total_rounds;
  const state = session.state;

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const currentPlayerRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  const hasBuzzed = buzzerPlayer?.id === currentPlayerId;
  const isSinglePlayer = players.length === 1;

  // Get available actions from state machine
  const availableActions = useGameActions({
    role: 'player',
    session,
    players,
    currentRound,
    playerId: currentPlayerId,
  });

  // Buzz animation state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);

  // Trigger buzz animation when state changes to buzzed
  useEffect(() => {
    if (state === 'buzzed' && buzzerPlayer) {
      setShowBuzzAnimation(true);
    } else {
      setShowBuzzAnimation(false);
    }
  }, [state, buzzerPlayer]);

  // Get state-specific information display
  const renderStateInfo = () => {
    switch (state) {
      case 'playing':
        // Show answer submitted message
        if (hasSubmittedAnswer) {
          return (
            <Alert>
              <AlertDescription>
                <div className="text-center py-4">
                  <p className="text-xl font-bold">Answer submitted!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Waiting for other players...
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          );
        }

        // Show feedback for single player mode
        if (answerFeedback) {
          return (
            <Alert className={`border-2 ${answerFeedback.isCorrect
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
              }`}>
              <AlertDescription>
                <div className="text-center py-6">
                  <p className={`text-4xl font-bold mb-2 ${answerFeedback.isCorrect ? 'text-green-900' : 'text-red-900'
                    }`}>
                    {answerFeedback.isCorrect ? '✓ CORRECT!' : '✗ INCORRECT'}
                  </p>
                  {!answerFeedback.isCorrect && (
                    <p className="text-lg text-red-700 mb-2">
                      It was: {answerFeedback.correctAnswer}
                    </p>
                  )}
                  <p className={`text-2xl font-semibold ${answerFeedback.isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}>
                    {answerFeedback.pointsEarned > 0 ? '+' : ''}{answerFeedback.pointsEarned} points
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          );
        }

        // Default playing state message - show timer for both modes
        return (
          <div className="space-y-4">
            <RoundTimer startedAt={session.round_start_time ?? null} maxSeconds={30} />
          </div>
        );

      case 'buzzed':
        if (hasBuzzed) {
          return (
            <Alert className="border-green-500 bg-green-50">
              <AlertDescription>
                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-green-900">You buzzed first!</p>
                  <p className="text-sm text-green-700 mt-2">
                    Waiting for host to judge your answer...
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <Alert>
            <AlertDescription>
              <div className="text-center py-4">
                <p className="text-xl font-bold">{buzzerPlayer?.name} buzzed first!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for host to judge...
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'submitted':
        return (
          <Alert>
            <AlertDescription>
              <div className="text-center py-4">
                <p className="text-xl font-bold">Answers submitted!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for host to review...
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'reveal':
        // Determine feedback to show in TrackReveal
        let feedbackForReveal = undefined;

        // For single player mode, use answerFeedback
        if (answerFeedback && isSinglePlayer) {
          feedbackForReveal = {
            isCorrect: answerFeedback.isCorrect,
            pointsEarned: answerFeedback.pointsEarned,
          };
        }
        // For multiplayer with judgment, use roundJudgment if it's for current player
        else if (roundJudgment && roundJudgment.playerId === currentPlayerId) {
          feedbackForReveal = {
            isCorrect: roundJudgment.correct,
            pointsEarned: roundJudgment.pointsAwarded,
          };
        }

        return (
          <div className="space-y-4">
            {currentTrack && (
              <TrackReveal
                trackTitle={currentTrack.title}
                artistName={currentTrack.artist}
                albumArt={currentTrack.album_image_url}
                spotifyId={currentTrack.spotify_id}
                answerFeedback={feedbackForReveal}
              />
            )}

            {buzzerPlayer && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {hasBuzzed ? "You" : buzzerPlayer.name} buzzed first
                </p>
              </div>
            )}

            <Alert>
              <AlertDescription className="text-center">
                Waiting for next round...
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* Buzz Animation Overlay */}
      <BuzzAnimation
        show={showBuzzAnimation}
        playerName={buzzerPlayer?.name}
        isCorrect={null}
      />

      {/* Header */}
      <Header title={`Round ${currentRoundNum} / ${totalRounds}`} />

      {/* Player Stats */}
      <div className="flex items-center justify-center gap-4">
        <Badge variant="outline">
          Your Score: <AnimatedScore score={currentPlayer?.score ?? 0} />
        </Badge>
        <Badge variant="secondary">
          Rank: #{currentPlayerRank}
        </Badge>
      </div>

      {/* Main Game Area */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* State Information Display */}
            {renderStateInfo()}

            {/* GENERIC ACTION CONTROLS */}
            <ActionButtonGroup
              actions={availableActions}
              onAction={executeAction}
              loadingAction={availableActions.find(a => isActionLoading(a.action.type))?.action.type}
              layout="flex"
              size="lg"
              showDisabledReasons={true}
              customRenderers={{
                // Custom buzz button - big, orange, emphasised
                buzz: (actionDesc, isLoading) => (
                  <Button
                    size="lg"
                    className="w-full h-32 text-3xl font-bold bg-orange hover:bg-orange/90 active:scale-95 transition-transform"
                    onClick={() => executeAction(actionDesc.action)}
                    disabled={!actionDesc.enabled || isLoading}
                  >
                    {isLoading ? (
                      "BUZZING..."
                    ) : (
                      <>
                        <Zap className="h-10 w-10 mr-3" />
                        BUZZ IN!
                      </>
                    )}
                  </Button>
                ),
                // Custom submit answer form - input field instead of button
                submit_answer: (actionDesc, isLoading) => (
                  !hasSubmittedAnswer ? (
                    <AnswerInputForm
                      onSubmit={(answer) => executeAction({ type: 'submit_answer', answer })}
                      isSubmitting={isLoading}
                      disabled={!actionDesc.enabled}
                    />
                  ) : null
                ),
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Score Display - conditional based on player count */}
      {isSinglePlayer ? (
        <Card>
          <CardHeader>
            <CardTitle>Current Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-6xl font-bold text-orange">
                <AnimatedScore score={currentPlayer?.score ?? 0} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Keep going! 🎵
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Leaderboard
          players={players}
          currentPlayerId={currentPlayerId}
          variant="live"
          animateScores={true}
        />
      )}
    </div>
  );
}
