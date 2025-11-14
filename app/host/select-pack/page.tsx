/**
 * Pack Selection Page (/host/select-pack)
 *
 * Displayed after Spotify OAuth. Shows a gallery of available music packs.
 * User can view songs in each pack or start a game immediately.
 */

'use client';

import { PackGallery } from "@/components/host/PackGallery";
import { Button } from "@/components/ui/button";
import { useSpotifyUser } from "@/lib/spotify-context";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SelectPackPage() {
  const user = useSpotifyUser();
  const router = useRouter();

  async function handleLogout() {
    // Call logout API
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const displayName = user.display_name || user.email || 'User';

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
            {/* Account info with logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border shadow-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{displayName}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Pack Gallery */}
        <PackGallery />
      </div>
    </main>
  );
}
