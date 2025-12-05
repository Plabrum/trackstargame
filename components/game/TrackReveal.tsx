"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { SpotifyTrackLink } from "@/components/shared/SpotifyTrackLink";

interface TrackRevealProps {
  trackTitle: string;
  artistName: string;
  albumArt?: string | null;
  spotifyId?: string | null;
  // Optional answer feedback
  answerFeedback?: {
    isCorrect: boolean;
    pointsEarned: number;
  };
}

export function TrackReveal({
  trackTitle,
  artistName,
  albumArt,
  spotifyId,
  answerFeedback,
}: TrackRevealProps) {
  const borderColor = answerFeedback
    ? answerFeedback.isCorrect
      ? "border-green-600 bg-green-50"
      : "border-red-600 bg-red-50"
    : "border-orange-600 bg-white";

  const pointsColor = answerFeedback
    ? answerFeedback.isCorrect
      ? "text-green-700"
      : "text-red-700"
    : "text-gray-900";

  return (
    <Alert className={`w-full border-2 ${borderColor}`}>
      <AlertDescription>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 py-4">
          {/* Album Art */}
          {albumArt && (
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
              <Image
                src={albumArt}
                alt={`${trackTitle} album art`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Track Information */}
          <div className="flex-1 space-y-2 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2">
              {answerFeedback && (
                answerFeedback.isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-green-600 flex-shrink-0 md:mt-1" />
                ) : (
                  <XCircle className="h-6 w-6 md:h-7 md:w-7 text-red-600 flex-shrink-0 md:mt-1" />
                )
              )}
              <div className="flex-1">
                <p className="text-xl md:text-2xl font-bold text-gray-950">{artistName}</p>
                <p className="text-base md:text-lg text-gray-700 flex items-center gap-2">
                  {trackTitle}
                  <SpotifyTrackLink spotifyId={spotifyId} />
                </p>
              </div>
            </div>
            {answerFeedback && (
              <p className={`text-lg md:text-xl font-semibold ${pointsColor}`}>
                {answerFeedback.pointsEarned > 0 ? "+" : ""}
                {answerFeedback.pointsEarned} points
              </p>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
