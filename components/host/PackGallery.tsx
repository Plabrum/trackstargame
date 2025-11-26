/**
 * Pack Gallery Component
 *
 * Displays all available music packs in a grid layout.
 * Handles pack selection and session creation.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackGalleryContent } from "./PackGalleryContent";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function PackGallery() {
  const router = useRouter();
  const [startingPackId, setStartingPackId] = useState<string | null>(null);

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
      console.error('Failed to create session:', error);
      toast.error("Failed to create game session", {
        description: "Please try again",
      });
      setStartingPackId(null);
    },
  });

  const handleStartGame = (packId: string) => {
    setStartingPackId(packId);
    createSession.mutate(packId);
  };

  return (
    <PackGalleryContent
      onPackAction={handleStartGame}
      actionLabel="Start Game"
      isProcessing={createSession.isPending}
      processingPackId={startingPackId}
    />
  );
}
