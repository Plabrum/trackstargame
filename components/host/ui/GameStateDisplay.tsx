/**
 * Game State Display
 * Shows the current game state badge and state-specific information
 */

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrackReveal } from "@/components/game/TrackReveal";
import type { Tables } from "@/lib/types/database";
import type { SpotifyPlayerState } from "@/lib/audio/spotify-player";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface GameStateDisplayProps {
  state: GameSession['state'];
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
  currentTrack?: { title: string; artist: string } | null;
  playbackState?: SpotifyPlayerState | null;
  answerFeedback?: {
    isCorrect: boolean;
    pointsEarned: number;
  } | null;
  isSoloMode: boolean;
  hasSubmittedAnswer?: boolean;
}

export function GameStateDisplay({
  state,
  buzzerPlayer,
  elapsedSeconds,
  currentTrack,
  playbackState,
  answerFeedback,
  isSoloMode,
  hasSubmittedAnswer,
}: GameStateDisplayProps) {
  // Get state label for badge
  const getStateLabel = () => {
    switch (state) {
      case 'playing': return 'Playing';
      case 'buzzed': return 'Buzzed!';
      case 'submitted': return 'Answers Submitted';
      case 'reveal': return 'Revealed';
      default: return state;
    }
  };

  // Render state-specific information
  const renderStateInfo = () => {
    switch (state) {
      case 'playing':
        if (hasSubmittedAnswer) {
          return (
            <Alert>
              <AlertDescription className="text-center py-4">
                <p className="text-xl font-bold">Answer submitted!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isSoloMode ? 'Processing your answer...' : 'Waiting for other players...'}
                </p>
              </AlertDescription>
            </Alert>
          );
        }
        return null;

      case 'buzzed':
        return (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertDescription>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-yellow-900">{buzzerPlayer?.name} buzzed!</p>
                <p className="text-lg text-yellow-700 mt-1">
                  Time: {elapsedSeconds?.toFixed(2)}s
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'submitted':
        return (
          <Alert className="border-blue-500 bg-blue-50">
            <AlertDescription>
              <div className="text-center py-2">
                <p className="text-xl font-bold text-blue-900">All answers submitted!</p>
                <p className="text-sm text-blue-700 mt-1">
                  Review answers below and override if needed
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );

      case 'reveal':
        if (currentTrack) {
          return (
            <TrackReveal
              trackTitle={currentTrack.title}
              artistName={currentTrack.artist}
              albumArt={playbackState?.track?.albumArt}
              answerFeedback={
                answerFeedback
                  ? {
                    isCorrect: answerFeedback.isCorrect,
                    pointsEarned: answerFeedback.pointsEarned,
                  }
                  : undefined
              }
            />
          );
        }

        return (
          <Alert>
            <AlertDescription className="text-center py-4">
              <p className="text-lg font-semibold">Round Complete</p>
              <p className="text-sm text-muted-foreground mt-2">Ready for next round</p>
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Badge variant="outline" className="text-md px-3 py-2">
        {getStateLabel()}
      </Badge>
      {renderStateInfo()}
    </div>
  );
}
