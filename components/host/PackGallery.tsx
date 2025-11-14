/**
 * Pack Gallery Component
 *
 * Displays all available music packs in a grid layout.
 * Handles pack selection, viewing songs, and starting games.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PackCard } from "./PackCard";
import { PackSongsSheet } from "./PackSongsSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Tables } from "@/lib/types/database";

type Pack = Tables<'packs'>;

interface PackWithTrackCount extends Pack {
  track_count: number;
}

export function PackGallery() {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [startingPackId, setStartingPackId] = useState<string | null>(null);

  // Fetch all packs with track counts
  const { data: packs, isLoading, error } = useQuery({
    queryKey: ['packs_with_counts'],
    queryFn: async () => {
      const response = await fetch('/api/packs/with-counts');
      if (!response.ok) {
        throw new Error('Failed to fetch packs');
      }
      return response.json() as Promise<PackWithTrackCount[]>;
    },
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (packId: string) => {
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ packId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      const data = await response.json();
      return data.sessionId;
    },
    onSuccess: (sessionId) => {
      // Redirect to host lobby
      router.push(`/host/${sessionId}`);
    },
    onError: (error: Error) => {
      console.error('Failed to create session:', error);
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
            trackCount={pack.track_count}
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
              {createSession.error?.message || 'Failed to create game session'}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
