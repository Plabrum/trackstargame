/**
 * Pack Gallery Component
 *
 * Displays all available music packs in a grid layout.
 * Handles pack selection, viewing songs, and starting games.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackCard } from "./PackCard";
import { PackSongsSheet } from "./PackSongsSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useGetApiPacks } from "@/lib/api/packs/packs";
import { usePostApiSessions } from "@/lib/api/sessions/sessions";
import type { GetApiPacks200Item } from "@/lib/api/model";

export function PackGallery() {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState<GetApiPacks200Item | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [startingPackId, setStartingPackId] = useState<string | null>(null);

  // Fetch all packs with track counts using orval-generated hook
  const { data: packsResponse, isLoading, error } = useGetApiPacks({
    include: 'track_count'
  });

  const packs = packsResponse?.data;

  // Create session mutation using orval-generated hook
  const createSession = usePostApiSessions({
    mutation: {
      onSuccess: (response) => {
        // Check if response is successful (status 200)
        if (response.status === 200) {
          router.push(`/host/${response.data.id}`);
        }
      },
      onError: (error) => {
        console.error('Failed to create session:', error);
        setStartingPackId(null);
      },
    },
  });

  const handleViewSongs = (pack: GetApiPacks200Item) => {
    setSelectedPack(pack);
    setSheetOpen(true);
  };

  const handleStartGame = (packId: string) => {
    setStartingPackId(packId);
    createSession.mutate({ data: { packId } });
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
              Create packs using the Python scripts in the <code className="bg-slate-100 px-1 rounded">scripts/</code> directory.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack) => (
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
