/**
 * Round Timer Component
 *
 * Displays elapsed time since the round started
 */

"use client";

import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import { Clock } from "lucide-react";

interface RoundTimerProps {
  startedAt: string | null; // ISO timestamp from round_start_time
  maxSeconds?: number; // Optional max time to display
}

export function RoundTimer({ startedAt, maxSeconds = 30 }: RoundTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }

    // Parse timestamp using luxon
    const startTime = DateTime.fromISO(startedAt);

    // Validate timestamp
    if (!startTime.isValid) {
      console.warn('Invalid timestamp for RoundTimer:', startedAt, startTime.invalidReason);
      setElapsedSeconds(0);
      return;
    }

    // Update timer every 100ms for smooth display
    const interval = setInterval(() => {
      const now = DateTime.now();
      const elapsed = now.diff(startTime, 'seconds').seconds;

      // Ensure elapsed time is never negative
      const validElapsed = Math.max(0, elapsed);

      if (maxSeconds && validElapsed >= maxSeconds) {
        setElapsedSeconds(maxSeconds);
        clearInterval(interval);
      } else {
        setElapsedSeconds(validElapsed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, maxSeconds]);

  // Format as MM:SS.T (minutes:seconds.tenths)
  const formatTime = (seconds: number) => {
    // Ensure non-negative
    const validSeconds = Math.max(0, seconds);
    const mins = Math.floor(validSeconds / 60);
    const secs = Math.floor(validSeconds % 60);
    const tenths = Math.floor((validSeconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-3 bg-orange/10 px-6 py-4 rounded-lg border border-orange/20">
        <Clock className="h-8 w-8 text-orange" />
        <div className="text-5xl font-mono font-bold text-orange">
          {formatTime(elapsedSeconds)}
        </div>
      </div>
    </div>
  );
}
