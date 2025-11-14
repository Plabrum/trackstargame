/**
 * React hook for Spotify Web Playback SDK integration.
 *
 * Provides host audio controls with precise timing for buzz mechanics.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SpotifyPlayer,
  SpotifyPlayerState,
  SpotifyPlayerCallbacks,
} from '@/lib/audio/spotify-player';

interface UseSpotifyPlayerOptions {
  accessToken: string;
  deviceName?: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onTrackEnd?: () => void;
  onPlaybackChange?: (state: SpotifyPlayerState) => void;
}

interface UseSpotifyPlayerReturn {
  player: SpotifyPlayer | null;
  isReady: boolean;
  isPlaying: boolean;
  error: string | null;
  play: (spotifyId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  getElapsedSeconds: () => number;
  setVolume: (volume: number) => Promise<void>;
}

export function useSpotifyPlayer(
  options: UseSpotifyPlayerOptions
): UseSpotifyPlayerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  // Initialize player
  useEffect(() => {
    if (!options.accessToken) {
      setError('No access token provided');
      return;
    }

    const callbacks: SpotifyPlayerCallbacks = {
      onReady: () => {
        console.log('Spotify Player Ready');
        setIsReady(true);
        setError(null);
        options.onReady?.();
      },
      onError: (err) => {
        console.error('Spotify Player Error:', err);
        setError(err);
        options.onError?.(err);
      },
      onTrackEnd: () => {
        setIsPlaying(false);
        options.onTrackEnd?.();
      },
      onPlaybackChange: (state) => {
        setIsPlaying(state.isPlaying);
        options.onPlaybackChange?.(state);
      },
    };

    const player = new SpotifyPlayer(options.accessToken, callbacks);
    playerRef.current = player;

    // Initialize the player
    player
      .initialize(options.deviceName || 'Trackstar Game')
      .catch((err) => {
        console.error('Failed to initialize Spotify player:', err);
        setError(err.message);
      });

    // Cleanup on unmount
    return () => {
      player.disconnect();
      playerRef.current = null;
    };
  }, [options.accessToken]); // Only re-initialize if token changes

  // Play track
  const play = useCallback(async (spotifyId: string) => {
    if (!playerRef.current) {
      throw new Error('Player not initialized');
    }

    try {
      await playerRef.current.play(spotifyId);
      setIsPlaying(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to play track:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Pause playback
  const pause = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not initialized');
    }

    try {
      await playerRef.current.pause();
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Failed to pause:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Resume playback
  const resume = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not initialized');
    }

    try {
      await playerRef.current.resume();
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Failed to resume:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Stop playback
  const stop = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not initialized');
    }

    try {
      await playerRef.current.stop();
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Failed to stop:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Get elapsed seconds
  const getElapsedSeconds = useCallback(() => {
    if (!playerRef.current) {
      return 0;
    }

    return playerRef.current.getElapsedSeconds();
  }, []);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    if (!playerRef.current) {
      throw new Error('Player not initialized');
    }

    try {
      await playerRef.current.setVolume(volume);
    } catch (err: any) {
      console.error('Failed to set volume:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    player: playerRef.current,
    isReady,
    isPlaying,
    error,
    play,
    pause,
    resume,
    stop,
    getElapsedSeconds,
    setVolume,
  };
}
