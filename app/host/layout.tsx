/**
 * Host Layout
 *
 * Ensures user is authenticated with Spotify before accessing any host pages.
 * Redirects to home if not authenticated (with error details).
 * Provides unified Spotify auth context with guaranteed non-null user data.
 */

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/spotify-auth-actions";
import { SpotifyAuthProvider } from "@/lib/spotify-auth-context";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, accessToken, error } = await getAuthenticatedUser();

  // Redirect if not authenticated - provider requires non-null user
  if (!user || !accessToken) {
    console.log('[HostLayout] User not authenticated, redirecting to home', { error });

    // Add error parameter if there was an auth error
    if (error) {
      redirect(`/?error=${error}`);
    }

    redirect('/');
  }

  // User and accessToken are guaranteed to be non-null here
  return (
    <SpotifyAuthProvider user={user} accessToken={accessToken}>
      {children}
    </SpotifyAuthProvider>
  );
}
