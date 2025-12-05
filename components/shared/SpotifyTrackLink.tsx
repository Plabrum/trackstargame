"use client";

import { useState } from "react";
import { CirclePlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSaveTrackToLibrary } from "@/hooks/mutations/use-spotify-mutations";

interface SpotifyTrackLinkProps {
  spotifyId: string | null | undefined;
  className?: string;
}

export function SpotifyTrackLink({
  spotifyId,
  className,
}: SpotifyTrackLinkProps) {
  const [isSaved, setIsSaved] = useState(false);
  const saveTrack = useSaveTrackToLibrary();

  // Don't render if no Spotify ID
  if (!spotifyId) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSaved || saveTrack.isPending) return;

    try {
      await saveTrack.mutateAsync(spotifyId);
      setIsSaved(true);
      toast.success("Track added to your Liked Songs!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save track";
      toast.error(errorMessage);
    }
  };

  // Render icon based on state
  const Icon = saveTrack.isPending ? Loader2 : isSaved ? Check : CirclePlus;
  const iconColor = isSaved
    ? "text-green-600"
    : "text-gray-400 hover:text-green-600";
  const tooltipText = isSaved
    ? "Added to Liked Songs"
    : saveTrack.isPending
    ? "Saving..."
    : "Add to Liked Songs";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isSaved || saveTrack.isPending}
            className={`inline-flex items-center transition-colors ${iconColor} ${
              saveTrack.isPending ? "cursor-wait" : isSaved ? "cursor-default" : "cursor-pointer"
            } ${className}`}
          >
            <Icon className={`h-5 w-5 ${saveTrack.isPending ? "animate-spin" : ""}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
