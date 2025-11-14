"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePacks } from "@/hooks/queries/use-packs";
import { useCreateSession } from "@/hooks/mutations/use-game-mutations";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const { data: packs, isLoading: isLoadingPacks } = usePacks();
  const createSession = useCreateSession();

  // Host game state
  const [hostName, setHostName] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");

  // Join game state
  const [gameCode, setGameCode] = useState("");

  const handleHostGame = async () => {
    if (!hostName.trim() || !selectedPackId) {
      return;
    }

    createSession.mutate(
      { hostName: hostName.trim(), packId: selectedPackId },
      {
        onSuccess: (sessionId) => {
          router.push(`/host/${sessionId}`);
        },
      }
    );
  };

  const handleJoinGame = () => {
    if (!gameCode.trim()) {
      return;
    }
    router.push(`/play/${gameCode.trim()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Trackstar
          </h1>
          <p className="text-xl text-muted-foreground">
            Music Guessing Game - Buzz in and test your knowledge!
          </p>
        </div>

        {/* Main cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Host Game Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Host a Game</CardTitle>
              <CardDescription>
                Create a new game session and invite players
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Host name input */}
              <div className="space-y-2">
                <Label htmlFor="hostName">Your Name</Label>
                <Input
                  id="hostName"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hostName.trim() && selectedPackId) {
                      handleHostGame();
                    }
                  }}
                />
              </div>

              {/* Pack selector */}
              <div className="space-y-2">
                <Label htmlFor="pack">Select Track Pack</Label>
                {isLoadingPacks ? (
                  <Skeleton className="h-10 w-full" />
                ) : packs && packs.length > 0 ? (
                  <Select value={selectedPackId} onValueChange={setSelectedPackId}>
                    <SelectTrigger id="pack">
                      <SelectValue placeholder="Choose a music pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {packs.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.name}
                          {pack.description && ` - ${pack.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No packs available. Please add tracks using the Python scripts.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Error display */}
              {createSession.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createSession.error?.message || "Failed to create session"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Create button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleHostGame}
                disabled={!hostName.trim() || !selectedPackId || createSession.isPending}
              >
                {createSession.isPending ? "Creating..." : "Create Game"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Game Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Join a Game</CardTitle>
              <CardDescription>
                Enter a game code to join an existing session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game code input */}
              <div className="space-y-2">
                <Label htmlFor="gameCode">Game Code</Label>
                <Input
                  id="gameCode"
                  placeholder="Enter 6-character code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && gameCode.trim()) {
                      handleJoinGame();
                    }
                  }}
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={36} // UUID length, but we can use short codes too
                />
              </div>

              <div className="pt-8">
                <Button
                  className="w-full"
                  size="lg"
                  variant="secondary"
                  onClick={handleJoinGame}
                  disabled={!gameCode.trim()}
                >
                  Join Game
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground text-center">
                <p>Ask the host for the game code</p>
                <p className="mt-1">or scan the QR code they provide</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to play */}
        <Card className="bg-slate-50 border">
          <CardHeader>
            <CardTitle className="text-lg">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="font-semibold text-foreground mb-1">1. Create or Join</p>
                <p>Host creates a game and shares the code, or join with a code</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">2. Listen & Buzz</p>
                <p>When you recognize a song, hit the BUZZ button first!</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">3. Score Points</p>
                <p>Faster buzzes = more points. Wrong answers = -10 points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
