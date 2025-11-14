/**
 * Pack Selection Page (/host/select-pack)
 *
 * Displayed after Spotify OAuth. Shows a gallery of available music packs.
 * User can view songs in each pack or start a game immediately.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import { PackGallery } from "@/components/host/PackGallery";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Music } from "lucide-react";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function SelectPackContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full max-w-6xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Not authenticated
  if (status === 'unauthenticated' || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full max-w-2xl">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be signed in with Spotify to host a game.
              <br />
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="mt-4"
              >
                Back to Home
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  // Authenticated - show pack gallery
  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Select a Music Pack
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Choose a pack to start your game
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </div>

          {/* User info */}
          {session.user?.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music className="h-4 w-4 text-green-600" />
              <span>Signed in as <strong>{session.user.name}</strong></span>
            </div>
          )}
        </div>

        {/* Pack Gallery */}
        <PackGallery />
      </div>
    </main>
  );
}

export default function SelectPackPage() {
  return (
    <SessionProvider>
      <SelectPackContent />
    </SessionProvider>
  );
}
