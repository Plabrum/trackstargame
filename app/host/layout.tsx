/**
 * Host Layout
 *
 * Handles Spotify authentication and provides auth context.
 * Redirects to home if not authenticated.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SpotifyAuthProvider, type SpotifyUser } from '@/lib/spotify-auth-context';

async function getAuthenticatedUser(): Promise<{
  user: SpotifyUser | null;
  accessToken: string | null;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;

  if (!accessToken) {
    return { user: null, accessToken: null };
  }

  try {
    // Fetch user profile from Spotify API
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch Spotify user profile');
      return { user: null, accessToken: null };
    }

    const user = await response.json();
    return { user, accessToken };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { user: null, accessToken: null };
  }
}

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, accessToken } = await getAuthenticatedUser();

  // Redirect to home if not authenticated
  if (!user || !accessToken) {
    redirect('/?error=not_authenticated');
  }

  return (
    <SpotifyAuthProvider user={user} accessToken={accessToken}>
      {children}
    </SpotifyAuthProvider>
  );
}
