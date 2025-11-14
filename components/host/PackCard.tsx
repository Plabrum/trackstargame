/**
 * Pack Card Component
 *
 * Displays a music pack with name, description, and track count.
 * Provides actions to view songs and start a game.
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, ListMusic } from "lucide-react";
import type { Tables } from "@/lib/types/database";

type Pack = Tables<'packs'>;

interface PackCardProps {
  pack: Pack;
  trackCount: number;
  onViewSongs: () => void;
  onStartGame: () => void;
  isStarting?: boolean;
}

export function PackCard({
  pack,
  trackCount,
  onViewSongs,
  onStartGame,
  isStarting = false,
}: PackCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-600" />
              {pack.name}
            </CardTitle>
            {pack.description && (
              <CardDescription className="line-clamp-2">
                {pack.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={onViewSongs}
        >
          <ListMusic className="h-4 w-4 mr-2" />
          View Songs
        </Button>
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          onClick={onStartGame}
          disabled={isStarting || trackCount === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          {isStarting ? "Starting..." : "Start Game"}
        </Button>
        {trackCount === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Need at least 1 track to start a game
          </p>
        )}
      </CardContent>
    </Card>
  );
}
