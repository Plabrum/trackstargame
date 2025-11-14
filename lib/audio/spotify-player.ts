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

export interface SpotifyPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  position: number; // Current position in ms
  duration: number; // Track duration in ms
  trackUri: string | null;
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
      console.warn('SpotifyPlayer already initialized');
      return;
    }

    // Set up the callback BEFORE loading the SDK
    const sdkReadyPromise = new Promise<void>((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve();
      };
    });

    // Load Spotify SDK script
    if (!window.Spotify) {
      await this.loadSpotifySDK();
    }

    // Wait for SDK to be ready
    await sdkReadyPromise;

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

    // Connect to the player
    if (!this.player) {
      throw new Error('Failed to create Spotify player');
    }

    const connected = await this.player.connect();
    if (!connected) {
      throw new Error('Failed to connect to Spotify player');
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

  private setupEventListeners(): void {
    if (!this.player) return;

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player Ready', device_id);
      this.deviceId = device_id;
      this.callbacks.onReady?.();
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player Not Ready', device_id);
      this.deviceId = null;
    });

    // Errors
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Initialization Error:', message);
      this.callbacks.onError?.(message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Authentication Error:', message);
      this.callbacks.onError?.('Authentication failed. Please sign in again.');
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Account Error:', message);
      this.callbacks.onError?.('Account error. Spotify Premium may be required.');
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Playback Error:', message);
      this.callbacks.onError?.(message);
    });

    // Player state changes
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;

      const playerState: SpotifyPlayerState = {
        isReady: true,
        isPlaying: !state.paused,
        isPaused: state.paused,
        position: state.position,
        duration: state.duration,
        trackUri: state.track_window.current_track.uri,
      };

      this.callbacks.onPlaybackChange?.(playerState);

      // Track ended
      if (state.position === 0 && state.paused) {
        this.callbacks.onTrackEnd?.();
      }
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

    // Record start time
    this.startTime = Date.now();
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

    return {
      isReady: true,
      isPlaying: !state.paused,
      isPaused: state.paused,
      position: state.position,
      duration: state.duration,
      trackUri: state.track_window.current_track.uri,
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
