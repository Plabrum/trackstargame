import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Music } from "lucide-react";
import { redirect } from "next/navigation";
import { getSpotifyAuthUrl } from "@/lib/spotify-auth";
import { randomBytes } from "crypto";
import { AuthErrorToast } from "@/components/auth-error-toast";
import { Suspense } from "react";

export default async function Home() {
  async function handleJoinGame(formData: FormData) {
    "use server";
    const gameCode = formData.get("gameCode") as string;
    if (gameCode?.trim()) {
      redirect(`/play/${gameCode.trim()}`);
    }
  }

  async function handleSpotifyLogin() {
    "use server";
    const state = randomBytes(16).toString('hex');
    const authUrl = getSpotifyAuthUrl(state);
    redirect(authUrl);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Auth error toast */}
      <Suspense>
        <AuthErrorToast />
      </Suspense>

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
                Sign in with Spotify to create and host a game session
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-center space-y-4 py-12">
              <form action={handleSpotifyLogin}>
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Music className="h-5 w-5 mr-2" />
                  Sign in with Spotify
                </Button>
              </form>

              <div className="text-xs text-muted-foreground text-center">
                Requires a premium account for audio playback.
              </div>
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
              <form action={handleJoinGame} className="space-y-4">
                {/* Game code input */}
                <div className="space-y-2">
                  <Label htmlFor="gameCode">Game Code</Label>
                  <Input
                    id="gameCode"
                    name="gameCode"
                    placeholder="Enter 6-character code"
                    className="text-center text-2xl font-mono tracking-widest"
                    maxLength={36}
                    required
                  />
                </div>

                <div className="pt-8">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    variant="secondary"
                  >
                    Join Game
                  </Button>
                </div>
              </form>

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
