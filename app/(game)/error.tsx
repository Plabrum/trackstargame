/**
 * Game Error Boundary
 *
 * Handles errors from game session loading or gameplay.
 */

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Game error:', error);
  }, [error]);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Game Error</h2>
        <p className="text-muted-foreground text-center">
          {error.message || 'Something went wrong loading the game.'}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => reset()} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => router.push('/')}>
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
