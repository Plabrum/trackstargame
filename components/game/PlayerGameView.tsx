/**
 * Player Game View (Action-Based Refactor)
 *
 * Displays the game state and uses PlayerActionsPanel for all controls.
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
import { PlayerActionsPanel } from "./PlayerActionsPanel";
import type { Tables } from "@/lib/types/database";
import type { RoundJudgment } from "@/hooks/usePlayer";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;
type GameRound = Tables<'game_rounds'>;

interface PlayerGameViewProps {
  session: GameSession;
  players: Player[];
  currentPlayerId: string;
  currentRound?: GameRound | null;
  currentTrack?: { title: string; artist: string } | null;
  buzzerPlayer?: Player | null;
  onBuzz: () => void;
  isBuzzing: boolean;
  lastJudgment?: RoundJudgment | null;

  // Text input mode props
  onSubmitAnswer?: (answer: string) => void;
  isSubmittingAnswer?: boolean;
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
  onBuzz,
  isBuzzing,
  lastJudgment,
  onSubmitAnswer,
  isSubmittingAnswer,
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
  const isTextInputMode = session.enable_text_input_mode ?? false;

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
        // Show answer submitted message for text input mode
        if (hasSubmittedAnswer && isTextInputMode) {
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
            <Alert className={`border-2 ${
              answerFeedback.isCorrect
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}>
              <AlertDescription>
                <div className="text-center py-6">
                  <p className={`text-4xl font-bold mb-2 ${
                    answerFeedback.isCorrect ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {answerFeedback.isCorrect ? '✓ CORRECT!' : '✗ INCORRECT'}
                  </p>
                  {!answerFeedback.isCorrect && (
                    <p className="text-lg text-red-700 mb-2">
                      It was: {answerFeedback.correctAnswer}
                    </p>
                  )}
                  <p className={`text-2xl font-semibold ${
                    answerFeedback.isCorrect ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {answerFeedback.pointsEarned > 0 ? '+' : ''}{answerFeedback.pointsEarned} points
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          );
        }

        // Default playing state message
        return (
          <div className="text-center mb-4">
            <Music className="h-12 w-12 mx-auto text-purple-500 animate-pulse" />
            <p className="text-lg font-semibold mt-2">Listening...</p>
            <p className="text-sm text-muted-foreground">
              {isTextInputMode
                ? "Type the artist/band name when you know it!"
                : "Buzz when you know the song!"}
            </p>
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
        return (
          <div className="space-y-4">
            {/* Judgment Feedback - Show if this player was judged */}
            {lastJudgment && lastJudgment.playerId === currentPlayerId && (
              <Alert className={`border-2 ${
                lastJudgment.correct
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}>
                <AlertDescription>
                  <div className="text-center py-6">
                    <p className={`text-4xl font-bold mb-2 ${
                      lastJudgment.correct ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {lastJudgment.correct ? '✓ CORRECT!' : '✗ INCORRECT'}
                    </p>
                    <p className={`text-2xl font-semibold ${
                      lastJudgment.correct ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {lastJudgment.pointsAwarded > 0 ? '+' : ''}{lastJudgment.pointsAwarded} points
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {currentTrack && (
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Song Revealed</p>
                <p className="text-2xl font-bold">{currentTrack.title}</p>
                <p className="text-xl text-muted-foreground">{currentTrack.artist}</p>
              </div>
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
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Round {currentRoundNum} / {totalRounds}</h1>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline">
            Your Score: <AnimatedScore score={currentPlayer?.score ?? 0} />
          </Badge>
          <Badge variant="secondary">
            Rank: #{currentPlayerRank}
          </Badge>
        </div>
      </div>

      {/* Main Game Area */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* State Information Display */}
            {renderStateInfo()}

            {/* ACTION-BASED CONTROLS */}
            {onSubmitAnswer && (
              <PlayerActionsPanel
                session={session}
                players={players}
                playerId={currentPlayerId}
                currentRound={currentRound}
                onBuzz={onBuzz}
                onSubmitAnswer={onSubmitAnswer}
                isBuzzing={isBuzzing}
                isSubmittingAnswer={isSubmittingAnswer}
                hasSubmittedAnswer={hasSubmittedAnswer}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentPlayer
                      ? 'bg-purple-100 border-2 border-purple-300'
                      : index === 0
                      ? 'bg-gradient-to-r from-yellow-100 to-yellow-50'
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                        isCurrentPlayer
                          ? 'bg-purple-500 text-white'
                          : index === 0
                          ? 'bg-yellow-400 text-yellow-900'
                          : index === 1
                          ? 'bg-slate-300 text-slate-700'
                          : index === 2
                          ? 'bg-orange-300 text-orange-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <span className={`font-medium ${isCurrentPlayer ? 'font-bold' : ''}`}>
                        {player.name}
                        {isCurrentPlayer && (
                          <span className="ml-2 text-sm text-purple-600">(You)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className={`font-bold ${isCurrentPlayer ? 'text-purple-600' : ''}`}>
                    <AnimatedScore score={player.score ?? 0} />
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
