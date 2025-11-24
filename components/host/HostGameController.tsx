/**
 * Host Game Controller
 *
 * Unified component that handles:
 * - Spotify auto-play/pause integration
 * - Game UI rendering and coordination
 * - Local UI state management (buzz animations, judgment overrides)
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, AlertTriangle } from "lucide-react";
import { BuzzAnimation } from "@/components/game/BuzzAnimation";
import { SpotifyPlaybackControls } from "./SpotifyPlaybackControls";
import { HostActionsPanel } from "./HostActionsPanel";
import { AnswerInputForm } from "@/components/shared/AnswerInputForm";
import { Header } from "@/components/shared/Header";
import { UserInfo } from "@/components/shared/UserInfo";
import { GameStateDisplay } from "./ui/GameStateDisplay";
import { PlayerScoreboard } from "./ui/PlayerScoreboard";
import { AnswerReviewPanel } from "./ui/AnswerReviewPanel";
import { RoundSummary } from "./ui/RoundSummary";
import type { Tables } from "@/lib/types/database";
import type { UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;
type GameRound = Tables<'game_rounds'>;
type RoundAnswer = Tables<'round_answers'>;

interface GameData {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string; spotify_id: string } | null;
  currentRound?: GameRound | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
}

interface GameActions {
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
  onNextRound: () => void;
  onRevealTrack: () => void;
  onEndGame: () => void;
}

interface LoadingStates {
  isJudging: boolean;
  isAdvancing: boolean;
  isRevealing: boolean;
  isEndingGame: boolean;
}

interface SoloModeProps {
  hostPlayerId: string;
  onSubmitAnswer: (answer: string) => void;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  answerFeedback?: {
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  } | null;
}

interface TextInputModeProps {
  submittedAnswers: RoundAnswer[];
  onFinalizeJudgment: (overrides?: Record<string, boolean>) => void;
  isFinalizing: boolean;
}

interface HostGameControllerProps {
  gameData: GameData;
  gameActions: GameActions;
  loadingStates: LoadingStates;
  spotifyPlayer: UseSpotifyPlayerReturn;
  playerError: string | null;
  soloMode?: SoloModeProps;
  textInputMode?: TextInputModeProps;
}

export function HostGameController({
  gameData,
  gameActions,
  loadingStates,
  spotifyPlayer,
  playerError,
  soloMode,
  textInputMode,
}: HostGameControllerProps) {
  const { session, players, currentTrack, currentRound, buzzerPlayer, elapsedSeconds } = gameData;
  const { onJudgeCorrect, onJudgeIncorrect, onNextRound, onRevealTrack, onEndGame } = gameActions;
  const { isJudging, isAdvancing, isRevealing, isEndingGame } = loadingStates;

  const hasStartedPlayingRef = useRef(false);

  // Local UI state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);
  const [judgmentOverrides, setJudgmentOverrides] = useState<Record<string, boolean>>({});

  // Destructure Spotify player
  const {
    isReady,
    isPlaying,
    playbackState,
    error: spotifyError,
    play,
    pause,
    resume,
    setVolume,
  } = spotifyPlayer;

  // Detect solo mode
  const isSoloMode = players.length === 1 && players[0]?.is_host === true;
  const currentRoundNum = session.current_round || 0;
  const totalRounds = session.total_rounds;
  const state = session.state;

  // Auto-play track when round starts
  useEffect(() => {
    if (
      state === 'playing' &&
      currentTrack?.spotify_id &&
      isReady &&
      !hasStartedPlayingRef.current
    ) {
      console.log('[HostGameController] Auto-playing track:', currentTrack.spotify_id);
      play(currentTrack.spotify_id)
        .then(() => {
          console.log('[HostGameController] Track started playing successfully');
          hasStartedPlayingRef.current = true;
        })
        .catch((err) => {
          console.error('[HostGameController] Failed to auto-play:', err);
        });
    }
  }, [state, currentTrack?.spotify_id, isReady, play]);

  // Auto-pause when someone buzzes
  useEffect(() => {
    if (state === 'buzzed' && isPlaying) {
      pause().catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to pause:', err);
        }
      });
    }
  }, [state, isPlaying, pause]);

  // Reset playing flag when state changes away from playing or when round changes
  useEffect(() => {
    if (state !== 'playing') {
      hasStartedPlayingRef.current = false;
    }
  }, [state]);

  // Trigger buzz animation when state changes to buzzed
  useEffect(() => {
    if (state === 'buzzed' && buzzerPlayer) {
      setShowBuzzAnimation(true);
    } else {
      setShowBuzzAnimation(false);
    }
  }, [state, buzzerPlayer]);

  return (
    <>
      <div className="container mx-auto p-6 max-w-6xl space-y-6 pb-32">
        {/* Buzz Animation Overlay */}
        <BuzzAnimation
          show={showBuzzAnimation}
          playerName={buzzerPlayer?.name}
          isCorrect={null}
        />

        {/* Spotify Player Status */}
        {!isReady && (
          <Alert>
            <Music className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Initializing Spotify player... This may take a few seconds.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {(playerError || spotifyError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {playerError || spotifyError}
              <br />
              <span className="text-sm">
                Try refreshing the page or signing in again. Spotify Premium may be required for full playback.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <Header
          title={`Round ${currentRoundNum} / ${totalRounds}`}
          rightContent={
            <>
              <UserInfo />
              <Badge variant="secondary" className="text-md px-3 py-2">
                {isSoloMode ? 'Solo Mode' : 'Party Mode'}
                {session.enable_text_input_mode && ' + Text Input'}
                {soloMode && ' | Host Player'}
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
                  <GameStateDisplay
                    state={state}
                    buzzerPlayer={buzzerPlayer}
                    elapsedSeconds={elapsedSeconds}
                    currentTrack={currentTrack}
                    playbackState={playbackState}
                    answerFeedback={
                      soloMode?.answerFeedback
                        ? {
                          isCorrect: soloMode.answerFeedback.isCorrect,
                          pointsEarned: soloMode.answerFeedback.pointsEarned,
                        }
                        : undefined
                    }
                    isSoloMode={isSoloMode}
                    hasSubmittedAnswer={soloMode?.hasSubmitted}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Host Text Input (Solo or Party Mode) */}
                {state === 'playing' &&
                  soloMode &&
                  session.enable_text_input_mode &&
                  !soloMode.hasSubmitted &&
                  !soloMode.answerFeedback && (
                    <AnswerInputForm
                      onSubmit={soloMode.onSubmitAnswer}
                      isSubmitting={soloMode.isSubmitting}
                    />
                  )}

                {/* Answer Review (Text Input Mode) */}
                {state === 'submitted' && textInputMode?.submittedAnswers && (
                  <AnswerReviewPanel
                    submittedAnswers={textInputMode.submittedAnswers}
                    players={players}
                    judgmentOverrides={judgmentOverrides}
                    onToggleOverride={(playerId, isCorrect) => {
                      setJudgmentOverrides(prev => ({
                        ...prev,
                        [playerId]: isCorrect,
                      }));
                    }}
                  />
                )}

                {/* ACTION-BASED CONTROLS */}
                <HostActionsPanel
                  session={session}
                  players={players}
                  currentRound={currentRound}
                  submittedAnswers={textInputMode?.submittedAnswers}
                  onStartGame={() => { }}
                  onJudgeAnswer={(correct) => {
                    correct ? onJudgeCorrect() : onJudgeIncorrect();
                  }}
                  onAdvanceRound={onNextRound}
                  onRevealAnswer={onRevealTrack}
                  onEndGame={onEndGame}
                  onUpdateSettings={() => { }}
                  onFinalizeJudgments={(overrides) =>
                    textInputMode?.onFinalizeJudgment(overrides ?? judgmentOverrides)
                  }
                  isJudging={isJudging}
                  isAdvancing={isAdvancing}
                  isRevealing={isRevealing}
                  isEndingGame={isEndingGame}
                  isFinalizing={textInputMode?.isFinalizing}
                />
              </CardContent>
            </Card>

            {/* Round Summary (when revealed) */}
            {state === 'reveal' && buzzerPlayer && elapsedSeconds !== null && elapsedSeconds !== undefined && (
              <RoundSummary buzzerPlayer={buzzerPlayer} elapsedSeconds={elapsedSeconds} />
            )}
          </div>

          {/* Score Display */}
          <div>
            <PlayerScoreboard players={players} isSoloMode={isSoloMode} />
          </div>
        </div>
      </div>

      {/* Spotify Playback Controls - Sticky Bottom */}
      {isReady && playbackState?.track && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto max-w-6xl p-4">
            <SpotifyPlaybackControls
              playbackState={playbackState}
              onPlayPause={() => {
                if (isPlaying) {
                  pause();
                } else {
                  resume();
                }
              }}
              onVolumeChange={setVolume}
              showControls={true}
              hideTrackDetails={session.allow_host_to_play}
            />
          </div>
        </div>
      )}
    </>
  );
}
