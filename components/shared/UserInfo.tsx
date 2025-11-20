/**
 * User Info Component
 *
 * Displays user information and logout button (requires Spotify auth context)
 */

'use client';

import { Button } from "@/components/ui/button";
import { User, LogOut, MoreVertical } from "lucide-react";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function UserInfo() {
  const { user, logout } = useSpotifyAuth();

  async function handleLogout() {
    await logout();
  }

  const displayName = user?.display_name || user?.email || 'User';

  if (!user) return null;

  return (
    <>
      {/* Desktop version - show full buttons */}
      <div className="hidden sm:flex items-center gap-3">
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
      </div>

      {/* Mobile version - show popover menu */}
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{displayName}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
