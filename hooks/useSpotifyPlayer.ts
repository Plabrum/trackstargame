/**
 * React hook for Spotify Web Playback SDK.
 * Uses official @spotify/web-api-ts-sdk for API calls.
 *
 * Note: Spotify SDK is loaded globally via Next.js Script component in app/layout.tsx
 * Implementation follows Spotify's best practices:
 * https://developer.spotify.com/documentation/web-playback-sdk/reference
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export interface SpotifyTrackMetadata {
  uri: string;
  id: string;
  name: string;
  artists: string;
  albumName: string;
  albumArt: string | null;
}

export interface SpotifyPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
  trackUri: string | null;
  track: SpotifyTrackMetadata | null;
}

interface UseSpotifyPlayerOptions {
  accessToken: string;
  deviceName?: string;
  onError?: (error: string) => void;
}

export interface UseSpotifyPlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
  playbackState: SpotifyPlayerState | null;
  error: string | null;
  play: (spotifyId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  getElapsedSeconds: () => number;
}

export function useSpotifyPlayer(options: UseSpotifyPlayerOptions): UseSpotifyPlayerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackState, setPlaybackState] = useState<SpotifyPlayerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const deviceIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);
  const stateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create API client - memoized so it doesn't recreate on every render
  const api = useMemo(
    () => SpotifyApi.withAccessToken(
      process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
      { access_token: options.accessToken } as any
    ),
    [options.accessToken]
  );

  // useEffect only for player initialization, event listeners, and cleanup
  useEffect(() => {
    if (!options.accessToken) {
      console.log('[Spotify] No access token');
      return;
    }

    // Wait for SDK to be available
    if (!window.Spotify) {
      console.log('[Spotify] SDK not yet loaded, waiting...');

      // Poll for SDK availability
      const checkInterval = setInterval(() => {
        if (window.Spotify) {
          console.log('[Spotify] SDK now available');
          clearInterval(checkInterval);
          setSdkLoaded(true); // Trigger re-render
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // If player already exists, don't reinitialize
    if (playerRef.current) {
      console.log('[Spotify] Player already initialized, skipping');
      return;
    }

    console.log('[Spotify] Initializing player...');

    // Create player instance
    const player = new window.Spotify.Player({
      name: options.deviceName || 'Trackstar Game',
      getOAuthToken: (cb) => cb(options.accessToken),
      volume: 0.8,
    });

    playerRef.current = player;
    console.log('[Spotify] Player instance created');

    // Essential: Device ready
    // Device is ready but backend API needs time to recognize it
    player.addListener('ready', async ({ device_id }) => {
      console.log('[Spotify] Device ready event fired:', device_id);
      deviceIdRef.current = device_id;

      if (!api) {
        console.error('[Spotify] API client not initialized');
        setIsReady(true);
        setError(null);
        return;
      }

      // Wait for Spotify's backend to register the device
      // This is a known issue with the Web Playback SDK
      console.log('[Spotify] Waiting 0.5 seconds for backend to register device...');
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Check current playback state
        const playbackState = await api.player.getPlaybackState();

        // If there's active playback on another device, transfer it
        if (playbackState && playbackState.device.id !== device_id && playbackState.is_playing) {
          console.log('[Spotify] Transferring active playback from', playbackState.device.name);
          await api.player.transferPlayback([device_id], true); // true = keep playing
        } else {
          console.log('[Spotify] No active playback to transfer');
        }
      } catch (err) {
        // Ignore errors - maybe no active playback, which is fine
        console.log('[Spotify] Error checking playback state:', err);
      }

      console.log('[Spotify] Setting isReady to true');
      setIsReady(true);
      setError(null);
    });

    // Essential: Device disconnected
    player.addListener('not_ready', ({ device_id }) => {
      deviceIdRef.current = null;
      setIsReady(false);
    });

    // Essential: Track playback state changes
    // Debounce rapid state changes to avoid excessive re-renders
    player.addListener('player_state_changed', (state) => {
      if (!state) {
        console.log('[Spotify] Player state changed: null');
        return;
      }

      console.log('[Spotify] Player state changed:', {
        paused: state.paused,
        position: state.position,
        track: state.track_window.current_track.name,
      });

      // Clear any pending state update
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }

      // Debounce state updates by 50ms to batch rapid events
      stateChangeTimeoutRef.current = setTimeout(() => {
        const currentTrack = state.track_window.current_track;
        setIsPlaying(!state.paused);
        setPlaybackState({
          isReady: true,
          isPlaying: !state.paused,
          isPaused: state.paused,
          position: state.position,
          duration: state.duration,
          trackUri: currentTrack.uri,
          track: {
            uri: currentTrack.uri,
            id: currentTrack.id || '',
            name: currentTrack.name,
            artists: currentTrack.artists.map((a: { name: string }) => a.name).join(', '),
            albumName: currentTrack.album.name || '',
            albumArt: currentTrack.album.images[0]?.url ?? null,
          },
        });
      }, 50);
    });

    // Error listeners - recommended by Spotify for proper diagnostics
    player.addListener('initialization_error', ({ message }) => {
      const msg = `Browser compatibility issue: ${message}`;
      setError(msg);
      options.onError?.(msg);
    });

    player.addListener('authentication_error', ({ message }) => {
      const msg = `Authentication failed. Your session may have expired. Please refresh and sign in again.`;
      setError(msg);
      options.onError?.(msg);
    });

    player.addListener('account_error', ({ message }) => {
      const msg = `Spotify Premium Required: This feature requires a Spotify Premium account. Please upgrade at spotify.com/premium to continue.`;
      setError(msg);
      options.onError?.(msg);
    });

    player.addListener('playback_error', ({ message }) => {
      const msg = `Playback failed: ${message}`;
      setError(msg);
      options.onError?.(msg);
    });

    // Connect to the player
    console.log('[Spotify] Connecting player...');
    player.connect().then((connected) => {
      if (!connected) {
        console.error('[Spotify] Connection failed');
        setError('Failed to connect to Spotify');
        options.onError?.('Failed to connect to Spotify');
      } else {
        console.log('[Spotify] Connected successfully, waiting for ready event...');
      }
    }).catch((err) => {
      console.error('[Spotify] Connection error:', err);
      setError('Failed to connect to Spotify');
      options.onError?.('Failed to connect to Spotify');
    });

    // Cleanup
    return () => {
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }
      player.disconnect();
    };
  }, [options.accessToken, options.deviceName, options.onError, sdkLoaded]);

  const play = useCallback(
    async (spotifyId: string) => {
      if (!deviceIdRef.current) {
        throw new Error('Player not ready - device not activated');
      }

      const uri = spotifyId.startsWith('spotify:track:') ? spotifyId : `spotify:track:${spotifyId}`;

      // Check current playback state to see if we're already the active device
      let activeDeviceId: string | undefined;
      try {
        const playbackState = await api.player.getPlaybackState();
        activeDeviceId = playbackState?.device?.id ?? undefined;
        console.log('[Spotify] Current active device:', activeDeviceId, 'Our device:', deviceIdRef.current);
      } catch (err) {
        console.log('[Spotify] Could not get playback state, will attempt playback anyway:', err);
      }

      // Always specify our device_id to ensure playback targets our Web Playback SDK instance
      const isAlreadyActiveDevice = activeDeviceId === deviceIdRef.current;

      console.log('[Spotify] Playing track:', {
        uri,
        activeDeviceId,
        ourDevice: deviceIdRef.current,
        isAlreadyActiveDevice,
        targetDevice: deviceIdRef.current
      });

      // Retry logic for "Device not found" 404 errors
      // This happens when the Spotify backend hasn't fully registered the device yet
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await api.player.startResumePlayback(
            deviceIdRef.current,
            undefined,
            [uri],
            undefined,
            0
          );

          // Success!
          startTimeRef.current = Date.now();
          setIsPlaying(true);
          setError(null);
          return;
        } catch (err: any) {
          lastError = err;

          // Check if it's a 404 "Device not found" error
          const is404 = err.message?.includes('404') || err.status === 404;

          if (is404 && attempt < maxRetries - 1) {
            // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
            const delay = 500 * Math.pow(2, attempt);
            console.log(`[Spotify] Device not found (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // If it's not a 404 or we've exhausted retries, throw
          break;
        }
      }

      // If we get here, all retries failed
      throw lastError || new Error('Failed to start playback');
    },
    [api]
  );

  const pause = useCallback(async () => {
    if (!deviceIdRef.current) return;
    try {
      await api.player.pausePlayback(deviceIdRef.current);
      setIsPlaying(false);
    } catch (err: any) {
      console.error('[Spotify] Pause error:', err);
      // If it's a JSON parse error, the device might be stale - try to recover
      if (err.message?.includes('JSON') || err.message?.includes('SyntaxError')) {
        console.log('[Spotify] Possible stale device, attempting player pause directly');
        await playerRef.current?.pause();
        setIsPlaying(false);
      } else {
        throw err;
      }
    }
  }, [api]);

  const resume = useCallback(async () => {
    if (!deviceIdRef.current) return;
    await api.player.startResumePlayback(deviceIdRef.current);
    setIsPlaying(true);
  }, [api]);

  const setVolume = useCallback(async (volume: number) => {
    if (!deviceIdRef.current) return;
    await api.player.setPlaybackVolume(Math.round(volume * 100), deviceIdRef.current);
  }, [api]);

  const getElapsedSeconds = useCallback(() => {
    return startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
  }, []);

  return {
    isReady,
    isPlaying,
    playbackState,
    error,
    play,
    pause,
    resume,
    setVolume,
    getElapsedSeconds,
  };
}

// TypeScript declarations - augment the global types from @types/spotify-web-playback-sdk
