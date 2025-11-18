"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Music } from "lucide-react";
import { BuzzAnimation } from "@/components/game/BuzzAnimation";
import { AnimatedScore } from "@/components/game/ScoreAnimation";
import { SpotifyPlaybackControls } from "./SpotifyPlaybackControls";
import type { Tables } from "@/lib/types/database";
import type { SpotifyPlayerState } from "@/lib/audio/spotify-player";

type Player = Tables<'players'>;
type GameSession = Tables<'game_sessions'>;

interface HostGameViewProps {
  session: GameSession;
  players: Player[];
  currentTrack?: { title: string; artist: string } | null;
  buzzerPlayer?: Player | null;
  elapsedSeconds?: number | null;
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
  onNextRound: () => void;
  onRevealTrack?: () => void;
  onEndGame?: () => void;
  isJudging: boolean;
  isAdvancing: boolean;
  isRevealing?: boolean;
  isEndingGame?: boolean;
  // Spotify playback controls
  playbackState?: SpotifyPlayerState | null;
  onPlayPause?: () => void;
  onVolumeChange?: (volume: number) => void;
  isSpotifyReady?: boolean;
}

export function HostGameView({
  session,
  players,
  currentTrack,
  buzzerPlayer,
  elapsedSeconds,
  onJudgeCorrect,
  onJudgeIncorrect,
  onNextRound,
  onRevealTrack,
  onEndGame,
  isJudging,
  isAdvancing,
  isRevealing,
  isEndingGame,
  playbackState,
  onPlayPause,
  onVolumeChange,
  isSpotifyReady,
}: HostGameViewProps) {
  const currentRound = session.current_round || 0;
  const totalRounds = session.total_rounds;
  const state = session.state;

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Buzz animation state
  const [showBuzzAnimation, setShowBuzzAnimation] = useState(false);

  // Trigger buzz animation when state changes to buzzed
  useEffect(() => {
    if (state === 'buzzed' && buzzerPlayer) {
      setShowBuzzAnimation(true);
    } else {
      setShowBuzzAnimation(false);
    }
  }, [state, buzzerPlayer]);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Buzz Animation Overlay */}
      <BuzzAnimation
        show={showBuzzAnimation}
        playerName={buzzerPlayer?.name}
        isCorrect={null}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Round {currentRound} / {totalRounds}</h1>
          <p className="text-muted-foreground">Host Controls</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {state === 'playing' && 'Playing'}
            {state === 'buzzed' && 'Buzzed!'}
            {state === 'reveal' && 'Revealed'}
          </Badge>
          {onEndGame && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEndGame}
              disabled={isEndingGame}
              className="text-destructive hover:text-destructive"
            >
              {isEndingGame ? "Ending..." : "End Game"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Round Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Round Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Playing State */}
              {state === 'playing' && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-center py-4">
                      <p className="text-lg font-semibold">Music is playing...</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Waiting for a player to buzz in
                      </p>
                    </AlertDescription>
                  </Alert>
                  {onRevealTrack && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={onRevealTrack}
                      disabled={isRevealing}
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      {isRevealing ? "Stopping..." : "Stop & Reveal Answer"}
                    </Button>
                  )}
                </div>
              )}

              {/* Buzzed State */}
              {state === 'buzzed' && buzzerPlayer && (
                <div className="space-y-4">
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <AlertDescription>
                      <div className="text-center py-2">
                        <p className="text-2xl font-bold text-yellow-900">{buzzerPlayer.name} buzzed!</p>
                        <p className="text-lg text-yellow-700 mt-1">
                          Time: {elapsedSeconds?.toFixed(2)}s
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={onJudgeCorrect}
                      disabled={isJudging}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Correct
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={onJudgeIncorrect}
                      disabled={isJudging}
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Incorrect
                    </Button>
                  </div>
                </div>
              )}

              {/* Reveal State */}
              {state === 'reveal' && (
                <div className="space-y-4">
                  {currentTrack ? (
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Track Revealed</p>
                      <p className="text-2xl font-bold">{currentTrack.title}</p>
                      <p className="text-xl text-muted-foreground">{currentTrack.artist}</p>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription className="text-center py-4">
                        <p className="text-lg font-semibold">Round Complete</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Ready for next round
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={onNextRound}
                    disabled={isAdvancing}
                  >
                    {currentRound >= totalRounds ? "Finish Game" : "Next Round"}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Spotify Playback Controls */}
          {isSpotifyReady && playbackState?.track && (
            <SpotifyPlaybackControls
              playbackState={playbackState}
              onPlayPause={onPlayPause}
              onVolumeChange={onVolumeChange}
              showControls={true}
            />
          )}

          {/* Track Info (when revealed) */}
          {state === 'reveal' && buzzerPlayer && (
            <Card>
              <CardHeader>
                <CardTitle>Round Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">First Buzz</span>
                    <span className="font-semibold">{buzzerPlayer.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold">{elapsedSeconds?.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-semibold">
                      {Math.max(1, Math.round((30 - (elapsedSeconds || 0)) * 10) / 10)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                          index === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : index === 1
                            ? 'bg-slate-300 text-slate-700'
                            : index === 2
                            ? 'bg-orange-300 text-orange-900'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className={`${index === 0 ? 'font-bold' : 'font-medium'}`}>
                        {player.name}
                      </span>
                    </div>
                    <span className={`font-bold ${index === 0 ? 'text-lg' : ''}`}>
                      <AnimatedScore score={player.score ?? 0} />
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
