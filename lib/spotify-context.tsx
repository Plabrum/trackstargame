/**
 * Spotify User Context
 * Provides authenticated Spotify user data to host pages
 */

'use client';

import { createContext, useContext } from 'react';

export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images?: { url: string }[];
}

const SpotifyUserContext = createContext<SpotifyUser | null>(null);

export function SpotifyUserProvider({
  user,
  children,
}: {
  user: SpotifyUser;
  children: React.ReactNode;
}) {
  return (
    <SpotifyUserContext.Provider value={user}>
      {children}
    </SpotifyUserContext.Provider>
  );
}

export function useSpotifyUser() {
  const context = useContext(SpotifyUserContext);
  if (!context) {
    throw new Error('useSpotifyUser must be used within SpotifyUserProvider');
  }
  return context;
}
