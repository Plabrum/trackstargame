/**
 * Pack Gallery Content Component
 *
 * Reusable pack selection UI that can be used in full pages or modals.
 * Displays packs in a grid with search and song preview functionality.
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { PackCard } from "./PackCard";
import { PackSongsSheet } from "./PackSongsSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/lib/types/database";

type Pack = Database['public']['Tables']['packs']['Row'] & {
  track_count?: number;
};

interface PackGalleryContentProps {
  onPackAction: (packId: string) => void;
  actionLabel?: string;
  isProcessing?: boolean;
  processingPackId?: string | null;
}

export function PackGalleryContent({
  onPackAction,
  actionLabel = "Start Game",
  isProcessing = false,
  processingPackId = null,
}: PackGalleryContentProps) {
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const hasShownErrorToast = useRef(false);

  // Fetch packs with track counts
  const { data: packs = [], isLoading, error } = useQuery({
    queryKey: ['packs', 'with-counts'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: packsData, error: packsError } = await supabase
        .from('packs')
        .select('*')
        .order('created_at', { ascending: false });

      if (packsError) throw packsError;
      if (!packsData) return [];

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

  // Error handling
  useEffect(() => {
    if (error && !hasShownErrorToast.current) {
      console.error('Failed to load packs:', error);
      toast.error("Failed to load packs", {
        description: "Please try again",
      });
      hasShownErrorToast.current = true;
    }
  }, [error]);

  // Fuzzy search
  const filteredPacks = useMemo(() => {
    if (!packs) return [];
    if (!searchQuery.trim()) return packs;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    return packs.filter((pack) => {
      const nameMatch = pack.name.toLowerCase();
      const descMatch = pack.description?.toLowerCase() || "";
      const tagsMatch = (pack.tags || []).map(tag => tag.toLowerCase());

      return searchTerms.some((term) => {
        return (
          nameMatch.includes(term) ||
          descMatch.includes(term) ||
          tagsMatch.some(tag => tag.includes(term))
        );
      });
    });
  }, [packs, searchQuery]);

  const handleViewSongs = (pack: Pack) => {
    setSelectedPack(pack);
    setSheetOpen(true);
  };

  // Loading state
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

  // Empty state
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
            placeholder="Search packs..."
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

      {/* No Results */}
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
            onStartGame={() => onPackAction(pack.id)}
            isStarting={isProcessing && processingPackId === pack.id}
            actionLabel={actionLabel}
          />
        ))}
      </div>

      {/* Songs Sheet */}
      <PackSongsSheet
        pack={selectedPack}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
