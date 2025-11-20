/**
 * Spotify Web Playback SDK wrapper for host audio control.
 *
 * This provides precise timing control for buzz-in mechanics and
 * allows the host to play full Spotify tracks (not just 30s previews).
 *
 * Requirements:
 * - Host must be authenticated with Spotify OAuth
 * - Spotify Premium account recommended for best experience
 * - Valid access token with 'streaming' scope
 */

export interface SpotifyTrackMetadata {
  uri: string;
  id: string;
  name: string;
  artists: string; // Comma-separated artist names
  albumName: string;
  albumArt: string | null; // URL to largest album image
}

export interface SpotifyPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  position: number; // Current position in ms
  duration: number; // Track duration in ms
  trackUri: string | null;
  track: SpotifyTrackMetadata | null;
}

export interface SpotifyPlayerCallbacks {
  onReady?: () => void;
  onError?: (error: string) => void;
  onTrackEnd?: () => void;
  onPlaybackChange?: (state: SpotifyPlayerState) => void;
}

export class SpotifyPlayer {
  private player: SpotifyPlayerInstance | null = null;
  private deviceId: string | null = null;
  private accessToken: string;
  private callbacks: SpotifyPlayerCallbacks;
  private startTime: number | null = null;
  private isInitialized = false;
  private lastPosition = 0;
  private hasPlayedPastStart = false;

  constructor(accessToken: string, callbacks: SpotifyPlayerCallbacks = {}) {
    this.accessToken = accessToken;
    this.callbacks = callbacks;
  }

