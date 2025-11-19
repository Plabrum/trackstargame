/**
 * Host Game View (Action-Based Refactor)
 *
 * Displays the game state and uses HostActionsPanel for all controls.
 * All game logic is driven by the state machine.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, CheckCircle2, XCircle } from "lucide-react";
import { BuzzAnimation } from "@/components/game/BuzzAnimation";
import { SpotifyPlaybackControls } from "./SpotifyPlaybackControls";
import { HostActionsPanel } from "./HostActionsPanel";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { AnswerInputForm } from "@/components/shared/AnswerInputForm";
import type { Tables } from "@/lib/types/database";
import type { SpotifyPlayerState } from "@/lib/audio/spotify-player";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;
type GameRound = Tables<'game_rounds'>;
type RoundAnswer = Tables<'round_answers'>;

interface HostGameViewProps {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string } | null;
  currentRound?: GameRound | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;

  // Action handlers
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
  onNextRound: () => void;
  onRevealTrack?: () => void;
  onEndGame?: () => void;

  // Loading states
  isJudging: boolean;
  isAdvancing: boolean;
  isRevealing?: boolean;
  isEndingGame?: boolean;

  // Spotify playback controls
  playbackState?: SpotifyPlayerState | null;
  onPlayPause?: () => void;
  onVolumeChange?: (volume: number) => void;
  isSpotifyReady?: boolean;

  // Text input mode props
  submittedAnswers?: RoundAnswer[];
  onFinalizeJudgment?: (overrides?: Record<string, boolean>) => void;
  isFinalizing?: boolean;

  // Solo mode player controls
  hostPlayerId?: string;
  onSubmitAnswer?: (answer: string) => void;
  isSubmittingAnswer?: boolean;
  hasSubmittedAnswer?: boolean;
  answerFeedback?: {
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null;
}

export function HostGameView({
  session,
  players,
  currentTrack,
  currentRound,
  buzzerPlayer,
  elapsedSeconds,
  onJudgeCorrect,
  onJudgeIncorrect,
  onNextRound,
  onRevealTrack,
  onEndGame,
  isJudging,
  isAdvancing,
  isRevealing,
  isEndingGame,
  playbackState,
  onPlayPause,
  onVolumeChange,
  isSpotifyReady,
  submittedAnswers,
  onFinalizeJudgment,
  isFinalizing,
  hostPlayerId,
  onSubmitAnswer,
  isSubmittingAnswer,
  hasSubmittedAnswer,
  answerFeedback,
}: HostGameViewProps) {
  const currentRoundNum = session.current_round || 0;
  const totalRounds = session.total_rounds;
  const state = session.state;

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Buzz animation state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);

  // Answer judgment overrides (for text input mode)
  const [judgmentOverrides, setJudgmentOverrides] = useState<Record<string, boolean>>({});

  // Trigger buzz animation when state changes to buzzed
  useEffect(() => {
    if (state === 'buzzed' && buzzerPlayer) {
      setShowBuzzAnimation(true);
    } else {
      setShowBuzzAnimation(false);
    }
  }, [state, buzzerPlayer]);

  // Get state label for badge
  const getStateLabel = () => {
    switch (state) {
      case 'playing': return 'Playing';
      case 'buzzed': return 'Buzzed!';
      case 'submitted': return 'Answers Submitted';
      case 'reveal': return 'Revealed';
      default: return state;
    }
  };

  // Get state-specific information display
  const renderStateInfo = () => {
    switch (state) {
      case 'playing':
        if (session.allow_single_user && session.enable_text_input_mode && hasSubmittedAnswer) {
          return (
            <Alert>
              <AlertDescription className="text-center py-4">
                <p className="text-xl font-bold">Answer submitted!</p>
                <p className="text-sm text-muted-foreground mt-2">Processing your answer...</p>
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <Alert>
            <AlertDescription className="text-center py-4">
              <p className="text-lg font-semibold">Music is playing...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {session.enable_text_input_mode
                  ? session.allow_single_user
                    ? "Type the artist/band name when you know it!"
                    : "Waiting for players to submit answers"
                  : "Waiting for a player to buzz in"}
              </p>
            </AlertDescription>
          </Alert>
        );

      case 'buzzed':
        return (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertDescription>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-yellow-900">{buzzerPlayer?.name} buzzed!</p>
                <p className="text-lg text-yellow-700 mt-1">
                  Time: {elapsedSeconds?.toFixed(2)}s
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'submitted':
        return (
          <Alert className="border-blue-500 bg-blue-50">
            <AlertDescription>
              <div className="text-center py-2">
                <p className="text-xl font-bold text-blue-900">All answers submitted!</p>
                <p className="text-sm text-blue-700 mt-1">
                  Review answers below and override if needed
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'reveal':
        if (session.allow_single_user && session.enable_text_input_mode && answerFeedback) {
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

        if (currentTrack) {
          return (
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Track Revealed</p>
              <p className="text-2xl font-bold">{currentTrack.title}</p>
              <p className="text-xl text-muted-foreground">{currentTrack.artist}</p>
            </div>
          );
        }

        return (
          <Alert>
            <AlertDescription className="text-center py-4">
              <p className="text-lg font-semibold">Round Complete</p>
              <p className="text-sm text-muted-foreground mt-2">Ready for next round</p>
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Buzz Animation Overlay */}
      <BuzzAnimation
        show={showBuzzAnimation}
        playerName={buzzerPlayer?.name}
        isCorrect={null}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Round {currentRoundNum} / {totalRounds}</h1>
          <p className="text-muted-foreground">Host Controls</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {session.allow_single_user ? 'Solo Mode' : 'Party Mode'}
            {session.enable_text_input_mode && ' + Text Input'}
            {hostPlayerId && ' | Host Player: ✓'}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {getStateLabel()}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Round Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Round Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* State Information Display */}
              {renderStateInfo()}

              {/* Solo Mode Text Input */}
              {state === 'playing' &&
               session.allow_single_user &&
               session.enable_text_input_mode &&
               !hasSubmittedAnswer &&
               !answerFeedback &&
               onSubmitAnswer && (
                <AnswerInputForm
                  onSubmit={onSubmitAnswer}
                  isSubmitting={isSubmittingAnswer ?? false}
                />
              )}

              {/* Answer Review (Text Input Mode) */}
              {state === 'submitted' && submittedAnswers && submittedAnswers.length > 0 && (
                <div className="space-y-2">
                  {submittedAnswers.map((answer) => {
                    const player = players.find(p => p.id === answer.player_id);
                    const finalJudgment = judgmentOverrides[answer.player_id] ?? answer.auto_validated;

                    return (
                      <Card key={answer.id} className={`${
                        finalJudgment
                          ? 'border-green-300 bg-green-50'
                          : 'border-red-300 bg-red-50'
                      }`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-bold">{player?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Answer: <span className="font-medium text-foreground">{answer.submitted_answer}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Auto-validated: {answer.auto_validated ? '✓ Correct' : '✗ Incorrect'}
                                {(answer.points_awarded ?? 0) > 0 && ` (+${answer.points_awarded} pts)`}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={finalJudgment ? "default" : "outline"}
                                className={finalJudgment ? "bg-green-600 hover:bg-green-700" : ""}
                                onClick={() => setJudgmentOverrides(prev => ({
                                  ...prev,
                                  [answer.player_id]: true
                                }))}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={!finalJudgment ? "destructive" : "outline"}
                                onClick={() => setJudgmentOverrides(prev => ({
                                  ...prev,
                                  [answer.player_id]: false
                                }))}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* ACTION-BASED CONTROLS */}
              <HostActionsPanel
                session={session}
                players={players}
                currentRound={currentRound}
                submittedAnswers={submittedAnswers}
                onStartGame={() => {}}
                onJudgeAnswer={(correct) => {
                  correct ? onJudgeCorrect() : onJudgeIncorrect();
                }}
                onAdvanceRound={onNextRound}
                onRevealAnswer={() => onRevealTrack?.()}
                onEndGame={() => onEndGame?.()}
                onUpdateSettings={() => {}}
                onFinalizeJudgments={(overrides) => onFinalizeJudgment?.(overrides ?? judgmentOverrides)}
                isJudging={isJudging}
                isAdvancing={isAdvancing}
                isRevealing={isRevealing}
                isEndingGame={isEndingGame}
                isFinalizing={isFinalizing}
              />
            </CardContent>
          </Card>

          {/* Spotify Playback Controls */}
          {isSpotifyReady && playbackState?.track && (
            <SpotifyPlaybackControls
              playbackState={playbackState}
              onPlayPause={onPlayPause}
              onVolumeChange={onVolumeChange}
              showControls={true}
              hideTrackDetails={session.allow_host_to_play}
            />
          )}

          {/* Round Summary (when revealed) */}
          {state === 'reveal' && buzzerPlayer && (
            <Card>
              <CardHeader>
                <CardTitle>Round Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">First Buzz</span>
                    <span className="font-semibold">{buzzerPlayer.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold">{elapsedSeconds?.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-semibold">
                      {Math.max(1, Math.round((30 - (elapsedSeconds || 0)) * 10) / 10)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <Leaderboard
            players={players}
            variant="host"
            className="sticky top-6"
          />
        </div>
      </div>
    </div>
  );
}
