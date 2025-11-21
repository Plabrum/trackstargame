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
import { AnimatedScore } from "@/components/game/ScoreAnimation";
import { SpotifyPlaybackControls } from "./SpotifyPlaybackControls";
import { HostActionsPanel } from "./HostActionsPanel";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { AnswerInputForm } from "@/components/shared/AnswerInputForm";
import { Header } from "@/components/shared/Header";
import { UserInfo } from "@/components/shared/UserInfo";
import { TrackReveal } from "@/components/game/TrackReveal";
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

  // Solo mode detection and host player
  const isSoloMode = players.length === 1 && players[0]?.is_host === true;
  const hostPlayer = players.find(p => p.is_host);

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
        if (hostPlayerId && session.enable_text_input_mode && hasSubmittedAnswer) {
          return (
            <Alert>
              <AlertDescription className="text-center py-4">
                <p className="text-xl font-bold">Answer submitted!</p>
                <p className="text-sm text-muted-foreground mt-2">{isSoloMode ? 'Processing your answer...' : 'Waiting for other players...'}</p>
              </AlertDescription>
            </Alert>
          );
        }
        return null;

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
        if (currentTrack) {
          return (
            <TrackReveal
              trackTitle={currentTrack.title}
              artistName={currentTrack.artist}
              albumArt={playbackState?.track?.albumArt}
              answerFeedback={
                answerFeedback
                  ? {
                    isCorrect: answerFeedback.isCorrect,
                    pointsEarned: answerFeedback.pointsEarned,
                  }
                  : undefined
              }
            />
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
    <>
      <div className="container mx-auto p-6 max-w-6xl space-y-6 pb-32">
        {/* Buzz Animation Overlay */}
        <BuzzAnimation
          show={showBuzzAnimation}
          playerName={buzzerPlayer?.name}
          isCorrect={null}
        />

        {/* Header */}
        <Header
          title={`Round ${currentRoundNum} / ${totalRounds}`}
          rightContent={
            <>
              <UserInfo />
              <Badge variant="secondary" className="text-md px-3 py-2">
                {isSoloMode ? 'Solo Mode' : 'Party Mode'}
                {session.enable_text_input_mode && ' + Text Input'}
                {hostPlayerId && ' | Host Player'}
              </Badge>
            </>
          }
        />


        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Round Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <Badge variant="outline" className="text-md px-3 py-2">
                    {getStateLabel()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* State Information Display */}
                {renderStateInfo()}

                {/* Host Text Input (Solo or Party Mode) */}
                {state === 'playing' &&
                  hostPlayerId &&
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
                        <Card key={answer.id} className={`${finalJudgment
                          ? 'border-green-300 bg-green-50'
                          : 'border-red-300 bg-red-50'
                          }`}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-bold text-gray-900">{player?.name}</p>
                                <p className="text-sm text-gray-700">
                                  Answer: <span className="font-medium text-gray-900">{answer.submitted_answer}</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
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
                  onStartGame={() => { }}
                  onJudgeAnswer={(correct) => {
                    correct ? onJudgeCorrect() : onJudgeIncorrect();
                  }}
                  onAdvanceRound={onNextRound}
                  onRevealAnswer={() => onRevealTrack?.()}
                  onEndGame={() => onEndGame?.()}
                  onUpdateSettings={() => { }}
                  onFinalizeJudgments={(overrides) => onFinalizeJudgment?.(overrides ?? judgmentOverrides)}
                  isJudging={isJudging}
                  isAdvancing={isAdvancing}
                  isRevealing={isRevealing}
                  isEndingGame={isEndingGame}
                  isFinalizing={isFinalizing}
                />
              </CardContent>
            </Card>

            {/* Round Summary (when revealed) */}
            {state === 'reveal' && buzzerPlayer && (
              <Card>
                <CardHeader>
                  <CardTitle>Round Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
                      <span className="text-muted-foreground">First Buzz</span>
                      <span className="font-semibold">{buzzerPlayer.name}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-semibold">{elapsedSeconds?.toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card border border-border rounded">
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

          {/* Score Display - conditional based on player count */}
          <div>
            {isSoloMode ? (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Current Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-6xl font-bold text-orange">
                      <AnimatedScore score={hostPlayer?.score ?? 0} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Leaderboard
                players={players}
                variant="host"
                className="sticky top-6"
              />
            )}
          </div>
        </div>
      </div>

      {/* Spotify Playback Controls - Sticky Bottom */}
      {isSpotifyReady && playbackState?.track && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto max-w-6xl p-4">
            <SpotifyPlaybackControls
              playbackState={playbackState}
              onPlayPause={onPlayPause}
              onVolumeChange={onVolumeChange}
              showControls={true}
              hideTrackDetails={session.allow_host_to_play}
            />
          </div>
        </div>
      )}
    </>
  );
}
