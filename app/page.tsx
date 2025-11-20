"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthErrorToast } from "@/components/auth-error-toast";
import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSpotifyAuthUrl } from "@/lib/spotify-auth";

export default function Home() {
  const [isJoining, setIsJoining] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const router = useRouter();

  const handleStartGame = () => {
    // Generate state for Spotify OAuth
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const authUrl = getSpotifyAuthUrl(state);
    window.location.href = authUrl;
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.trim()) {
      router.push(`/play/${gameCode.trim()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black">
      {/* Auth error toast */}
      <Suspense>
        <AuthErrorToast />
      </Suspense>

      <div className="w-full max-w-2xl space-y-12">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/logo.svg"
              alt="TrackstarGame Logo"
              width={600}
              height={120}
              priority
              className="w-full max-w-2xl h-auto"
            />
          </div>
        </div>

        {/* Main Action */}
        <div className="space-y-6">
          {!isJoining ? (
            <>
              <div className="flex justify-center">
                <Button
                  onClick={handleStartGame}
                  className="px-12 py-3 text-lg font-bold bg-orange hover:bg-orange/90 text-white rounded-full"
                >
                  Start Game
                </Button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setIsJoining(true)}
                  className="text-sm text-white hover:text-white/70 transition-colors"
                >
                  join game
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleJoinGame} className="space-y-6">
                <Input
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  placeholder="Enter 6-character game code"
                  className="text-center text-xl font-mono tracking-widest h-12 rounded-full"
                  maxLength={36}
                  required
                  autoFocus
                />
              </form>
              <div className="text-center">
                <button
                  onClick={() => setIsJoining(false)}
                  className="text-sm text-white hover:text-white/70 transition-colors"
                >
                  back to start game
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
