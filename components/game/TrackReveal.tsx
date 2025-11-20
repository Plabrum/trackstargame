"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
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
      ? "border-green-600 bg-green-50"
      : "border-red-600 bg-red-50"
    : "border-orange-600 bg-white";

  const pointsColor = answerFeedback
    ? answerFeedback.isCorrect
      ? "text-green-700"
      : "text-red-700"
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
            <div className="flex items-start gap-2">
              {answerFeedback && (
                answerFeedback.isCorrect ? (
                  <CheckCircle2 className="h-7 w-7 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="h-7 w-7 text-red-600 flex-shrink-0 mt-1" />
                )
              )}
              <div className="flex-1">
                <p className="text-2xl font-bold text-gray-950">{artistName}</p>
                <p className="text-lg text-gray-700">{trackTitle}</p>
              </div>
            </div>
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
