/**
 * Pack Gallery Component
 *
 * Displays all available music packs in a grid layout.
 * Handles pack selection, viewing songs, and starting games.
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PackCard } from "./PackCard";
import { PackSongsSheet } from "./PackSongsSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type Pack = Database['public']['Tables']['packs']['Row'] & {
  track_count?: number;
};

export function PackGallery() {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [startingPackId, setStartingPackId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all packs with track counts using direct Supabase query
  const { data: packs, isLoading, error } = useQuery({
    queryKey: ['packs', 'with-counts'],
    queryFn: async () => {
      const supabase = createClient();

      const { data: packsData, error: packsError } = await supabase
        .from('packs')
        .select('*')
        .order('created_at', { ascending: false });

      if (packsError) throw packsError;
      if (!packsData) return [];

      // Fetch track counts for each pack
      const packsWithCounts = await Promise.all(
        packsData.map(async (pack) => {
          const { count } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('pack_id', pack.id);

          return { ...pack, track_count: count || 0 };
        })
      );

      return packsWithCounts;
    },
  });

  // Fuzzy search/filter logic
  const filteredPacks = useMemo(() => {
    if (!packs) return [];
    if (!searchQuery.trim()) return packs;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);

    return packs.filter((pack) => {
      const nameMatch = pack.name.toLowerCase();
      const descMatch = pack.description?.toLowerCase() || "";
      const tagsMatch = (pack.tags || []).map(tag => tag.toLowerCase());

      // Check if any search term matches name, description, or tags
      return searchTerms.some((term) => {
        return (
          nameMatch.includes(term) ||
          descMatch.includes(term) ||
          tagsMatch.some(tag => tag.includes(term))
        );
      });
    });
  }, [packs, searchQuery]);

  // Create session mutation using direct API call
  const createSession = useMutation({
    mutationFn: async (packId: string) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      router.push(`/host/${data.id}`);
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to create session:', error);
      }
      setStartingPackId(null);
    },
  });

  const handleViewSongs = (pack: Pack) => {
    setSelectedPack(pack);
    setSheetOpen(true);
  };

  const handleStartGame = (packId: string) => {
    setStartingPackId(packId);
    createSession.mutate(packId);
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load packs. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!packs || packs.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">No music packs available yet.</p>
            <p className="text-sm">
              Create packs using the Python scripts in the <code className="bg-card border border-border px-1 rounded">scripts/</code> directory.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-muted-foreground mt-2">
            Found {filteredPacks.length} pack{filteredPacks.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* No Results State */}
      {filteredPacks.length === 0 && searchQuery && (
        <Alert>
          <AlertDescription>
            No packs found matching &quot;{searchQuery}&quot;. Try a different search term.
          </AlertDescription>
        </Alert>
      )}

      {/* Pack Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPacks.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            trackCount={pack.track_count ?? 0}
            onViewSongs={() => handleViewSongs(pack)}
            onStartGame={() => handleStartGame(pack.id)}
            isStarting={startingPackId === pack.id}
          />
        ))}
      </div>

      {/* Songs Sheet */}
      <PackSongsSheet
        pack={selectedPack}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Error Toast (if mutation fails) */}
      {createSession.isError && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to create game session
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
