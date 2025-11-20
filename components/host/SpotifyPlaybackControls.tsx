/**
 * Spotify playback controls component
 *
 * Shows currently playing track with album art, progress bar, and playback controls
 */

import { useEffect, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SpotifyPlayerState } from '@/lib/audio/spotify-player';

interface SpotifyPlaybackControlsProps {
  playbackState: SpotifyPlayerState | null;
  onPlayPause?: () => void;
  onVolumeChange?: (volume: number) => void;
  showControls?: boolean;
  hideTrackDetails?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SpotifyPlaybackControls({
  playbackState,
  onPlayPause,
  onVolumeChange,
  showControls = true,
  hideTrackDetails = false,
}: SpotifyPlaybackControlsProps) {
  const [volume, setVolume] = useState(80);
  const [localPosition, setLocalPosition] = useState(0);

  // Update local position from playback state
  useEffect(() => {
    if (playbackState?.position !== undefined) {
      setLocalPosition(playbackState.position);
    }
  }, [playbackState?.position]);

  // Smoothly update position while playing
  useEffect(() => {
    if (!playbackState?.isPlaying) return;

    const interval = setInterval(() => {
      setLocalPosition(prev => Math.min(prev + 100, playbackState.duration));
    }, 100);

    return () => clearInterval(interval);
  }, [playbackState?.isPlaying, playbackState?.duration]);

  if (!playbackState?.track) {
    return null;
  }

  const { track } = playbackState;
  const progress = playbackState.duration > 0
    ? (localPosition / playbackState.duration) * 100
    : 0;

  return (
    <div className="w-full">
      <div className="flex gap-4">
          {/* Album Art */}
          {track.albumArt && !hideTrackDetails && (
            <div className="flex-shrink-0">
              <img
                src={track.albumArt}
                alt={track.albumName}
                className="w-20 h-20 rounded-md object-cover shadow-lg"
              />
            </div>
          )}

          {/* Track Info and Controls */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Track Name & Artist */}
            {!hideTrackDetails && (
              <div className="mb-2">
                <h3 className="font-semibold text-sm truncate">
                  {track.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artists}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(localPosition)}</span>
                <span>{formatTime(playbackState.duration)}</span>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={onPlayPause}
                className="h-10 w-10"
              >
                {playbackState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Volume Control */}
              {onVolumeChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                    >
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-16 p-3" side="top" align="center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">{volume}%</span>
                      <Slider
                        value={[volume]}
                        onValueChange={(values) => {
                          const newVolume = values[0];
                          setVolume(newVolume);
                          onVolumeChange(newVolume / 100);
                        }}
                        max={100}
                        step={1}
                        orientation="vertical"
                        className="h-28"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
