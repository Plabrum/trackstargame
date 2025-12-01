/**
 * Pack Songs Sheet Component
 *
 * Displays all tracks in a pack in a side sheet (50% width).
 * Shows track title and artist for each song.
 */

"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Music } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/types/database";

type Pack = Tables<'packs'>;
type Track = Tables<'tracks'>;

interface PackSongsSheetProps {
  pack: Pack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackSongsSheet({ pack, open, onOpenChange }: PackSongsSheetProps) {
  // Fetch tracks for this pack using join query
  const { data: tracks, isLoading } = useQuery({
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
            artist,
            spotify_id,
            album_name,
            release_year,
            primary_genre,
            genres,
            spotify_popularity,
            isrc
          )
        `)
        .eq('pack_id', pack.id)
        .order('position');

      if (error) throw error;

      // Transform response to extract track data
      return data?.map((pt) => pt.track).filter(Boolean) || [];
    },
    enabled: !!pack?.id && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-1/2 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-orange" />
            {pack?.name || 'Pack Songs'}
          </SheetTitle>
          <SheetDescription>
            {pack?.description || 'View all tracks in this pack'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
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
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-2">
                  {tracks.map((track, index) => (
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
                  ))}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
