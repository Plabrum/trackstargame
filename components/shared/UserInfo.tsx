/**
 * User Info Component
 *
 * Displays user information and logout button (requires Spotify auth context)
 */

'use client';

import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";

export function UserInfo() {
  const { user, logout } = useSpotifyAuth();

  async function handleLogout() {
    await logout();
  }

  const displayName = user?.display_name || user?.email || 'User';

  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border shadow-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-white">{displayName}</span>
      </div>
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </>
  );
}
