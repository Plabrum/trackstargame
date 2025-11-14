/**
 * Host Game Controller
 *
 * Wraps HostGameView with Spotify Web Playback SDK integration.
 * Handles audio playback, timing, and synchronization with game state.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { HostGameView } from "./HostGameView";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Music, AlertTriangle } from "lucide-react";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface HostGameControllerProps {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string; spotify_id: string } | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
  onStartRound: () => Promise<any>;
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
  onNextRound: () => void;
  isStartingRound: boolean;
  isJudging: boolean;
  isAdvancing: boolean;
}

export function HostGameController(props: HostGameControllerProps) {
  const [accessToken, setAccessToken] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const hasStartedPlayingRef = useRef(false);

  // Fetch access token from API
  useEffect(() => {
    fetch('/api/spotify/token')
      .then(res => res.json())
      .then(data => {
        if (data.accessToken) {
          setAccessToken(data.accessToken);
        } else {
          setPlayerError('No Spotify access token found. Please sign in again.');
        }
      })
      .catch(err => {
        console.error('Failed to get access token:', err);
        setPlayerError('Failed to get Spotify access token');
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

  // Get spotify_id from current track
  const currentSpotifyId = props.currentTrack?.spotify_id || null;

  // Initialize Spotify player
  const {
    player,
    isReady,
    isPlaying,
    error: spotifyError,
    play,
    pause,
  } = useSpotifyPlayer({
    accessToken,
    deviceName: 'Trackstar Game',
    onReady: () => {
      console.log('Spotify player ready');
      setPlayerError(null);
    },
    onError: (error) => {
      console.error('Spotify error:', error);
      setPlayerError(error);
    },
    onTrackEnd: () => {
      console.log('Track ended naturally');
    },
    onPlaybackChange: (state) => {
      console.log('Playback state:', state);
    },
  });

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
          setPlayerError(`Failed to play track: ${err.message}`);
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

  // Wrapped startRound that calls the original
  const handleStartRound = async () => {
    try {
      hasStartedPlayingRef.current = false; // Reset flag to allow auto-play
      await props.onStartRound();
    } catch (error: any) {
      console.error('Failed to start round:', error);
      setPlayerError(error.message);
    }
  };

  // Show loading while fetching auth
  if (isLoadingAuth) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert>
          <Music className="h-4 w-4 animate-spin" />
          <AlertDescription>Loading Spotify authentication...</AlertDescription>
        </Alert>
      </div>
    );
  }

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
      {(playerError || spotifyError) && (
        <div className="container mx-auto p-6 max-w-2xl mb-6">
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
        </div>
      )}

      {/* Main Game View */}
      <HostGameView
        {...props}
        onStartRound={handleStartRound}
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
