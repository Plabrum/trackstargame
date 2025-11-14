/**
 * Host Layout
 *
 * Ensures user is authenticated with Spotify before accessing any host pages.
 * Provides Spotify user data to all child pages via context.
 */

import { redirect } from "next/navigation";
import { getSpotifyUser } from "@/lib/spotify-user";
import { SpotifyUserProvider } from "@/lib/spotify-context";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSpotifyUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/');
  }

  return (
    <SpotifyUserProvider user={user}>
      {children}
    </SpotifyUserProvider>
  );
}
