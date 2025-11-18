/**
 * Host Game Controller
 *
 * Wraps HostGameView with Spotify Web Playback SDK integration.
 * Handles audio playback, timing, and synchronization with game state.
 */

"use client";

import { useEffect, useRef } from "react";
import { HostGameView } from "./HostGameView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, AlertTriangle } from "lucide-react";
import type { Tables } from "@/lib/types/database";
import type { UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface HostGameControllerProps {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string; spotify_id: string } | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
  onNextRound: () => void;
  onRevealTrack: () => void;
  onEndGame: () => void;
  isJudging: boolean;
  isAdvancing: boolean;
  isRevealing: boolean;
  isEndingGame: boolean;
  spotifyPlayer: UseSpotifyPlayerReturn;
  playerError: string | null;
}

export function HostGameController(props: HostGameControllerProps) {
  const hasStartedPlayingRef = useRef(false);

  // Get spotify_id from current track
  const currentSpotifyId = props.currentTrack?.spotify_id || null;

  // Destructure Spotify player props (passed from parent)
  const {
    isReady,
    isPlaying,
    playbackState,
    error: spotifyError,
    play,
    pause,
    resume,
    setVolume,
  } = props.spotifyPlayer;

  // Auto-play track when round starts
  useEffect(() => {
    if (
      props.session.state === 'playing' &&
      currentSpotifyId &&
      isReady &&
      !hasStartedPlayingRef.current
    ) {
      console.log('Auto-playing track:', currentSpotifyId);
      play(currentSpotifyId)
        .then(() => {
          console.log('Successfully started playback');
          hasStartedPlayingRef.current = true;
        })
        .catch((err) => {
          console.error('Failed to auto-play:', err);
        });
    }
  }, [props.session.state, currentSpotifyId, isReady, play]);

  // Auto-pause when someone buzzes
  useEffect(() => {
    if (props.session.state === 'buzzed' && isPlaying) {
      console.log('Auto-pausing due to buzz');
      pause().catch((err) => {
        console.error('Failed to pause:', err);
      });
    }
  }, [props.session.state, isPlaying, pause]);

  // Reset playing flag when state changes away from playing
  useEffect(() => {
    if (props.session.state !== 'playing') {
      hasStartedPlayingRef.current = false;
    }
  }, [props.session.state]);

  return (
    <div>
      {/* Spotify Player Status */}
      {!isReady && (
        <div className="container mx-auto p-6 max-w-2xl mb-6">
          <Alert>
            <Music className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Initializing Spotify player... This may take a few seconds.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Error Display */}
      {(props.playerError || spotifyError) && (
        <div className="container mx-auto p-6 max-w-2xl mb-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {props.playerError || spotifyError}
              <br />
              <span className="text-sm">
                Try refreshing the page or signing in again. Spotify Premium may be required for full playback.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Game View */}
      <HostGameView
        {...props}
        playbackState={playbackState}
        onPlayPause={() => {
          if (isPlaying) {
            pause();
          } else {
            resume();
          }
        }}
        onVolumeChange={(volume) => {
          setVolume(volume);
        }}
        isSpotifyReady={isReady}
      />

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg space-y-1">
          <div>Player Ready: {isReady ? '✓' : '✗'}</div>
          <div>Playing: {isPlaying ? '✓' : '✗'}</div>
          <div>Current Track: {currentSpotifyId || 'none'}</div>
          <div>Game State: {props.session.state}</div>
        </div>
      )}
    </div>
  );
}
