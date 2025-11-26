/**
 * User Info Components
 *
 * Composable user info elements (requires Spotify auth context)
 */

'use client';

import { Button } from "@/components/ui/button";
import { User, LogOut, XCircle } from "lucide-react";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";

export function UserDisplay() {
  const { user } = useSpotifyAuth();
  const displayName = user?.display_name || user?.email || 'User';

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border shadow-sm">
      <User className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-white">{displayName}</span>
    </div>
  );
}

export function LogoutButton() {
  const { logout } = useSpotifyAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="w-full sm:w-auto"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  );
}

interface EndGameButtonProps {
  onEndGame: () => void;
  isLoading?: boolean;
}

export function EndGameButton({ onEndGame, isLoading }: EndGameButtonProps) {
  return (
    <Button
      onClick={onEndGame}
      variant="destructive"
      size="sm"
      className="w-full sm:w-auto"
      disabled={isLoading}
    >
      <XCircle className="h-4 w-4 mr-2" />
      {isLoading ? 'Ending...' : 'End Game'}
    </Button>
  );
}
