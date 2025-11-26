"use client";

import { SoloFinalScore } from "./SoloFinalScore";
import { MultiplayerFinalScore } from "./MultiplayerFinalScore";
import { SpotifyPlaybackControls } from "@/components/host/SpotifyPlaybackControls";
import type { Tables } from "@/lib/types/database";
import type { UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";
import { useTrack, useSpotifyAlbumArt } from "@/hooks/queries/use-game";

type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface HostFinalScoreProps {
  players: Player[];
  rounds: GameRound[];
  onPlayAgain: () => void;
  currentPlayerId?: string | null;
  spotifyPlayer?: UseSpotifyPlayerReturn;
}

/**
 * Final Score component for hosts (requires SpotifyAuthProvider)
 * Includes Spotify album art for solo mode
 */
export function HostFinalScore({ players, rounds, onPlayAgain, currentPlayerId, spotifyPlayer }: HostFinalScoreProps) {
  // Detect solo mode
  const isSoloMode = players.length === 1 && players[0]?.is_host === true;
  const soloPlayer = isSoloMode ? players[0] : null;

  // Get Spotify access token from context
  const { accessToken } = useSpotifyAuth();

  // Find best round for album art (solo mode only)
  const bestRound = rounds.reduce((best, current) => {
    const currentPoints = current.points_awarded || 0;
    const bestPoints = best?.points_awarded || 0;
    return currentPoints > bestPoints ? current : best;
  }, rounds[0]);

  // Fetch track details for best round (solo mode only)
  const { data: bestRoundTrack } = useTrack(isSoloMode ? bestRound?.track_id ?? null : null);

  // Fetch album art from Spotify API (solo mode only)
  const { data: albumArt } = useSpotifyAlbumArt(
    bestRoundTrack?.spotify_id ?? null,
    accessToken
  );

  const content = isSoloMode && soloPlayer ? (
    <SoloFinalScore
      player={soloPlayer}
      rounds={rounds}
      onPlayAgain={onPlayAgain}
      albumArtUrl={albumArt ?? undefined}
    />
  ) : (
    <MultiplayerFinalScore
      players={players}
      rounds={rounds}
      onPlayAgain={onPlayAgain}
      currentPlayerId={currentPlayerId}
      showUserInfo={true}
      accessToken={accessToken}
      albumArtUrl={albumArt}
    />
  );

  return (
    <>
      {content}

      {/* Spotify Playback Controls - Sticky Bottom */}
      {spotifyPlayer && spotifyPlayer.isReady && spotifyPlayer.playbackState?.track && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto max-w-6xl p-4">
            <SpotifyPlaybackControls
              playbackState={spotifyPlayer.playbackState}
              onPlayPause={() => {
                if (spotifyPlayer.isPlaying) {
                  spotifyPlayer.pause();
                } else {
                  spotifyPlayer.resume();
                }
              }}
              onVolumeChange={spotifyPlayer.setVolume}
              showControls={true}
              hideTrackDetails={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
