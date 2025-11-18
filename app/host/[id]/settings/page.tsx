"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useGameSession } from "@/hooks/queries/use-game";
import { GameSettingsForm } from "@/components/host/GameSettingsForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: session, isLoading, error } = useGameSession(id);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || "Game session not found"}
          </AlertDescription>
        </Alert>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-muted-foreground hover:underline"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  // Redirect if game has already started
  if (session.state !== 'lobby') {
    router.push(`/host/${id}`);
    return null;
  }

  return <GameSettingsForm session={session} />;
}
