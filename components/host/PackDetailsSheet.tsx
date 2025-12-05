/**
 * Pack Details Sheet Component
 *
 * Displays pack information in a side sheet (50% width) with two tabs:
 * 1. Songs - All tracks in the pack
 * 2. Leaderboard - Top 10 high scores for this pack
 */

"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Music, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { Leaderboard } from "@/components/shared/Leaderboard";
import { usePackLeaderboard } from "@/hooks/queries/use-pack-leaderboard";
import { Alert as AlertComponent, AlertDescription } from "@/components/ui/alert";
import type { PackLeaderboardEntry } from "@/lib/db/queries/leaderboards";
import type { Tables } from "@/lib/types/database";

type Pack = Tables<'packs'>;
type Track = Tables<'tracks'>;

interface PackDetailsSheetProps {
  pack: Pack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'songs' | 'leaderboard';
}

export function PackDetailsSheet({
  pack,
  open,
  onOpenChange,
  initialTab = 'songs',
}: PackDetailsSheetProps) {
  // Fetch tracks for this pack using normalized schema
  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['pack_tracks', pack?.id],
    queryFn: async () => {
      if (!pack?.id) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('pack_tracks')
        .select(`
          position,
          track:tracks (
            id,
            title,
            spotify_id,
            album_name,
            release_year,
            spotify_popularity,
            isrc,
            track_artists (
              position,
              artist:artists (
                id,
                name
              )
            )
          )
        `)
        .eq('pack_id', pack.id)
        .order('position');

      if (error) throw error;

      // Transform response to extract track data and compute artist names
      return data?.map((pt) => {
        const track = pt.track;
        if (!track) return null;

        // Compute comma-separated artist names from track_artists
        const artists = track.track_artists
          ?.sort((a, b) => a.position - b.position)
          .map(ta => ta.artist?.name)
          .filter(Boolean)
          .join(', ') || 'Unknown Artist';

        return {
          ...track,
          artist: artists,
        };
      }).filter(Boolean) || [];
    },
    enabled: !!pack?.id && open,
  });

  // Fetch leaderboard data
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = usePackLeaderboard(
    pack?.id || '',
    10
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-1/2 sm:max-w-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-orange" />
            {pack?.name || 'Pack Details'}
          </SheetTitle>
          <SheetDescription>
            {pack?.description || 'View songs and leaderboard for this pack'}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="songs" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Songs
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Songs Tab */}
          <TabsContent value="songs" className="mt-4 space-y-4">
            {isLoadingTracks ? (
              // Loading skeleton
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tracks && tracks.length > 0 ? (
              <>
                {/* Track count badge */}
                <div className="flex items-center justify-between pb-2">
                  <Badge variant="secondary">
                    {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                  </Badge>
                </div>

                {/* Track list */}
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-2">
                    {tracks.map((track, index) => {
                      if (!track) return null;

                      return (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-card/80 transition-colors"
                        >
                          {/* Track number */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/20 text-orange font-semibold text-sm flex-shrink-0">
                            {index + 1}
                          </div>

                          {/* Track info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {track.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {track.artist}
                            </p>
                          </div>

                          {/* Spotify indicator */}
                          {track.spotify_id && (
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                <Music className="h-3 w-3 mr-1 text-green-600" />
                                Spotify
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              // Empty state
              <div className="text-center py-12 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tracks found in this pack</p>
                <p className="text-sm mt-2">
                  Add tracks using the Python scripts
                </p>
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4 space-y-4">
            {isLoadingLeaderboard ? (
              // Loading skeleton
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              // Empty state
              <AlertComponent>
                <Trophy className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">No scores yet!</p>
                    <p className="text-sm">
                      Be the first to complete this pack and set a high score.
                    </p>
                  </div>
                </AlertDescription>
              </AlertComponent>
            ) : (
              // Leaderboard
              <Leaderboard
                players={leaderboard.map((entry: PackLeaderboardEntry) => ({
                  id: entry.playerId,
                  name: entry.playerName,
                  score: entry.score,
                  session_id: entry.sessionId,
                  is_host: false,
                  joined_at: entry.gameDate,
                }))}
                variant="final"
                title="Top 10 All-Time"
                className="border-0"
              />
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
