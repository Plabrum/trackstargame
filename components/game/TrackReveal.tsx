"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

interface TrackRevealProps {
  trackTitle: string;
  artistName: string;
  albumArt?: string | null;
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
  answerFeedback,
}: TrackRevealProps) {
  const borderColor = answerFeedback
    ? answerFeedback.isCorrect
      ? "border-green-600 bg-white"
      : "border-red-600 bg-white"
    : "border-orange-600 bg-white";

  const pointsColor = answerFeedback
    ? answerFeedback.isCorrect
      ? "text-green-600"
      : "text-red-600"
    : "text-gray-900";

  return (
    <Alert className={`border-2 ${borderColor}`}>
      <AlertDescription>
        <div className="flex items-center gap-6 py-4">
          {/* Album Art */}
          {albumArt && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
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
          <div className="flex-1 space-y-2">
            <p className="text-2xl font-bold text-gray-950">{artistName}</p>
            <p className="text-lg text-gray-700">{trackTitle}</p>
            {answerFeedback && (
              <p className={`text-xl font-semibold ${pointsColor}`}>
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
