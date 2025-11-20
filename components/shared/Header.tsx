/**
 * Header Component
 *
 * Reusable header with logo and optional user info/logout
 */

'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useSpotifyAuth } from "@/lib/spotify-auth-context";

interface HeaderProps {
  title: string;
  showUserInfo?: boolean;
}

export function Header({ title, showUserInfo = false }: HeaderProps) {
  const { user, logout } = useSpotifyAuth();

  async function handleLogout() {
    await logout();
  }

  const displayName = user?.display_name || user?.email || 'User';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Image
          src="/small_logo.svg"
          alt="Trackstar"
          width={48}
          height={48}
          className="w-12 h-12"
        />
        <h1 className="text-4xl font-bold text-white">
          {title}
        </h1>
      </div>

      {showUserInfo && user && (
        <div className="flex items-center gap-3">
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
      )}
    </div>
  );
}
