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
import { ActionButtonGroup } from "@/components/game/ActionButton";
import { AnswerInputForm } from "@/components/shared/AnswerInputForm";
import { Header } from "@/components/shared/Header";
import { UserDisplay, LogoutButton, EndGameButton } from "@/components/shared/UserInfo";
import { GameStateDisplay } from "./ui/GameStateDisplay";
import { PlayerScoreboard } from "./ui/PlayerScoreboard";
import { AnswerReviewPanel } from "./ui/AnswerReviewPanel";
import { RoundSummary } from "./ui/RoundSummary";
import { useGameActions } from "@/hooks/useGameActions";
import type { Tables } from "@/lib/types/database";
import type { UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer";
import type { GameAction } from "@/lib/game/state-machine";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;
type GameRound = Tables<'game_rounds'>;
type RoundAnswer = Tables<'round_answers'>;

interface GameData {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string; spotify_id: string; album_image_url?: string | null } | null;
  currentRound?: GameRound | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
}

interface GameActions {
  executeAction: (action: GameAction) => void;
  isActionLoading: (actionType: GameAction['type']) => boolean;
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
  spotifyPlayer: UseSpotifyPlayerReturn;
  soloMode?: SoloModeProps;
  textInputMode?: TextInputModeProps;
  onPrimeAudio?: () => Promise<void>;
}

export function HostGameController({
  gameData,
  gameActions,
  spotifyPlayer,
  soloMode,
  textInputMode,
  onPrimeAudio,
}: HostGameControllerProps) {
  const { session, players, currentTrack, currentRound, buzzerPlayer, elapsedSeconds } = gameData;
  const { executeAction, isActionLoading } = gameActions;

  // Local UI state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);
  const [judgmentOverrides, setJudgmentOverrides] = useState<Record<string, boolean>>({});
  const [lastPlayedRoundId, setLastPlayedRoundId] = useState<string | null>(null);
  const [autoPlayAttempts, setAutoPlayAttempts] = useState<number>(0);
  const maxAutoPlayAttempts = 3;

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

  // Store player functions in refs to avoid re-running effects when they change
  const playRef = useRef(play);
  const pauseRef = useRef(pause);
  useEffect(() => {
    playRef.current = play;
    pauseRef.current = pause;
  }, [play, pause]);

  // Detect solo mode
  const isSoloMode = players.length === 1 && players[0]?.is_host === true;
  const currentRoundNum = session.current_round || 0;
  const totalRounds = session.total_rounds;
  const state = session.state;

  // Get available actions from state machine
  const availableActions = useGameActions({
    role: 'host',
    session,
    players,
    currentRound,
    submittedAnswers: textInputMode?.submittedAnswers,
  });

  // Auto-play track when round starts
  useEffect(() => {
    const shouldAutoPlay =
      state === 'playing' &&
      currentRound?.id &&
      currentTrack?.spotify_id &&
      isReady &&
      lastPlayedRoundId !== currentRound.id;

    console.log('[HostGameController] Auto-play check:', {
      state,
      roundId: currentRound?.id,
      hasSpotifyId: !!currentTrack?.spotify_id,
      isReady,
      lastPlayedRoundId,
      shouldAutoPlay
    });

    if (shouldAutoPlay) {
      console.log('[HostGameController] Starting playback:', currentTrack.spotify_id);
      playRef.current(currentTrack.spotify_id)
        .then(() => {
          console.log('[HostGameController] Playback started successfully');
          setLastPlayedRoundId(currentRound.id);
        })
        .catch((err) => {
          console.error('[HostGameController] Failed to auto-play:', err);
        });
    }
  }, [state, currentRound?.id, currentTrack?.spotify_id, isReady, lastPlayedRoundId]);

  // Auto-pause when someone buzzes
  useEffect(() => {
    if (state === 'buzzed' && isPlaying) {
      pauseRef.current().catch(() => { });
    }
  }, [state, isPlaying]);


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

        {/* Header */}
        <Header
          title={`Round ${currentRoundNum} / ${totalRounds}`}
          rightContent={
            <>
              <UserDisplay />
              <Badge variant="secondary" className="text-md px-3 py-2">
                {isSoloMode ? 'Solo Mode' : 'Party Mode'}
                {session.enable_text_input_mode && ' + Text Input'}
                {soloMode && ' | Host Player'}
              </Badge>
              <EndGameButton
                onEndGame={() => executeAction({ type: 'end_game' })}
                isLoading={isActionLoading('end_game')}
              />
              <LogoutButton />
            </>
          }
        />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Round Control */}
            <Card>
              <CardContent className="space-y-4 pt-6">
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

                {/* GENERIC ACTION CONTROLS */}
                <ActionButtonGroup
                  actions={availableActions}
                  onAction={async (action) => {
                    // Prime audio for Safari before actions that start playback
                    if (action.type === 'advance_round' || action.type === 'start_game') {
                      await onPrimeAudio?.();
                    }

                    // Handle judgment overrides for finalize_judgments action
                    if (action.type === 'finalize_judgments') {
                      executeAction({
                        ...action,
                        overrides: action.overrides ?? judgmentOverrides,
                      });
                    } else {
                      executeAction(action);
                    }
                  }}
                  loadingAction={availableActions.find(a => isActionLoading(a.action.type))?.action.type}
                  layout="grid"
                  columns={2}
                  size="lg"
                  showDisabledReasons={true}
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black text-white p-2 text-xs z-50">
          <div>isReady: {String(isReady)}</div>
          <div>hasTrack: {String(!!playbackState?.track)}</div>
          <div>isPlaying: {String(isPlaying)}</div>
          <div>error: {spotifyError || 'none'}</div>
        </div>
      )}

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