  /**
   * Initialize the Spotify Web Playback SDK.
   * This loads the SDK script and creates a player instance.
   */
  async initialize(deviceName: string = 'Trackstar Game'): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SpotifyPlayer] Already initialized');
      return;
    }

    console.log('[SpotifyPlayer] Starting initialization...');

    // Check if SDK is already loaded and ready
    if (window.Spotify) {
      console.log('[SpotifyPlayer] SDK already loaded');
    } else {
      console.log('[SpotifyPlayer] Loading SDK...');
      // Set up the callback BEFORE loading the SDK
      const sdkReadyPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Spotify SDK failed to load within 10 seconds'));
        }, 10000);

        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log('[SpotifyPlayer] SDK ready callback fired');
          clearTimeout(timeout);
          resolve();
        };
      });

      // Load Spotify SDK script
      await this.loadSpotifySDK();

      // Wait for SDK to be ready
      await sdkReadyPromise;
    }

    console.log('[SpotifyPlayer] Creating player instance...');
    // Create player instance
    this.player = new window.Spotify.Player({
      name: deviceName,
      getOAuthToken: (cb: (token: string) => void) => {
        cb(this.accessToken);
      },
      volume: 0.8,
    });

    // Set up event listeners
    this.setupEventListeners();

    // Connect to the player with timeout
    if (!this.player) {
      throw new Error('Failed to create Spotify player');
    }

    console.log('[SpotifyPlayer] Connecting to player...');
    try {
      const connected = await Promise.race([
        this.player.connect(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Player connection timeout after 15 seconds')), 15000)
        ),
      ]);

      if (!connected) {
        throw new Error('Failed to connect to Spotify player');
      }

      console.log('[SpotifyPlayer] Player connected successfully');
    } catch (error) {
      console.error('[SpotifyPlayer] Connection failed:', error);
      // Cleanup on connection failure
      this.player.disconnect();
      this.player = null;
      throw error;
    }

    this.isInitialized = true;
  }

  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  /**
   * Transfer playback to this device to make it the active device.
   * This is required before you can play tracks on the device.
   */
  private async transferPlayback(deviceId: string): Promise<void> {
    console.log('Transferring playback to device:', deviceId);

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false, // Don't start playing immediately
        }),
      });

      // 202 = success, 204 = success but no content, 404 = no active device (which is ok for initial transfer)
      if (!response.ok && response.status !== 404 && response.status !== 204) {
        const errorText = await response.text();
        console.error('Transfer playback error:', response.status, errorText);
        throw new Error(`Failed to transfer playback (${response.status}): ${errorText}`);
      }

      console.log('Transfer playback request sent, status:', response.status);
    } catch (error) {
      console.error('Transfer playback request failed:', error);
      throw error;
    }

    // Poll for device to become active (max 8 seconds)
    await new Promise<void>((resolve, reject) => {
      const startTime = Date.now();
      const maxWaitMs = 8000;
      const pollIntervalMs = 500;

      const checkDevice = async () => {
        try {
          const stateResponse = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          });

          if (stateResponse.status === 200) {
            const state = await stateResponse.json();
            if (state.device?.id === deviceId) {
              if (state.device?.is_active) {
                console.log('Device is now active');
                resolve();
                return;
              } else {
                console.log('Device found but not active yet, continuing to poll...');
              }
            } else {
              console.log('Waiting for correct device, current:', state.device?.id);
            }
          } else if (stateResponse.status === 204) {
            // No active device yet, keep waiting
            console.log('No active device yet (204), continuing to poll...');
          }

          // Check if we've exceeded max wait time
          if (Date.now() - startTime >= maxWaitMs) {
            console.warn('Device activation timeout after', maxWaitMs, 'ms - proceeding anyway');
            // Resolve anyway, the device might still work for playback
            resolve();
            return;
          }

          // Continue polling
          setTimeout(checkDevice, pollIntervalMs);
        } catch (error) {
          console.error('Error checking device state:', error);
          // Don't reject on polling errors, just log and continue
          setTimeout(checkDevice, pollIntervalMs);
        }
      };

      checkDevice();
    });
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('[SpotifyPlayer] Player ready event received, device_id:', device_id);
      this.deviceId = device_id;

      // Transfer playback to this device to make it active
      this.transferPlayback(device_id)
        .then(() => {
          console.log('[SpotifyPlayer] Playback transferred successfully, calling onReady callback');
          this.callbacks.onReady?.();
        })
        .catch((err) => {
          console.error('[SpotifyPlayer] Failed to transfer playback:', err);
          this.callbacks.onError?.(`Failed to activate device: ${err.message}`);
        });
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player Not Ready', device_id);
      this.deviceId = null;
    });

    // Errors
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('[SpotifyPlayer] Initialization Error:', message);
      this.callbacks.onError?.(`Initialization error: ${message}`);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('[SpotifyPlayer] Authentication Error:', message);
      this.callbacks.onError?.('Authentication failed. Please sign in again.');
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('[SpotifyPlayer] Account Error:', message);
      this.callbacks.onError?.('Account error. Spotify Premium may be required.');
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('[SpotifyPlayer] Playback Error:', message);
      this.callbacks.onError?.(`Playback error: ${message}`);
    });

    // Player state changes
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;

      // Extract track metadata
      const currentTrack = state.track_window.current_track;
      const trackMetadata: SpotifyTrackMetadata = {
        uri: currentTrack.uri,
        id: currentTrack.id,
        name: currentTrack.name,
        artists: currentTrack.artists.map((a: { name: string }) => a.name).join(', '),
        albumName: currentTrack.album.name,
        albumArt: currentTrack.album.images[0]?.url || null, // Largest image first
      };

      const playerState: SpotifyPlayerState = {
        isReady: true,
        isPlaying: !state.paused,
        isPaused: state.paused,
        position: state.position,
        duration: state.duration,
        trackUri: currentTrack.uri,
        track: trackMetadata,
      };

      this.callbacks.onPlaybackChange?.(playerState);

      // Track if we've started playing (position > 1 second)
      if (state.position > 1000) {
        this.hasPlayedPastStart = true;
      }

      // Track ended: Only trigger if we've played past start and now at end
      // Check if position is near end (within 2 seconds) or wrapped back to 0 after playing
      const nearEnd = state.duration > 0 && state.position >= state.duration - 2000;
      const wrappedToStart = this.hasPlayedPastStart && state.position === 0 && this.lastPosition > 1000;

      if (state.paused && (nearEnd || wrappedToStart)) {
        this.hasPlayedPastStart = false; // Reset for next track
        this.callbacks.onTrackEnd?.();
      }

      this.lastPosition = state.position;
    });
  }

  /**
   * Play a Spotify track by URI or ID.
   * Records the start time for precise elapsed time calculation.
   */
  async play(spotifyIdOrUri: string): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Player not ready. Call initialize() first.');
    }

    // Convert spotify ID to URI if needed
    const uri = spotifyIdOrUri.startsWith('spotify:track:')
      ? spotifyIdOrUri
      : `spotify:track:${spotifyIdOrUri}`;

    // Start playback via Spotify Web API
    // Device should already be active from transferPlayback call
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        device_id: this.deviceId,
        uris: [uri],
        position_ms: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start playback: ${error}`);
    }

    // Success! Record start time and reset track end detection
    this.startTime = Date.now();
    this.hasPlayedPastStart = false;
    this.lastPosition = 0;
  }

  /**
   * Pause playback immediately.
   * Used when someone buzzes in.
   */
  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    await this.player.pause();
  }

  /**
   * Resume playback from current position.
   */
  async resume(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    await this.player.resume();
  }

  /**
   * Stop playback and reset.
   */
  async stop(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    await this.player.pause();
    await this.seek(0);
  }

  /**
   * Seek to a specific position in the track (in milliseconds).
   */
  async seek(positionMs: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    await this.player.seek(positionMs);
  }

  /**
   * Get the elapsed time since playback started (in seconds).
   * This is used for buzz timing and scoring.
   */
  getElapsedSeconds(): number {
    if (!this.startTime) {
      return 0;
    }

    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get current playback state.
   */
  async getState(): Promise<SpotifyPlayerState | null> {
    if (!this.player) {
      return null;
    }

    const state = await this.player.getCurrentState();
    if (!state) {
      return null;
    }

    const currentTrack = state.track_window.current_track;
    const trackMetadata: SpotifyTrackMetadata = {
      uri: currentTrack.uri,
      id: currentTrack.id,
      name: currentTrack.name,
      artists: currentTrack.artists.map(a => a.name).join(', '),
      albumName: currentTrack.album.name,
      albumArt: currentTrack.album.images[0]?.url || null,
    };

    return {
      isReady: true,
      isPlaying: !state.paused,
      isPaused: state.paused,
      position: state.position,
      duration: state.duration,
      trackUri: currentTrack.uri,
      track: trackMetadata,
    };
  }

  /**
   * Set playback volume (0.0 to 1.0).
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    await this.player.setVolume(volume);
  }

  /**
   * Disconnect and clean up the player.
   * Call this when the component unmounts.
   */
  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    this.deviceId = null;
    this.startTime = null;
    this.isInitialized = false;
    this.hasPlayedPastStart = false;
    this.lastPosition = 0;
  }

  /**
   * Check if player is ready to play.
   */
  isPlayerReady(): boolean {
    return this.isInitialized && this.deviceId !== null;
  }
}

// TypeScript declarations for Spotify Web Playback SDK
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (data: any) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: SpotifyTrack;
  };
}

interface SpotifyTrack {
  uri: string;
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}
