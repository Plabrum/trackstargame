/**
 * Spotify Web Playback SDK wrapper for host audio control.
 */

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
  private lastPosition = 0;

  constructor(accessToken: string, callbacks: SpotifyPlayerCallbacks = {}) {
    this.accessToken = accessToken;
    this.callbacks = callbacks;
  }

  async initialize(deviceName: string = 'Trackstar Game'): Promise<void> {
    // Load SDK if needed
    if (!window.Spotify) {
      await this.loadSpotifySDK();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('SDK timeout')), 10000);
        window.onSpotifyWebPlaybackSDKReady = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }

    // Create player
    this.player = new window.Spotify.Player({
      name: deviceName,
      getOAuthToken: (cb: (token: string) => void) => cb(this.accessToken),
      volume: 0.8,
    });

    this.setupEventListeners();

    // Connect with timeout
    const connected = await Promise.race([
      this.player.connect(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      ),
    ]);

    if (!connected) {
      this.player.disconnect();
      this.player = null;
      throw new Error('Failed to connect');
    }
  }

  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load SDK'));
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private async transferPlayback(deviceId: string): Promise<void> {
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false,
      }),
    });

    // Simple wait for activation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    this.player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.transferPlayback(device_id)
        .then(() => this.callbacks.onReady?.())
        .catch((err) => this.callbacks.onError?.(`Device activation failed: ${err.message}`));
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      this.deviceId = null;
    });

    this.player.addListener('initialization_error', ({ message }) => {
      this.callbacks.onError?.(`Initialization error: ${message}`);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      this.callbacks.onError?.('Authentication failed. Please sign in again.');
    });

    this.player.addListener('account_error', ({ message }) => {
      this.callbacks.onError?.('Account error. Spotify Premium may be required.');
    });

    this.player.addListener('playback_error', ({ message }) => {
      this.callbacks.onError?.(`Playback error: ${message}`);
    });

    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;

      const currentTrack = state.track_window.current_track;
      const trackMetadata: SpotifyTrackMetadata = {
        uri: currentTrack.uri,
        id: currentTrack.id,
        name: currentTrack.name,
        artists: currentTrack.artists.map((a: { name: string }) => a.name).join(', '),
        albumName: currentTrack.album.name,
        albumArt: currentTrack.album.images[0]?.url || null,
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

      // Track end detection: paused at the end
      const atEnd = state.duration > 0 && state.position >= state.duration - 500;
      if (state.paused && atEnd) {
        this.callbacks.onTrackEnd?.();
      }

      this.lastPosition = state.position;
    });
  }

  async play(spotifyIdOrUri: string): Promise<void> {
    if (!this.deviceId) throw new Error('Player not ready');

    const uri = spotifyIdOrUri.startsWith('spotify:track:')
      ? spotifyIdOrUri
      : `spotify:track:${spotifyIdOrUri}`;

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
      throw new Error(`Playback failed: ${error}`);
    }

    this.startTime = Date.now();
    this.lastPosition = 0;
  }

  async pause(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.pause();
  }

  async resume(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.resume();
  }

  async stop(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.pause();
    await this.seek(0);
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.seek(positionMs);
  }

  getElapsedSeconds(): number {
    return this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
  }

  async getState(): Promise<SpotifyPlayerState | null> {
    if (!this.player) return null;

    const state = await this.player.getCurrentState();
    if (!state) return null;

    const currentTrack = state.track_window.current_track;
    return {
      isReady: true,
      isPlaying: !state.paused,
      isPaused: state.paused,
      position: state.position,
      duration: state.duration,
      trackUri: currentTrack.uri,
      track: {
        uri: currentTrack.uri,
        id: currentTrack.id,
        name: currentTrack.name,
        artists: currentTrack.artists.map(a => a.name).join(', '),
        albumName: currentTrack.album.name,
        albumArt: currentTrack.album.images[0]?.url || null,
      },
    };
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.setVolume(volume);
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    this.deviceId = null;
    this.startTime = null;
    this.lastPosition = 0;
  }

  isPlayerReady(): boolean {
    return this.deviceId !== null;
  }
}

// TypeScript declarations
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
