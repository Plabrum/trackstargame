"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, Zap, Send } from "lucide-react";
import { BuzzAnimation } from "./BuzzAnimation";
import { AnimatedScore } from "./ScoreAnimation";
import type { Tables } from "@/lib/types/database";

type RoundJudgment = {
  playerId: string;
  correct: boolean;
  pointsAwarded: number;
};

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface PlayerGameViewProps {
  session: GameSession;
  players: Player[];
  currentPlayerId: string;
  currentTrack?: { title: string; artist: string } | null;
  buzzerPlayer?: Player | null;
  onBuzz: () => void;
  isBuzzing: boolean;
  canBuzz: boolean;
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
  currentTrack,
  buzzerPlayer,
  onBuzz,
  isBuzzing,
  canBuzz,
  lastJudgment,
  onSubmitAnswer,
  isSubmittingAnswer,
  hasSubmittedAnswer,
  answerFeedback,
}: PlayerGameViewProps) {
  const currentRound = session.current_round || 0;
  const totalRounds = 10;
  const state = session.state;

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const currentPlayerRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  const hasBuzzed = buzzerPlayer?.id === currentPlayerId;
  const isTextInputMode = session.enable_text_input_mode ?? false;

  // Buzz animation state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);

  // Answer input state (text input mode)
  const [answer, setAnswer] = useState('');

  // Trigger buzz animation when state changes to buzzed
  useEffect(() => {
    if (state === 'buzzed' && buzzerPlayer) {
      setShowBuzzAnimation(true);
    } else {
      setShowBuzzAnimation(false);
    }
  }, [state, buzzerPlayer]);

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
        <h1 className="text-3xl font-bold">Round {currentRound} / {totalRounds}</h1>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline">
            Your Score: <AnimatedScore score={currentPlayer?.score ?? 0} />
          </Badge>
          <Badge variant="secondary">
            Rank: #{currentPlayerRank}
          </Badge>
        </div>
      </div>

      {/* Buzz Button */}
      <Card className="border-2">
        <CardContent className="pt-6">
          {/* Playing State - Show Buzz Button or Text Input */}
          {state === 'playing' && !hasSubmittedAnswer && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Music className="h-12 w-12 mx-auto text-purple-500 animate-pulse" />
                <p className="text-lg font-semibold mt-2">Listening...</p>
                <p className="text-sm text-muted-foreground">
                  {isTextInputMode
                    ? "Type the artist/band name when you know it!"
                    : "Buzz when you know the song!"}
                </p>
              </div>

              {isTextInputMode ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (answer.trim() && onSubmitAnswer) {
                      onSubmitAnswer(answer.trim());
                      setAnswer('');
                    }
                  }}
                  className="space-y-3"
                >
                  <Input
                    type="text"
                    placeholder="Enter artist/band name..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isSubmittingAnswer}
                    className="text-lg h-14"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-xl font-bold"
                    disabled={!answer.trim() || isSubmittingAnswer}
                  >
                    {isSubmittingAnswer ? (
                      "SUBMITTING..."
                    ) : (
                      <>
                        <Send className="h-6 w-6 mr-2" />
                        SUBMIT ANSWER
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-32 text-3xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-transform"
                  onClick={onBuzz}
                  disabled={!canBuzz || isBuzzing}
                >
                  {isBuzzing ? (
                    "BUZZING..."
                  ) : (
                    <>
                      <Zap className="h-10 w-10 mr-3" />
                      BUZZ!
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Playing State - Answer Submitted (Text Input Mode) */}
          {state === 'playing' && hasSubmittedAnswer && isTextInputMode && (
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
          )}

          {/* Submitted State - Show feedback for single player */}
          {state === 'playing' && answerFeedback && (
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
          )}

          {/* Buzzed State */}
          {state === 'buzzed' && buzzerPlayer && (
            <div className="text-center space-y-4">
              {hasBuzzed ? (
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
              ) : (
                <Alert>
                  <AlertDescription>
                    <div className="text-center py-4">
                      <p className="text-xl font-bold">{buzzerPlayer.name} buzzed first!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Waiting for host to judge...
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Reveal State */}
          {state === 'reveal' && currentTrack && (
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

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Song Revealed</p>
                <p className="text-2xl font-bold">{currentTrack.title}</p>
                <p className="text-xl text-muted-foreground">{currentTrack.artist}</p>
              </div>

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
          )}
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
